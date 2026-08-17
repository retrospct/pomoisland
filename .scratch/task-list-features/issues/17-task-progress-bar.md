# 17 — Task progress bar in Peek and Expanded, plus the Task progress toggle

**What to build:** you can see how far through a task you are without opening the list.

A segmented bar appears directly beneath the task name in **Peek** and **Expanded** — one segment
per estimated session, filled as you complete them, hovering reveals the exact count. It replaces
today's "• 3/5" text hint at those two sites, and a Settings toggle puts that text back.

**Blocked by:** 14 — the bar reads the renamed count fields.

**Status:** ready-for-agent

**Why this shape:** see [ticket 03](03-where-the-task-progress-bar-renders.md). The bar is
**task-adjacent, not dots-adjacent**: it renders where the active task is already named and
already in scope. Do **not** put it inside the session-dots component (it would appear unlabelled
in three views that never name a task) and do **not** make it a fifth placeable island element
(eight files touched to reach one of six views). The placement system, its migration and its
check script stay untouched.

Open design questions are [ticket 07](07-segmented-progress-bar-design.md)'s and are answered
here, with the code in front of you: segment count at large estimates, how overflow renders, and
whether the fill tracks the live accent or holds a stable colour.

- [ ] The bar renders in Peek and Expanded only — not in the collapsed layouts, not in the task
      rows
- [ ] It sits between the task line and the timer's own progress bar, giving a reading order of
      task name, then this task's progress, then this block's progress
- [ ] It is visually distinguishable from the timer's continuous bar roughly fifteen pixels below
      it in Peek — segmented versus continuous is most of the answer already
- [ ] Hovering reveals the count; this is now the only place the exact numbers appear in the
      island while the toggle is on
- [ ] Overflow past the estimate renders deliberately — this is the **common** case, not an edge,
      because ticket 19's + control never raises the estimate
- [ ] The bar's row vanishes entirely when there is no active task — not a reserved gap, not an
      empty track
- [ ] The slot is fixed-height when there **is** a task, sized to accommodate ticket 19's two
      controls, so that swap is a pure crossfade with no reflow
- [ ] The bar persists unchanged through breaks
- [ ] A new Tasks pref, default **on**, toggles it; off falls back to the existing count text, so
      off is today's app byte for byte and the count component becomes the off-state rather than
      dead code
- [ ] Whichever of tickets 16, 17, 18 lands first creates the Tasks settings section
- [ ] The dots placement slot has no effect on the bar
- [ ] Fill transition is guarded by the existing reduced-motion flag
- [ ] Type-check and lint pass

**Bug fix included:** the Expanded card passes the daily count to the session-dots component with
no length guard, so with the dots switched off it still renders a hover target revealing the daily
count. Add the same guard the other two call sites already have, to both Expanded and Peek. Named
consequence: with dots off, Expanded loses the daily-goal hover reveal. That is correct.

**Accepted deviation from the brief:** the brief said "below the 4 global session dots". The bar
sits below the **task line** instead, against the thing it describes rather than against a
different counter.
