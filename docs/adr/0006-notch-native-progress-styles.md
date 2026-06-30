# ADR-0006: Notch-native progress styles (Timer style A–H)

Status: Accepted
Date: 2026-06-29

## Context

`Prefs.timerStyle` was `circular | outline | bar` with a three-icon Settings picker, but it
was a **"lying UI"**: the island always drew the circular `Ring` regardless of the choice —
`outline` and `bar` were never implemented. Meanwhile the MO-23 prototype
(`src/prototype/NotchProgressPrototype.tsx`, variants A–D) explored what progress should look
like drawn *around the notch* rather than inside a pill.

A design handoff (`Dynamic Island Pomodoro Timer-notch-animations`, README + `NotchConcept.dc.html`)
matured that exploration into **eight notch-native treatments (A–H)**. The core constraint: the
MacBook camera notch is opaque hardware, so progress must sit **below** the notch or trace its
**outline** — never draw over the camera housing.

## Decision

**Replace `timerStyle` entirely** with the eight handoff variants, render them live in both the
island and Settings, and have the outline treatments hug the **real** notch geometry.

- `TimerStyle` (in `src/shared/types.ts`, the single source of truth) becomes:
  `below | outline | glow | front | underlight | converge | split | comet`.
  - `below` (A) — pill below the notch (ring + time + session dots).
  - `outline` (B) — the notch outline fills left→right as a progress bar.
  - `glow` (C) — `outline` plus a blurred breathing glow layer.
  - `front` (D) — `outline` plus a pulsing leading-edge dot at the current progress point
    (positioned via `SVGPathElement.getPointAtLength`).
  - `underlight` (E) — diffuse light from beneath the notch; **does not encode progress**.
  - `converge` (F) — two half-paths fill inward to the bottom-center, with a meet dot.
  - `split` (G) — grows from center-bottom outward to both top edges.
  - `comet` (H) — two sparks orbit the outline continuously; **does not encode progress**.
- **One shared component** `src/shared/NotchProgress.tsx` (a faithful port of
  `NotchConcept.dc.html`, 260×72 notch viewport) renders every variant. Both the island
  collapsed view and the Settings live previews use it, so the picked swatch matches exactly
  what renders on the notch — mirroring the `ripple.ts → CompletionFx / RipplePreview` pattern.
- Keyframes live in `src/shared/notch.css`, imported by both renderers. Progress strokes use
  `stroke-dashoffset` transitions (0.35s linear, from MO-23 prototype). Keyframe-driven layers
  are gated by `@media (prefers-reduced-motion: reduce)` via `[data-nc-anim]`.
- **Island integration** (`src/island/Island.tsx`, collapsed presentation only — peek/expanded
  keep their `Ring`):
  - When **snapped to the notch** (`notch === true`), every `timerStyle` — including handoff
    `below` (A) — renders via `NotchProgress` with `simulateNotch={false}` so the physical
    camera housing shows through (no opaque fill or faux camera dot).
  - When **floating** (`notch === false`), the pill-cluster placement model (MO-22,
    `islandPlacement`) is used for all styles — outline treatments need real hardware geometry.
  - Session dots still render under the outline readout when `showDots` is on (a small,
    faithful extension of the handoff, which showed dots only in `below`).
- **Settings** (`src/settings/sections.tsx`): the three-icon picker becomes a 4×2 grid of eight
  cards, each a live, scaled `NotchProgress` preview (in `frame` mode — the handoff's dark
  mini-screen) so the animations are auditionable, consistent with how Sound/Done-animation
  preview on select.
- **Accent, not the demo palette.** The handoff drew `comet` in purple; we always use the
  user's resolved accent for every variant.
- **Migration** (`electron/store.ts`, `migrateTimerStyle`): legacy `circular → below`,
  `bar → outline`, `outline → outline`; unknown/missing → `outline` (the new default).

## Alternatives considered

- **Add a new `notchAnim` pref alongside `timerStyle`.** Rejected — `timerStyle` was unused, so
  keeping both would mean two overlapping appearance knobs and more "lying UI".
- **Nest the eight under `timerStyle === 'outline'`.** Rejected — `below` isn't an outline
  treatment, so the eight don't all fit under one parent option.
- **Settings-preview only, wire the island later.** Rejected by the owner — the island should
  render the chosen style now.
- **Static picker icons.** Rejected — live previews make the choice honest and the animations
  legible.

## Consequences

- `timerStyle` is now an honest, implemented setting; the unused `circular`/`bar` strings are gone.
- The MO-23 notch prototype is superseded and removed (`prototype.html`, `src/prototype/main.tsx`,
  `NotchProgressPrototype.tsx`, and the orphaned MO-21 `src/prototype/anim/` harness); its broken
  Vite inputs (and the already-missing MO-21 `prototype-anim.html` input) were dropped from
  `electron.vite.config.ts` so the production build no longer ships prototype pages.
- `underlight` and `comet` intentionally don't show progress — they're "running" cues paired with
  the time readout. UI copy in the picker says so.
- Animation *feel* (durations/easing/choreography beyond the baseline transitions above) is
  intentionally **left un-tuned**, consistent with the repo-wide deferred animation-tuning pass.
- Real-notch width calibration against actual hardware is a follow-up; the treatment currently
  uses the handoff's 260px viewport centered on the display.
