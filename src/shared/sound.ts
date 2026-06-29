// Hand-rolled Web Audio completion-sound engine (ADR-0005). Each "voice" schedules a
// short cue on one shared AudioContext. A synthesized convolution reverb gives the
// cinematic voices a sense of space — no bundled audio assets, no external libraries.
//
// Routing:  voices ──dry──▶ master ──▶ limiter ──▶ destination
//                 └─wet──▶ reverbIn ▶ convolver ▶ wetGain ▶ master ┘
// `master.gain` carries the user's volume; the limiter is a brick-wall safety ceiling so
// no voice (or bug) can ever exceed a safe output level. The graph is built by
// `buildEngine`, which runs on any BaseAudioContext — including an OfflineAudioContext, so
// `scripts/audio-check.ts` can render + measure every voice silently before you ever hear it.

import type { Sound, TickSound } from './types'

export const SOUND_LABELS: Record<Sound, string> = {
  chime: 'Chime',
  bell: 'Bell',
  marimba: 'Marimba',
  digital: 'Digital',
  halcyon: 'Halcyon',
  spice: 'Spice',
  pocket: 'Pocket',
  koto: 'Koto',
  aurora: 'Aurora',
}

export interface Engine {
  ctx: BaseAudioContext
  master: GainNode
  reverbIn: GainNode
}

let engine: Engine | null = null

type AudioCtor = typeof AudioContext

/**
 * Brick-wall-ish soft clipper: linear below `t`, smoothly saturating above it, hard-capped
 * at ~0.93. WaveShaper clamps any input outside [-1,1] to the curve's ends, so even a
 * runaway voice physically cannot blast the output. Transparent for well-behaved signals.
 */
function softClipCurve(t = 0.7): Float32Array<ArrayBuffer> {
  const n = 2048
  const curve = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1
    const a = Math.abs(x)
    const y = a < t ? a : t + (1 - t) * Math.tanh((a - t) / (1 - t))
    curve[i] = Math.sign(x) * y
  }
  return curve
}

/** Build the full output graph on any context (live or offline). */
export function buildEngine(ctx: BaseAudioContext): Engine {
  const master = ctx.createGain()

  const limiter = ctx.createWaveShaper()
  limiter.curve = softClipCurve()
  master.connect(limiter)
  limiter.connect(ctx.destination)

  // Reverb = convolution against a synthesized, exponentially-decaying noise impulse.
  const convolver = ctx.createConvolver()
  convolver.buffer = makeImpulse(ctx, 1.8, 3.5)
  const wet = ctx.createGain()
  wet.gain.value = 0.5
  const reverbIn = ctx.createGain()
  reverbIn.connect(convolver)
  convolver.connect(wet)
  wet.connect(master)

  return { ctx, master, reverbIn }
}

function ensureEngine(): Engine | null {
  if (engine) return engine
  const Ctor: AudioCtor | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext
  if (!Ctor) return null
  engine = buildEngine(new Ctor())
  return engine
}

// ---- buffers ----

function makeImpulse(ctx: BaseAudioContext, seconds: number, decay: number): AudioBuffer {
  const len = Math.max(1, Math.floor(seconds * ctx.sampleRate))
  const buf = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch)
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay)
    }
  }
  return buf
}

function makeNoise(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const len = Math.max(1, Math.floor(seconds * ctx.sampleRate))
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  return buf
}

// ---- primitives ----

// Routing gains created during a playSound() call are registered here so stopSound()
// can fast-fade and disconnect them before the next voice starts.
let activeVoiceGains: GainNode[] = []
let capturingVoice = false

/** Send `node` to the dry (master) bus and/or the wet (reverb) bus. */
function route(eng: Engine, node: AudioNode, dry: number, wet: number): void {
  const { ctx, master, reverbIn } = eng
  if (dry > 0) {
    const g = ctx.createGain()
    g.gain.value = dry
    node.connect(g)
    g.connect(master)
    if (capturingVoice) activeVoiceGains.push(g)
  }
  if (wet > 0) {
    const g = ctx.createGain()
    g.gain.value = wet
    node.connect(g)
    g.connect(reverbIn)
    if (capturingVoice) activeVoiceGains.push(g)
  }
}

