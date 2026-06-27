# ADR-0005: Synthesized Web-Audio completion-sound engine

Status: Accepted
Date: 2026-06-26

## Context

The Settings "Alarm & sound" picker offered `chime/bell/marimba/digital/custom`, but only a
single hard-coded two-note Web-Audio chime ever played — every selection sounded identical, a
"lying UI" (the picker implied choice it didn't deliver). The owner wanted the sounds to be a
deliberately *fun*, learning-oriented part of the app: characterful cues with a cinematic
sci-fi / pocket-synth aesthetic (Blade Runner 2049, Dune, Teenage-Engineering-style pocket
synths), and was open to libraries.

## Decision

Build a small, **hand-rolled Web-Audio engine** in `src/shared/sound.ts` — a **hybrid**
stance: synthesize everything from primitives now, and only reach for a library (e.g. Tone.js)
later if we want effects we can't comfortably hand-roll.

- The graph is built by `buildEngine(ctx)`, which runs on **any** `BaseAudioContext` — the live
  `AudioContext` at runtime, or an `OfflineAudioContext` for silent validation (see below).
- One lazily-created, shared `AudioContext`; a `master` gain carries the user's volume, feeding a
  **brick-wall soft-clip limiter** (`WaveShaperNode`, tanh curve) before `destination` so no voice
  — or bug — can exceed a safe output ceiling (~−0.6 dBFS).
- A **synthesized convolution reverb** (an exponentially-decaying noise impulse → `ConvolverNode`)
  gives the cinematic voices space — **no runtime dependencies**. Every voice is pure synthesis
  except `aurora`, whose one bundled audio asset is described below.
- Each **voice** is a function that schedules a short (~1.2–2.8s) cue and routes its output
  dry (→ master) and/or wet (→ reverb). Voices are registered per `Sound` key.
- The `Sound` union in `src/shared/types.ts` stays the single source of truth. Roster:
  `chime` (FM bell), `bell` (inharmonic partials), `marimba` (additive mallet),
  `digital` (triangle blips), `halcyon` (CS-80 detuned-saw pad), `spice` (sub + brass + breath),
  `pocket` (filtered-square arpeggio), `koto` (additive damped pluck),
  `aurora` (a **sampled** ~3.5s ambient clip — see below).
- **`aurora` is sampled, not synthesized.** It plays a real ambient passage lifted from a
  Hologram Microcosm pedal demo, trimmed/faded and normalized to −3 dBFS, bundled at
  `src/shared/assets/aurora.wav` (referenced via `new URL('…/aurora.wav', import.meta.url)`),
  loaded lazily per renderer (`loadAuroraSample`) and decoded into an `AudioBuffer` played
  through master → limiter like any voice. If the sample isn't loaded or fails to decode, it
  **falls back to a synthesized granular bloom** (`vAuroraSynth`) whose grain/pad pitches were
  FFT-derived from that same clip — they turned out to be an Fmaj7 / "FACE" drone.
- `custom` (user-supplied sound file) was **dropped** from the union for now; a file-import
  follow-up can reintroduce it.
- Settings **previews on select** (clicking a sound plays it), so the picker is honest and
  auditionable; the island plays `prefs.sound` on completion.

## Safety and validation

The first roster shipped with voices that were painfully harsh — loud enough that the owner
worried about their ears and hardware. Root causes, all in `sound.ts`:

- **`koto`** used a Karplus–Strong `DelayNode` feedback loop, but Web Audio clamps feedback
  delays to one render quantum (~2.67 ms) — *longer* than A4's 2.27 ms period. The loop went
  unstable and emitted **NaN at near-full-scale**. Rebuilt as a stable additive damped pluck.
- **`halcyon`** summed 8 detuned saws with no headroom into a resonant (Q=6) filter → clipping
  and shrillness. Now per-oscillator gain-staged with a gentle filter.
- **`pocket`** was raw square waves to ~1 kHz → buzzy/piercing. Now lowpass-tamed.

Two durable safeguards came out of this:

1. **Runtime guarantee** — the master soft-clip limiter (above) makes blasting physically
   impossible regardless of voice content.
2. **Silent offline validator** — `npm run audio:check` (`scripts/audio-check.ts`) renders every
   voice through an `OfflineAudioContext` (to a buffer, **never the speakers**) and measures
   peak / RMS / clipped-sample count / non-finite-sample count, failing CI-style if any voice
   approaches full scale, clips, or produces NaN/∞ at max volume. This catches hazards (and the
   NaN class specifically) *before* anyone listens. It uses **`node-web-audio-api`** as a
   **devDependency only** (a Node implementation of the same Web Audio spec) — not shipped in the
   app, consistent with the "no runtime dependencies" stance.

Workflow: run `npm run audio:check` first; only then audition (low volume, speakers before
in-ears). The offline numbers are strong evidence, not a bit-exact promise vs Chromium — the
limiter is the real runtime guarantee.

## Alternatives considered

- **Bundle recorded audio files per voice.** Heavier (assets, packaging, licensing) and less
  educational; revisit if synthesis can't achieve a desired timbre.
- **Adopt Tone.js up front.** Faster and richer, but hides the primitives the owner wants to
  learn; kept as a future option per the hybrid stance.
- **Keep one chime; reduce the picker to on/off.** Rejected — the owner explicitly wanted
  variety and the synthesis as a feature.

## Consequences

- Distinct, asset-free voices that scale with `volume` (dry + reverb tail together).
- Audio is best-effort and renderer-only; it must not be imported by the CJS main process
  (the Node tsconfig only compiles `electron/`, so `sound.ts` gets DOM libs from the app config).
- Tuning timbres/lengths is iterative and auditory — expect to revise voices after listening.
  This is distinct from the deferred *visual* animation-tuning pass.
- Voices may be safely added/retuned without listening first: `npm run audio:check` proves they
  can't blast or emit NaN. New voices should keep peak under the ceiling and roughly within the
  roster's loudness band (~−4 to −15 dBFS peak; ambient voices like `aurora` sit at the soft end).
- `node-web-audio-api` is a dev-only dependency; the shipped renderer still pulls in no audio libs.
- **Licensing caveat:** the `aurora` clip is derived from third-party video audio (a YouTube
  Microcosm demo). Fine for local/dev use, but **resolve licensing before packaging or
  distribution** — replace it with an original/licensed recording, or ship the synth fallback.
  The fallback means the app still has a working `aurora` voice even with the asset removed.
- Reintroducing `custom` is a localized union + UI + file-IO change, not a redesign.
