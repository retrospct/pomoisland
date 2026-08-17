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

**Status:** done

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

## Settled 2026-08-17

**Detection: measured on hover, never tracked.** Truncation is a function of the title, the row's
width and the panel's width, so anything storing it needs invalidating when any of the three
change — a ResizeObserver per row, on a list that re-renders every timer tick. Read at the point
of use it cannot go stale: a rename, a re-render and a resized detached window all give a correct
answer on the next hover, with no subscription anywhere. `scrollWidth > clientWidth + 1`, the 1px
for sub-pixel rounding.

**Clipping: it renders inside the row.** The popover spans the row's content width and wraps,
clamped to three lines. That is the one geometry that cannot be clipped — the rows sit in an
`overflow-y: auto` scroller, so anything escaping the row's box is cut by it, and a
content-sized island window offers nothing outside the panel to escape into. Neither the
dropdown's invisible-spacer trick nor growing the window is needed. It opens **upward** from the
lower half of the scroll viewport so the container that makes it un-clippable cannot clip it.

**Delay 400ms**, quicker than the OS's ~1s: this is reading assistance for text the row could not
fit, not supplementary help. Slow enough that dragging the pointer down ten rows does not flash
ten popovers.

**Dismissal:** pointer leaving the title, the row unmounting, a drag starting, or **a scroll**.
Scroll dismissing is the answer to this ticket's open question — the popover does travel correctly
with a scroll since it is anchored to the row, but the up/down direction was chosen once from the
row's position in the viewport and scrolling is exactly what invalidates that.

**Coexistence with the row's native tooltip:** the row's `Click to deselect` attribute is dropped
while the popover is up, so the two never stack. Ours appears at 400ms and the OS waits about a
second, so the native one never fires over a truncated title; over a title that fits, nothing
changes.

`pointer-events: none` on the popover, which is load-bearing rather than tidy: it overlaps the
row below, and without it would steal that row's hover, its click, and this row's own mouseleave
— leaving itself stuck open.