/**
 * Fast-fade and disconnect any currently playing alarm voice. Ramps each captured
 * routing gain to near-silence over ~25ms (time-constant 6ms) to avoid clicks/pops,
 * then disconnects after 50ms once inaudible.
 */
export function stopSound(): void {
  const gains = activeVoiceGains
  activeVoiceGains = []
  if (gains.length === 0 || !engine) return
  const now = (engine.ctx as AudioContext).currentTime
  for (const g of gains) {
    try {
      g.gain.setTargetAtTime(0.0001, now, 0.006)
    } catch {
      // ignore
    }
  }
  setTimeout(() => {
    for (const g of gains) {
      try {
        g.disconnect()
      } catch {
        // already disconnected
      }
    }
  }, 50)
}

/** A gain node shaped as attack → exponential decay to silence. */
function envGain(
  ctx: BaseAudioContext,
  t0: number,
  opts: { attack: number; dur: number; peak: number },
): GainNode {
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.linearRampToValueAtTime(opts.peak, t0 + opts.attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur)
  return g
}

/** A single enveloped oscillator note; returns its output gain to be routed. */
function note(
  ctx: BaseAudioContext,
  t0: number,
  type: OscillatorType,
  freq: number,
  dur: number,
  attack: number,
  peak: number,
  detune = 0,
): GainNode {
  const o = ctx.createOscillator()
  o.type = type
  o.frequency.value = freq
  o.detune.value = detune
  const g = envGain(ctx, t0, { attack, dur, peak })
  o.connect(g)
  o.start(t0)
  o.stop(t0 + dur + 0.05)
  return g
}

// ---- voices ----

export type Voice = (eng: Engine, t0: number) => void

/** Glassy FM bell — a rising fifth of two bells whose modulation index decays. */
const vChime: Voice = (eng, t0) => {
  const { ctx } = eng
  const base = 880
  ;[0, 0.16].forEach((off, i) => {
    const f = i ? base * 1.5 : base
    const car = ctx.createOscillator()
    car.type = 'sine'
    car.frequency.value = f
    const mod = ctx.createOscillator()
    mod.type = 'sine'
    mod.frequency.value = f * 2
    const mg = ctx.createGain()
    // Gentler modulation index than the original (was f*2.2) — less metallic clang.
    mg.gain.setValueAtTime(f * 1.3, t0 + off)
    mg.gain.exponentialRampToValueAtTime(1, t0 + off + 0.7)
    mod.connect(mg)
    mg.connect(car.frequency)
    const g = envGain(ctx, t0 + off, { attack: 0.004, dur: 0.9, peak: 0.52 })
    car.connect(g)
    car.start(t0 + off)
    mod.start(t0 + off)
    car.stop(t0 + off + 1)
    mod.stop(t0 + off + 1)
    route(eng, g, 0.9, 0.25)
  })
}

/** Singing-bowl bell — inharmonic sine partials with slight detune for beating. */
const vBell: Voice = (eng, t0) => {
  const { ctx } = eng
  const f = 523.25
  const partials: [ratio: number, peak: number, dur: number][] = [
    [1, 0.5, 2.6],
    [2.76, 0.22, 2.0],
    [5.4, 0.14, 1.4],
    [8.93, 0.07, 1.0],
  ]
  for (const [ratio, peak, dur] of partials) {
    const g = note(ctx, t0, 'sine', f * ratio, dur, 0.003, peak, ratio === 1 ? 0 : 6)
    route(eng, g, 0.8, 0.5)
  }
}

/** Wood mallet — fundamental sine + a bright, short 4th-harmonic attack; two notes. */
const vMarimba: Voice = (eng, t0) => {
  const { ctx } = eng
  const notes = [587.33, 880]
  notes.forEach((f, i) => {
    const at = t0 + i * 0.12
    route(eng, note(ctx, at, 'sine', f, 0.5, 0.002, 0.62), 0.9, 0.12)
    // Brighter, slightly louder mallet attack adds punch without changing the pitch.
    route(eng, note(ctx, at, 'sine', f * 4, 0.18, 0.001, 0.2), 0.9, 0)
  })
}

