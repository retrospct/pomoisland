# 06 — Truncation detection and the title popover

Type: prototype
Status: deferred — decided during implementation, not on the map

**Requirement from ticket 05 §7 (closed 2026-08-16):** this ticket must **remove**
`title={task.title}` from the title span (`TaskList.tsx:433`), not merely add a popover
alongside it. Ticket 05 puts a native `title="Click to deselect"` on the *active row*, and a
nested `title` wins on hover — so leaving the span's attribute in place would make the row
tooltip appear only when the pointer is off the text, which is worse than having none. Fold
this into Q5's reuse-or-build answer.

## Question

Show the full task title on hover **only when it is actually truncated**. Hand-rolled — no
`floating-ui` (see map Notes).

1. **Detection.** `scrollWidth > clientWidth` is the standard check, but it must be
   re-evaluated when the title changes, when the row re-renders, and — once ticket 10 lands
   — whenever the detached window is resized. `ResizeObserver` per row, one observer on the
   list, or measure on hover only? Measuring on hover is cheapest and avoids observer churn
   on a list that already re-renders on every timer tick.

2. **Positioning, and the clipping problem.** The docked panel lives inside the island
   `BrowserWindow`, which auto-sizes to content via `ResizeObserver` → `island:resize`
   (`IslandApp.tsx:126`). A popover that overflows gets **clipped by the window**, which is
   exactly why `Menu.tsx`'s dropdown needs an invisible spacer at `Island.tsx:129` to
   reserve room. Does the title popover need the same trick, does it render inside the
   panel bounds only, or does it force the window to grow?

3. **Does it differ docked vs detached?** In a detached window the constraint is the
   window's own bounds instead.

4. **Trigger and dismissal.** Hover delay before showing, behaviour on scroll, and
   interaction with the row's existing `hovered` state (`TaskList.tsx:342`) which drives
   both the row background and the +/− reveal.

5. **Reuse or build?** `Menu.tsx:241` has a hand-rolled popover style block; `SessionDots`
   has a pure-CSS two-layer hover reveal built specifically to avoid React hover state and
   container resize (the MO-50 flicker fix). Either could be the base.

Produce a rough prototype to react to rather than a written argument.
