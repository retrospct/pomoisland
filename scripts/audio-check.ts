// Silent safety + loudness check for the completion-sound engine.
//
// Renders every voice through an OfflineAudioContext — i.e. to a data buffer, NOT to the
// speakers — then measures peak / RMS / clipped-sample count. Nothing is ever audible, so
// this is safe to run before listening. A voice PASSES if it never approaches full scale
// (peak < -0.5 dBFS) and clips zero samples, at maximum volume (100).
//
// Run:  npm run audio:check
//
// Note: this exercises the real engine graph (buildEngine + VOICES from src/shared/sound.ts)
// via node-web-audio-api, which implements the same Web Audio spec the renderer uses. The
// brick-wall limiter in buildEngine is the runtime guarantee; this check is the proof.

import { readFileSync } from 'node:fs'
import { OfflineAudioContext } from 'node-web-audio-api'
import type { Voice } from '../src/shared/sound.ts'
import { buildEngine, VOICES, TICK_VOICES, SOUND_LABELS, TICK_LABELS } from '../src/shared/sound.ts'

const SAMPLE_RATE = 48000
const RENDER_SECONDS = 5
const VOLUME = 100 // worst case
const PEAK_CEILING = 0.944 // ≈ -0.5 dBFS
const PEAK_CEILING_DBFS = 20 * Math.log10(PEAK_CEILING)

interface Stats {
  peak: number
  rms: number
  clipped: number
  nonFinite: number
  pass: boolean
}

function dbfs(x: number): string {
  if (x <= 0) return '-inf'
  return (20 * Math.log10(x)).toFixed(1)
}

async function renderVoice(voice: Voice): Promise<Stats> {
  const length = Math.ceil(RENDER_SECONDS * SAMPLE_RATE)
  const oac = new OfflineAudioContext({ numberOfChannels: 2, length, sampleRate: SAMPLE_RATE })

  // Build the exact runtime graph (master → limiter → destination, plus reverb).
  const eng = buildEngine(oac as unknown as BaseAudioContext)
  eng.master.gain.value = (VOLUME / 100) * 0.9
  voice(eng, 0.05)

  const buf = await oac.startRendering()
  let peak = 0
  let sumSq = 0
  let n = 0
  let clipped = 0
  let nonFinite = 0
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
    }
  }
  const rms = Math.sqrt(sumSq / Math.max(1, n))
  // NaN/∞ samples are an automatic failure: they slip past peak/clip tests but are audible garbage.
  const pass = peak < PEAK_CEILING && clipped === 0 && nonFinite === 0
  return { peak, rms, clipped, nonFinite, pass }
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
  // Completion voices plus the per-second focus ticks — both run through the same graph.
  const entries: { label: string; voice: Voice }[] = [
    ...Object.keys(VOICES).map((k) => ({
      label: SOUND_LABELS[k as keyof typeof VOICES],
      voice: VOICES[k as keyof typeof VOICES],
    })),
    ...Object.keys(TICK_VOICES).map((k) => ({
      label: `Tick ${TICK_LABELS[k as keyof typeof TICK_VOICES]}`,
      voice: TICK_VOICES[k as keyof typeof TICK_VOICES],
    })),
  ]
  console.log(`\nAudio safety check — ${entries.length} voices @ volume ${VOLUME}, ceiling ${PEAK_CEILING_DBFS.toFixed(1)} dBFS\n`)
  console.log('  voice      peak dBFS   rms dBFS   clipped   NaN/inf   result')
  console.log('  ' + '-'.repeat(64))

  let allPass = true
  for (const { label: name, voice } of entries) {
    const s = await renderVoice(voice)
    if (!s.pass) allPass = false
    const label = name.padEnd(10)
    const peakStr = dbfs(s.peak).padStart(9)
    const rmsStr = dbfs(s.rms).padStart(9)
    const clipStr = String(s.clipped).padStart(7)
    const nfStr = String(s.nonFinite).padStart(7)
    const result = s.pass ? 'PASS' : 'FAIL ⚠'
    console.log(`  ${label} ${peakStr}  ${rmsStr}  ${clipStr}   ${nfStr}   ${result}`)
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
    console.log('✓ All voices safe: no clipping, headroom under the ceiling at max volume.\n')
    process.exit(0)
  } else {
    console.log('✗ One or more voices exceed the safety ceiling — do not audition until fixed.\n')
    process.exit(1)
  }
}

void main()