/** Crisp modern UI — three quick ascending triangle blips with a short attack ping for punch. */
const vDigital: Voice = (eng, t0) => {
  const { ctx } = eng
  ;[880, 1174.66, 1567.98].forEach((f, i) => {
    const at = t0 + i * 0.09
    route(eng, note(ctx, at, 'triangle', f, 0.12, 0.001, 0.62), 1, 0.08)
    // Very short higher-octave transient: adds a snappy "tick" of presence, not harshness.
    route(eng, note(ctx, at, 'triangle', f * 2, 0.035, 0.0005, 0.12), 0.8, 0)
  })
}

/** Blade Runner CS-80 pad — detuned-saw unison, slow filter sweep, vibrato, long tail. */
const vHalcyon: Voice = (eng, t0) => {
  const { ctx } = eng
  const chord = [220, 277.18, 329.63, 440]
  const dur = 2.4

  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.setValueAtTime(300, t0)
  // Sweep tops out lower (was 2200) and Q is gentle (was 6) — no shrill resonant peak.
  lp.frequency.linearRampToValueAtTime(1500, t0 + 1.2)
  lp.Q.value = 1.2

  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.linearRampToValueAtTime(0.46, t0 + 0.5)
  g.gain.linearRampToValueAtTime(0.4, t0 + dur * 0.6)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  lp.connect(g)

  const lfo = ctx.createOscillator()
  lfo.type = 'sine'
  lfo.frequency.value = 5.2
  const lfoAmt = ctx.createGain()
  lfoAmt.gain.value = 5
  lfo.connect(lfoAmt)
  lfo.start(t0)
  lfo.stop(t0 + dur + 0.1)

  for (const f of chord) {
    for (const det of [-8, 8]) {
      const o = ctx.createOscillator()
      o.type = 'sawtooth'
      o.frequency.value = f
      o.detune.value = det
      lfoAmt.connect(o.detune)
      // Per-oscillator headroom: 8 saws × 0.2 ≈ 1.6 pre-filter, tamed by the lowpass + env.
      const og = ctx.createGain()
      og.gain.value = 0.2
      o.connect(og)
      og.connect(lp)
      o.start(t0)
      o.stop(t0 + dur + 0.1)
    }
  }
  route(eng, g, 0.7, 0.7)
}

/** Dune — deep sub + low brass stack through a lowpass, breathy noise swell, distant ping. */
const vSpice: Voice = (eng, t0) => {
  const { ctx } = eng
  const dur = 2.6

  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.setValueAtTime(180, t0)
  lp.frequency.linearRampToValueAtTime(900, t0 + 0.9)
  lp.frequency.linearRampToValueAtTime(400, t0 + dur)

  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.linearRampToValueAtTime(0.45, t0 + 0.4)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  lp.connect(g)
  ;[55, 82.41, 110].forEach((f, i) => {
    const o = ctx.createOscillator()
    o.type = i === 0 ? 'sine' : 'sawtooth'
    o.frequency.value = f
    const og = ctx.createGain()
    og.gain.value = 0.5
    o.connect(og)
    og.connect(lp)
    o.start(t0)
    o.stop(t0 + dur + 0.1)
  })

  const noise = ctx.createBufferSource()
  noise.buffer = makeNoise(ctx, dur)
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 1400
  bp.Q.value = 0.8
  const ng = ctx.createGain()
  ng.gain.setValueAtTime(0.0001, t0)
  ng.gain.linearRampToValueAtTime(0.06, t0 + 0.8)
  ng.gain.exponentialRampToValueAtTime(0.0001, t0 + dur * 0.9)
  noise.connect(bp)
  bp.connect(ng)
  noise.start(t0)
  noise.stop(t0 + dur)

  const ping = ctx.createOscillator()
  ping.type = 'sine'
  ping.frequency.value = 1244.51
  const pmod = ctx.createOscillator()
  pmod.type = 'sine'
  pmod.frequency.value = 1244.51 * 3.1
  const pmg = ctx.createGain()
  pmg.gain.setValueAtTime(1000, t0 + 0.5)
  pmg.gain.exponentialRampToValueAtTime(1, t0 + 1.6)
  pmod.connect(pmg)
  pmg.connect(ping.frequency)
  const pg = envGain(ctx, t0 + 0.5, { attack: 0.005, dur: 1.6, peak: 0.1 })
  ping.connect(pg)
  ping.start(t0 + 0.5)
  pmod.start(t0 + 0.5)
  ping.stop(t0 + 2.2)
  pmod.stop(t0 + 2.2)

  route(eng, g, 0.9, 0.5)
  route(eng, ng, 0.7, 0.6)
  route(eng, pg, 0.6, 0.9)
}

