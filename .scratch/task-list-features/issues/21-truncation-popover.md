# 21 — Truncation popover, and the deselect tooltip it unblocks

**What to build:** you can read a task title that doesn't fit.

Long titles truncate with an ellipsis and there is no way to see the rest. Show the full title on
hover — but **only when it is actually truncated**, so hovering a list of short titles stays
quiet.

This ticket also unblocks something it doesn't own: ticket 15's active-row "Click to deselect"
tooltip is unreachable while the title carries its own native tooltip, because a nested one wins
on hover. Removing that is part of this work, and the row tooltip lands here.

**Blocked by:** 15 (the deselect gesture has to exist for its tooltip to be true), 20 (the popover
lands on the settled row layout).

**Status:** ready-for-agent

**Why this shape:** see [ticket 06](06-truncation-detection-and-title-popover.md), whose open
questions are answered here. Hand-rolled — no positioning library, per the map's zero-runtime-
dependencies standing decision. Two in-repo precedents to build from: the hand-rolled dropdown
popover, and the pure-CSS two-layer hover reveal used by the session dots, which exists
specifically to avoid React hover state and container resize.

- [ ] The full title appears on hover **only** when the title is truncated
- [ ] Detection survives a title change, a row re-render and, once the detached window ships, a
      window resize. Measuring on hover is the cheapest option and avoids observer churn on a list
      that re-renders on every timer tick — but settle it here
- [ ] The popover is not clipped by the auto-sizing island window. Decide whether it needs the
      invisible-spacer trick the existing dropdown uses to reserve room, renders inside the panel
      bounds only, or forces the window to grow
- [ ] Trigger delay, dismissal, and behaviour on scroll are settled
- [ ] It coexists cleanly with the row's existing hover state, which drives both the row
      background and the revealed controls
- [ ] **The title's own native tooltip is removed**, not left alongside the popover
- [ ] The active row gains a native tooltip reading "Click to deselect", and it is reachable
      anywhere on the row including over the title text
- [ ] Fade is guarded by the existing reduced-motion flag
- [ ] Type-check and lint pass

**Produce a rough prototype to react to rather than a written argument** — this ticket is typed
prototype on the map for that reason.
