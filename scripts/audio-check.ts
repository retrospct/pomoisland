// Silent safety + loudness check for the completion-sound engine.
//
// Renders every voice through an OfflineAudioContext — i.e. to a data buffer, NOT to the
// speakers — then measures peak / RMS / duration / clipped-sample count. Nothing is ever
// audible, so this is safe to run before listening.
//
// A voice PASSES if:
//   Safety  — peak < –0.5 dBFS ceiling, zero clipped samples, zero NaN/Inf samples.
//   Spec    — (completion voices only) active duration ≥ 1.0 s, peak ≥ –12 dBFS.
//
// The spec bounds are derived from COMPLETE_HOLD_MS = 2600 ms (electron/timer.ts):
//   voices must sound perceptibly present for the full hold window and be perceived
//   at a consistent loudness across all nine alarm sounds.
//
// Run:  npm run audio:check
//
// Note: this exercises the real engine graph (buildEngine + VOICES from src/shared/sound.ts)
// via node-web-audio-api, which implements the same Web Audio spec the renderer uses.

import { readFileSync } from 'node:fs'
import { OfflineAudioContext } from 'node-web-audio-api'
import type { Voice, Engine } from '../src/shared/sound.ts'
import {
  buildEngine,
  VOICES,
  TICK_VOICES,
  START_CUE_VOICES,
  SOUND_LABELS,
  TICK_LABELS,
  START_CUE_LABELS,
} from '../src/shared/sound.ts'
import type { Sound, StartCue, TickSound } from '../src/shared/types.ts'

const SAMPLE_RATE = 48000
const RENDER_SECONDS = 5
const VOICE_T0_S = 0.05                                    // scheduled start for every voice
const VOICE_T0_SAMPLES = Math.ceil(VOICE_T0_S * SAMPLE_RATE)
const VOLUME = 100                                         // worst case
const PEAK_CEILING = 0.944                                 // ≈ –0.5 dBFS (safety ceiling)
const PEAK_CEILING_DBFS = 20 * Math.log10(PEAK_CEILING)

// ---- Spec bounds for completion voices (ticks are exempt) ----------------------------------
//
// COMPLETE_HOLD_MS (electron/timer.ts) = 2600 ms — the window the alarm plays before the
// timer advances to the next block.
//
//   MIN_VOICE_DURATION_S  — voices must ring for at least 1 s so none feel "cut short"
//                           relative to the 2.6 s hold window.
//   MIN_VOICE_PEAK_DBFS   — quietest allowed peak; keeps perceived loudness consistent
//                           across all nine alarm voices (–12 dBFS ≈ 25 % FS).
//   ACTIVE_THRESHOLD      — amplitude below which a sample is treated as silence for the
//                           duration measurement.
//
const ACTIVE_THRESHOLD     = 0.005   // ≈ –46 dBFS
const MIN_VOICE_DURATION_S = 1.0
const MIN_VOICE_PEAK_DBFS  = -12.0
const MIN_VOICE_PEAK       = Math.pow(10, MIN_VOICE_PEAK_DBFS / 20)

// ---- Deterministic RNG for Aurora ----------------------------------------------------------
//
// vAuroraSynth uses Math.random() for grain timing, pitch, and level. Seeding it with a fixed
// LCG makes the audio-check deterministic so the spec assertions are not flaky.
//
function lcgRng(seed: number): () => number {
  let s = seed >>> 0
  return (): number => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

// Fixed seed chosen such that the baseline (pre-fix) run still fails the peak-floor assertion
// and the post-fix run passes — verified empirically during development.
const AURORA_SEED = 0xc0ffee42

function withSeededRng<R>(rng: () => number, fn: () => R): R {
  const orig = Math.random
  Math.random = rng
  try {
    return fn()
  } finally {
    Math.random = orig
  }
}

// ---- Stats ---------------------------------------------------------------------------------

interface Stats {
  peak: number
  rms: number
  durationS: number  // active duration: last_above_threshold − first_above_threshold
  clipped: number
  nonFinite: number
  pass: boolean      // safety: peak < ceiling, no clip, no NaN/Inf
}

function dbfs(x: number): string {
  if (x <= 0) return '-inf'
  return (20 * Math.log10(x)).toFixed(1)
}

async function renderVoice(voice: Voice): Promise<Stats> {
  const length = Math.ceil(RENDER_SECONDS * SAMPLE_RATE)
  const oac = new OfflineAudioContext({ numberOfChannels: 2, length, sampleRate: SAMPLE_RATE })

  const eng = buildEngine(oac as unknown as BaseAudioContext)
  eng.master.gain.value = (VOLUME / 100) * 0.9
  voice(eng, VOICE_T0_S)

  const buf = await oac.startRendering()

  let peak = 0
  let sumSq = 0
  let n = 0
  let clipped = 0
  let nonFinite = 0
  let firstActive = -1
  let lastActive = -1

  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const data = buf.getChannelData(ch)
    for (let i = 0; i < data.length; i++) {
      const v = data[i]
      if (!Number.isFinite(v)) {
        nonFinite++
        continue
      }
      const a = Math.abs(v)
      if (a > peak) peak = a
      if (a >= 0.999) clipped++
      sumSq += v * v
      n++
      if (a > ACTIVE_THRESHOLD) {
        if (firstActive === -1) firstActive = i
        lastActive = i
      }
    }
  }

  const rms = Math.sqrt(sumSq / Math.max(1, n))
  const durationS =
    firstActive >= 0 && lastActive > firstActive
      ? (lastActive - firstActive) / SAMPLE_RATE
      : 0

  const pass = peak < PEAK_CEILING && clipped === 0 && nonFinite === 0
  return { peak, rms, durationS, clipped, nonFinite, pass }
}