/** Pocket-synth arcade — a snappy arpeggio, squares tamed by a shared lowpass tone control. */
const vPocket: Voice = (eng, t0) => {
  const { ctx } = eng
  // End on 880 (was a piercing 1046.5) and roll off the buzzy square harmonics.
  const seq = [523.25, 659.25, 783.99, 880]
  const tone = ctx.createBiquadFilter()
  tone.type = 'lowpass'
  tone.frequency.value = 2400
  tone.Q.value = 0.7
  route(eng, tone, 0.9, 0.14)
  seq.forEach((f, i) => {
    const at = t0 + i * 0.085
    const o = ctx.createOscillator()
    o.type = 'square'
    o.frequency.value = f
    const g = envGain(ctx, at, { attack: 0.002, dur: 0.11, peak: 0.42 })
    o.connect(g)
    g.connect(tone)
    o.start(at)
    o.stop(at + 0.14)
  })
}

/**
 * ASMR pluck — a damped harmonic pluck. The original used a Karplus–Strong DelayNode
 * feedback loop, but Web Audio clamps feedback delays to one render quantum (~2.67 ms),
 * which is *longer* than the 2.27 ms period of A4 — the loop went unstable and emitted
 * NaN (caught by `npm run audio:check`). This builds the pluck additively instead: a short
 * filtered-noise transient for the "touch", plus a fundamental and two harmonics whose
 * higher partials decay faster — stable, warm, no feedback.
 */
const vKoto: Voice = (eng, t0) => {
  const { ctx } = eng
  const notes = [329.63, 440] // E4, A4 — warm register, nothing piercing
  notes.forEach((f, i) => {
    const at = t0 + i * 0.2

    // Pluck transient: a brief band-passed noise click around the 3rd harmonic.
    const src = ctx.createBufferSource()
    src.buffer = makeNoise(ctx, 0.02)
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = f * 3
    bp.Q.value = 4
    const ng = envGain(ctx, at, { attack: 0.001, dur: 0.08, peak: 0.12 })
    src.connect(bp)
    bp.connect(ng)
    src.start(at)
    src.stop(at + 0.05)
    route(eng, ng, 0.7, 0.3)

    // Harmonic body: higher partials are quieter and decay faster, like a real string.
    const harmonics: [mult: number, peak: number, dur: number][] = [
      [1, 0.34, 1.4],
      [2, 0.12, 0.7],
      [3, 0.06, 0.4],
    ]
    for (const [mult, peak, dur] of harmonics) {
      route(eng, note(ctx, at, 'sine', f * mult, dur, 0.002, peak), 0.85, 0.4)
    }
  })
}

/**
 * Granular ambient bloom — Hologram Microcosm-inspired. A short cloud of pitched grains
 * (randomized timing, micro-detune, stereo position) drenched in reverb dissolves into a
 * soft pad underneath, so the "glitches mush together into a beautiful ambient pad." All
 * grain levels are low and the master limiter backstops any random alignment spike.
 */
