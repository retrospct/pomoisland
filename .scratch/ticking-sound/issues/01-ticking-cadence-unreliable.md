# BUG: Ticking sound cadence is unreliable ("wrong speeds"); transition cues pulled

Status: ready-for-human

## Summary

The focus ticking sound (`tick: 'off' | 'soft' | 'crisp'`, played once per second by the
island while focusing) does not keep a clean once-per-second cadence in practice. The owner
reported "double and triple ticks" and later "ticks are all the wrong speeds and stuff … very
bad," persisting after a clean dev-server restart. The follow-on "Transition cues only" feature
(silent focus + last-30s fade-in + start woosh) was **removed** because it sat on top of this
unreliable cadence and made the problem worse/unusable.

This issue tracks fixing the underlying tick *timing* so the basic ticking feels right before
any transition-cue feature is re-attempted.

## Current state (after pulling transition cues)

- Kept: `Off / Soft / Crisp` segmented control, per-second focus ticking, click-to-preview
  (5× burst), dry tick voices.
- Removed: `transitionTick` pref, the "Transition cues only" toggle, the start-cue woosh
  (`vStart` / `playStartCue` / `CUE_VOICES`), and the fade-in / start-cue playback logic.
- The basic ticking cadence bug **remains unverified-as-fixed** and is the real work here.

## Symptoms

- Ticks perceived at irregular / too-fast / wrong speeds rather than a steady 1/sec.
- Earlier: "double and triple ticks" — partly attributed to reverb tails and addressed by
  routing tick voices fully dry (`src/shared/sound.ts`), but the cadence complaint returned.

## What was already tried

- Routed tick voices fully dry (no reverb send) to kill smeared "double" ticks. (Committed.)
- Restarted the dev server clean to rule out ~50 min of accumulated HMR state (hot-swaps of
  `IslandApp.tsx` + `sound.ts` can leave orphaned `setTimeout`/subscriptions firing). Problem
  reportedly persisted, so HMR cruft is likely not the whole story.

## Leading hypothesis (where the next session should look first)

The per-second tick is driven from the **renderer** by a React effect that reacts to every
250ms `TimerState` broadcast and detects a whole-second decrease in `remaining`
(`src/island/IslandApp.tsx`, the `lastTickSecond` effect). This is fragile for audio timing:

- Electron renderer timers/rAF can be throttled when the island window is occluded/background,
  and React 18 auto-batches state updates — so state broadcasts can arrive bunched or be
  coalesced. The effect then fires irregularly (skips seconds or bunches them) → "wrong speeds."
- React 18 **StrictMode** (dev) double-invokes effects on mount and can leave subscription/ref
  state in a surprising spot during HMR.

## Suggested fix directions (pick one, with the owner)

1. **Schedule on the Web Audio clock, not React.** Seed a small look-ahead scheduler from the
   authoritative `remaining`, and schedule tick `AudioBufferSource`/oscillator starts at precise
   `ctx.currentTime + n` offsets. This is the standard "don't use setTimeout/React for audio
   timing" pattern and is robust to renderer throttling.
2. **Drive ticks from the main process.** The `Timer` in `electron/timer.ts` already fires every
   `TICK_MS = 250` and owns the truth; emit a dedicated per-second `tick` IPC event and have the
   renderer just play on receipt (still subject to some IPC jitter, but no detection logic).
3. **Verify single subscription / no StrictMode doubling** before anything else: confirm exactly
   one `timer.onState` listener and one tick per whole second by logging `ctx.currentTime` at each
   `playTick` call in the island renderer; capture a few seconds of timestamps.

## How to reproduce / verify (needs a human — it's audible)

1. `npm run dev` (fresh; avoid long-lived HMR sessions while testing audio).
2. Settings → Preferences → set Ticking sound to Soft (or Crisp).
3. Start a focus block; listen for a steady 1/sec tick. Note any bunching/skipping, and whether
   it worsens when the island window is occluded or in the background.
4. Instrument: log `performance.now()` / `ctx.currentTime` in `playTick` and confirm ~1000ms
   spacing. `npm run audio:check` only proves voice safety, NOT cadence.

## Pointers

- Detection effect: `src/island/IslandApp.tsx` (`lastTickSecond` useEffect).
- Tick voices + `playTick` / `previewTick`: `src/shared/sound.ts`.
- Authoritative timer: `electron/timer.ts` (`TICK_MS`, `tick()`).
- Design rationale + the pulled-feature note: `docs/adr/0005-synthesized-sound-engine.md`.

## Comments

- 2026-06-27 — Filed after the owner asked to drop the "Transition cues only" toggle and
  document the ticking as a known bug. Transition cues should only be re-attempted once the
  base cadence is solid.