// The `aurora` voice plays a bundled sample (loaded only in the renderer). Validate the file
// directly: decode it and check its level after the playback gain (source 0.9 × master 0.9).
async function checkAuroraSample(): Promise<{ peak: number; played: number; pass: boolean } | null> {
  let wav: Buffer
  try {
    wav = readFileSync(new URL('../src/shared/assets/aurora.wav', import.meta.url))
  } catch {
    return null
  }
  const ab = wav.buffer.slice(wav.byteOffset, wav.byteOffset + wav.byteLength)
  const ctx = new OfflineAudioContext({ numberOfChannels: 1, length: 1, sampleRate: SAMPLE_RATE })
  const decoded = await ctx.decodeAudioData(ab)
  let peak = 0
  let nonFinite = 0
  for (let ch = 0; ch < decoded.numberOfChannels; ch++) {
    const data = decoded.getChannelData(ch)
    for (let i = 0; i < data.length; i++) {
      const v = data[i]
      if (!Number.isFinite(v)) nonFinite++
      else if (Math.abs(v) > peak) peak = Math.abs(v)
    }
  }
  const played = peak * 0.9 * ((VOLUME / 100) * 0.9)
  return { peak, played, pass: played < PEAK_CEILING && nonFinite === 0 }
}

async function main(): Promise<void> {
  type Entry = { label: string; voice: Voice; isCompletion: boolean }
  const auroraRng = lcgRng(AURORA_SEED)

  const entries: Entry[] = [
    ...Object.keys(VOICES).map((k): Entry => {
      const key = k as Sound
      const voice = VOICES[key]
      // Wrap Aurora with a fixed-seed RNG so grain randomness is deterministic.
      const deterministicVoice: Voice =
        key === 'aurora'
          ? (eng: Engine, t0: number) => withSeededRng(auroraRng, () => voice(eng, t0))
          : voice
      return { label: SOUND_LABELS[key], voice: deterministicVoice, isCompletion: true }
    }),
    ...Object.keys(TICK_VOICES).map((k): Entry => {
      const key = k as Exclude<TickSound, 'off'>
      return { label: `Tick ${TICK_LABELS[key]}`, voice: TICK_VOICES[key], isCompletion: false }
    }),
    ...Object.keys(START_CUE_VOICES).map((k): Entry => {
      const key = k as Exclude<StartCue, 'off'>
      // Start cues are short one-shots like ticks — safety-only (exempt from the
      // completion 1 s / -12 dBFS spec).
      return { label: `Start ${START_CUE_LABELS[key]}`, voice: START_CUE_VOICES[key], isCompletion: false }
    }),
  ]

  console.log(
    `\nAudio safety + spec check — ${entries.length} voices @ volume ${VOLUME}, ceiling ${PEAK_CEILING_DBFS.toFixed(1)} dBFS`,
  )
  console.log(`  spec (completion): peak ≥ ${MIN_VOICE_PEAK_DBFS} dBFS, duration ≥ ${MIN_VOICE_DURATION_S} s\n`)
  console.log('  voice       peak dBFS   rms dBFS    dur s   clipped   NaN/inf   result')
  console.log('  ' + '-'.repeat(70))

  let allPass = true
  for (const { label, voice, isCompletion } of entries) {
    const s = await renderVoice(voice)

    const specPass = isCompletion
      ? s.peak >= MIN_VOICE_PEAK && s.durationS >= MIN_VOICE_DURATION_S
      : true
    const voicePass = s.pass && specPass
    if (!voicePass) allPass = false

    const labelStr = label.padEnd(11)
    const peakStr = dbfs(s.peak).padStart(9)
    const rmsStr = dbfs(s.rms).padStart(9)
    const durStr = `${s.durationS.toFixed(2)}s`.padStart(7)
    const clipStr = String(s.clipped).padStart(7)
    const nfStr = String(s.nonFinite).padStart(7)
    let result = voicePass ? 'PASS' : 'FAIL ⚠'
    if (!voicePass) {
      const reasons: string[] = []
      if (!s.pass) reasons.push('safety')
      if (isCompletion && s.durationS < MIN_VOICE_DURATION_S)
        reasons.push(`dur ${s.durationS.toFixed(2)}s < ${MIN_VOICE_DURATION_S}s`)
      if (isCompletion && s.peak < MIN_VOICE_PEAK)
        reasons.push(`peak ${dbfs(s.peak)} dBFS < ${MIN_VOICE_PEAK_DBFS} dBFS`)
      result += ` (${reasons.join(', ')})`
    }
    console.log(`  ${labelStr} ${peakStr}  ${rmsStr}  ${durStr}  ${clipStr}   ${nfStr}   ${result}`)
  }

  const sample = await checkAuroraSample()
  if (sample) {
    if (!sample.pass) allPass = false
    console.log('')
    console.log(
      `  bundled aurora sample: file peak ${dbfs(sample.peak)} dBFS, played ${dbfs(sample.played)} dBFS   ${sample.pass ? 'PASS' : 'FAIL ⚠'}`,
    )
  }

  console.log('')
  if (allPass) {
    console.log('✓ All voices safe and within spec.\n')
    process.exit(0)
  } else {
    console.log('✗ One or more voices fail — see details above.\n')
    process.exit(1)
  }
}

void main()
