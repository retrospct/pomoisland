# 07 — Segmented task progress bar: visual and behavioural design

Type: prototype
Status: deferred — decided during implementation, not on the map
Blocked by: 03

## Question

A rounded, dotted/segmented progress line showing completed vs estimated task sessions,
filled in the primary theme colour, revealing `<completed>/<estimate>` on hover. Ticket 03
decides *where* it lives; this decides what it looks like and how it behaves at the edges.

1. **Segment count.** One segment per estimated session is the obvious reading, but estimate
   values are unbounded (the stepper clamps only at a minimum of 1,
   `TaskList.tsx:143`). What happens at 12? At 30? Cap the segment count and switch to a
   continuous bar, compress segments, or let them shrink indefinitely? The answer differs
   sharply by host width — a collapsed cluster is far narrower than `ExpandedBody`.

2. **Overflow.** `completedPomodoros` can exceed the estimate (the deliberate 8/7 case,
   `taskStore.ts:91`), and ticket 08's **+** button increments the estimate. Does the bar grow
   a segment, overfill, or clamp?

3. **Hover reveal.** Reuse the two-layer opacity-swap pattern from `SessionDots.tsx` +
   `island.css:94-115`, which exists specifically to avoid React hover state and container
   resize (MO-50 flicker fix). Does the count replace the bar or sit beside it?

4. **Colour.** Filled segments use "the primary theme colour" — in the island that is the
   *live* accent `view.accent` (a JS value that shifts for focus/break/final-minute,
   `src/shared/accent.ts:143`), not the static `--il-teal`. Does the task bar track the
   live accent shift, or hold a stable colour so it reads differently from timer progress?
   Track colour: `--il-track`, per the peek bar at `Island.tsx:1338`.

5. **Relationship to the dots directly above it.** They are different counters
   (`sessionIndex`/`cSessions` vs task completed/estimate) rendering as similar dotted runs a
   few pixels apart. How do we keep them visually distinguishable?

Motion in scope: fill transition, `rm`-guarded. Prototype it rather than argue it.