const vAuroraSynth: Voice = (eng, t0) => {
  const { ctx } = eng
  // Pitches lifted from the source video's pad, which FFT analysis revealed to be an
  // Fmaj7 drone (F–A–C–E — it spells "FACE"). Grains arpeggiate those chord tones.
  const scale = [349.23, 440, 523.25, 659.25, 698.46, 880, 1046.5]
  const grains = 22
  const spread = 1.1
  for (let i = 0; i < grains; i++) {
    const at = t0 + Math.random() * spread
    const f = scale[Math.floor(Math.random() * scale.length)]
    const o = ctx.createOscillator()
    o.type = Math.random() < 0.5 ? 'sine' : 'triangle'
    o.frequency.value = f
    o.detune.value = (Math.random() * 2 - 1) * 14
    const dur = 0.08 + Math.random() * 0.12
    const g = envGain(ctx, at, { attack: 0.01, dur, peak: 0.18 + Math.random() * 0.16 })
    o.connect(g)
    o.start(at)
    o.stop(at + dur + 0.05)
    const pan = ctx.createStereoPanner()
    pan.pan.value = Math.random() * 2 - 1
    g.connect(pan)
    // Mostly wet: the grains live in the reverb, with a touch of dry presence.
    route(eng, pan, 0.25, 0.85)
  }

  // The pad the grains settle into: a soft low Fmaj7 voicing (F3 A3 C4 E4) that swells in.
  const padDur = 2.8
  const chord = [174.61, 220, 261.63, 329.63]
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.setValueAtTime(500, t0)
  lp.frequency.linearRampToValueAtTime(1200, t0 + 1.4)
  lp.Q.value = 0.7
  const pg = ctx.createGain()
  pg.gain.setValueAtTime(0.0001, t0)
  pg.gain.linearRampToValueAtTime(0.3, t0 + 1.0)
  pg.gain.linearRampToValueAtTime(0.24, t0 + padDur * 0.6)
  pg.gain.exponentialRampToValueAtTime(0.0001, t0 + padDur)
  lp.connect(pg)
  for (const f of chord) {
    for (const det of [-6, 6]) {
      const o = ctx.createOscillator()
      o.type = 'triangle'
      o.frequency.value = f
      o.detune.value = det
      const og = ctx.createGain()
      og.gain.value = 0.2
      o.connect(og)
      og.connect(lp)
      o.start(t0)
      o.stop(t0 + padDur + 0.1)
    }
  }
  route(eng, pg, 0.6, 0.8)
}

// `aurora` plays an actual sampled clip (a ~3.5s ambient passage lifted from the Hologram
// Microcosm demo, normalized to -3 dBFS — see scripts and ADR-0005). The buffer is loaded
// lazily by the renderer via `loadAuroraSample`; until it's ready (or if decode fails) we fall
// back to the synthesized bloom so the voice always makes sound. Playback still routes through
// master → limiter, so the safety ceiling applies to the sample too.
let auroraBuffer: AudioBuffer | null = null
let auroraLoading: Promise<void> | null = null

export function loadAuroraSample(url: string): Promise<void> {
  if (auroraBuffer) return Promise.resolve()
  if (auroraLoading) return auroraLoading
  auroraLoading = (async () => {
    try {
      const eng = ensureEngine()
      if (!eng) return
      const data = await (await fetch(url)).arrayBuffer()
      auroraBuffer = await eng.ctx.decodeAudioData(data)
    } catch {
      auroraBuffer = null // fall back to the synth voice
    }
  })()
  return auroraLoading
}

const vAurora: Voice = (eng, t0) => {
  if (!auroraBuffer) {
    vAuroraSynth(eng, t0)
    return
  }
  const { ctx } = eng
  const src = ctx.createBufferSource()
  src.buffer = auroraBuffer
  const g = ctx.createGain()
  g.gain.value = 0.9
  src.connect(g)
  src.start(t0)
  route(eng, g, 1.0, 0.06)
}

export const VOICES: Record<Sound, Voice> = {
  chime: vChime,
  bell: vBell,
  marimba: vMarimba,
  digital: vDigital,
  halcyon: vHalcyon,
  spice: vSpice,
  pocket: vPocket,
  koto: vKoto,
  aurora: vAurora,
}

/** Play a completion cue. `volume` is 0–100; <= 0 is silent. Best-effort.
 *  Stops any currently playing alarm voice first (fast ~25ms fade) so rapid
 *  chip clicks never stack multiple voices on top of each other. */
export function playSound(key: Sound, volume: number): void {
  if (volume <= 0) return
  stopSound()
  try {
    const eng = ensureEngine()
    if (!eng) return
    const ctx = eng.ctx as AudioContext
    if (ctx.state === 'suspended') void ctx.resume()
    eng.master.gain.setValueAtTime((Math.min(100, Math.max(0, volume)) / 100) * 0.9, ctx.currentTime)
    const voice = VOICES[key] ?? VOICES.chime
    capturingVoice = true
    voice(eng, ctx.currentTime + 0.03)
    capturingVoice = false
  } catch {
    capturingVoice = false
    // Audio is best-effort (e.g. before any user gesture); ignore failures.
  }
}

