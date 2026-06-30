# Tune all animations (later stage)

Status: ready-for-human

## Summary

All animations currently in the app are direct ports of the design prototype's timings and
are **intentionally un-tuned**. A dedicated later-stage pass should fine-tune their feel.

This is a deliberate decision recorded so it isn't mistaken for finished work. Treat current
durations/easing as placeholders, not final.

## Scope (things to tune)

- Island: collapsed → peek → expanded transitions, breathing ring, hover/press feedback.
- Completion ("Done") ripples: `burst` / `echo` / `heartbeat` / `bloom` (`src/shared/ripple.ts`,
  `src/island/Island.tsx` `CompletionFx`, keyframes in `src/island/animations.css`).
- Urgent-amber shift in the final minute of a focus block.
- Drag + magnetic-snap motion and the snap "land" feel.
- Settings "Done animation" live preview (keyframes in `src/settings/settings.css`).

## What "tuning" means here

- Durations, easing curves (cubic-beziers), stagger/delay choreography.
- Respecting reduced-motion preferences (`prefers-reduced-motion`) — currently not handled.
- Consistency of timing language across island + settings.

## Scoped exceptions (early passes before the global sweep)

- **Drop ghost (MO-35, 2026-06-29):** The snap-zone overlay received a targeted
  animation pass in `src/snapOverlay/snapOverlay.css` — fade-in + scaleY on drag
  start, glow pulse while nearSnap, `prefers-reduced-motion` guard. Durations are
  *not* final; treat them as starting points for the global consistency pass.

## Notes

- Keep the island and the Settings ripple preview visually in sync — they share
  `src/shared/ripple.ts`, so tune ring definitions there once.
- Owner explicitly asked to defer this to "later stages" (2026-06-26).