// ---- tick voices ----
//
// Per-second focus ticks (ADR-0005). Deliberately QUIET and very short so a click
// every second is felt, not fatiguing — peaks sit well under the roster's loudness
// band and route through the same master → limiter as every other voice.

type TickStyle = Exclude<TickSound, 'off'>

// Ticks route FULLY DRY (wet = 0). They fire ~1s apart (live) / 600ms (preview), but the
// shared reverb impulse is ~1.8s — any wet send rings into the *next* tick and is heard as a
// smeared "double/triple" tick. Keeping them dry makes each tick a single clean transient.
/** Soft tick — a low woodblock "tock": a short sine thunk plus a faint band-passed click. */
const vTickSoft: Voice = (eng, t0) => {
  const { ctx } = eng
  route(eng, note(ctx, t0, 'sine', 200, 0.07, 0.001, 0.16), 0.9, 0)
  route(eng, note(ctx, t0, 'sine', 400, 0.03, 0.0008, 0.05), 0.7, 0)
  const src = ctx.createBufferSource()
  src.buffer = makeNoise(ctx, 0.01)
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 1200
  bp.Q.value = 1.5
  const ng = envGain(ctx, t0, { attack: 0.0005, dur: 0.02, peak: 0.05 })
  src.connect(bp)
  bp.connect(ng)
  src.start(t0)
  src.stop(t0 + 0.02)
  route(eng, ng, 0.6, 0)
}

/** Crisp tick — a brighter, sharper click: a brief high triangle blip + a high-passed transient. */
const vTickCrisp: Voice = (eng, t0) => {
  const { ctx } = eng
  route(eng, note(ctx, t0, 'triangle', 1000, 0.025, 0.0004, 0.14), 0.9, 0)
  const src = ctx.createBufferSource()
  src.buffer = makeNoise(ctx, 0.008)
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 2500
  const ng = envGain(ctx, t0, { attack: 0.0003, dur: 0.012, peak: 0.08 })
  src.connect(hp)
  hp.connect(ng)
  src.start(t0)
  src.stop(t0 + 0.012)
  route(eng, ng, 0.7, 0)
}

export const TICK_VOICES: Record<TickStyle, Voice> = {
  soft: vTickSoft,
  crisp: vTickCrisp,
}

export const TICK_LABELS: Record<TickSound, string> = {
  off: 'Off',
  soft: 'Soft',
  crisp: 'Crisp',
}

/** Play one focus tick. `style` `'off'` (or `volume <= 0`) is silent. Best-effort. */
export function playTick(style: TickSound, volume: number): void {
  if (style === 'off' || volume <= 0) return
  try {
    const eng = ensureEngine()
    if (!eng) return
    const ctx = eng.ctx as AudioContext
    if (ctx.state === 'suspended') void ctx.resume()
    eng.master.gain.setValueAtTime((Math.min(100, Math.max(0, volume)) / 100) * 0.9, ctx.currentTime)
    TICK_VOICES[style](eng, ctx.currentTime + 0.01)
  } catch {
    // Audio is best-effort (e.g. before any user gesture); ignore failures.
  }
}

// A tick preview is a short repeating burst (Settings auditions the style on select). Each
// tick is only ~20–70ms, so the overlap hazard is the *queued* future ticks — cancel those
// before starting a new burst so rapid toggling never stacks two styles on top of each other.
let tickPreviewTimers: ReturnType<typeof setTimeout>[] = []

/** Cancel any in-progress tick preview burst. */
export function stopTickPreview(): void {
  for (const t of tickPreviewTimers) clearTimeout(t)
  tickPreviewTimers = []
}

/**
 * Preview a tick style by playing it `count` times at `gapMs` spacing. Always stops any
 * prior preview first, so toggling between styles never overlaps. `'off'` just stops.
 */
export function previewTick(style: TickSound, volume: number, count = 5, gapMs = 600): void {
  stopTickPreview()
  if (style === 'off' || volume <= 0) return
  for (let i = 0; i < count; i++) {
    tickPreviewTimers.push(setTimeout(() => playTick(style, volume), i * gapMs))
  }
}
