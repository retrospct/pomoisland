# 22 — Drag-reorder

**What to build:** drag a task to a new position so the list reflects your actual priorities.

Pointer-only and hand-rolled — no drag-and-drop library, per the map's zero-runtime-dependencies
standing decision. A drop-indicator line shows where the task will land.

**Blocked by:** 13 (the reorder mutation belongs in the pure module and is proved through its
check script), 20 (the handle lands on the settled row layout).

**Status:** ready-for-agent

**Why this shape:** see [ticket 09](09-reorder-model-and-drag-interaction.md), whose open
questions are answered here with the code in front of you. The task list already flags
drag-reorder as a planned fast-follow in its own header comment.

- [ ] A new reorder mutation exists with clear index semantics
- [ ] The rendered list is split into incomplete and complete before rendering, so a drop index in
      the rendered list is **not** an index into the stored array — settle whether the mutation
      takes a rendered index and translates, or a raw index the caller computes
- [ ] Drags are confined to the incomplete group. Dragging an incomplete task into the completed
      group would imply completing it, which is a different gesture wearing a drag costume
- [ ] A drop-indicator line shows the landing position, reduced-motion guarded
- [ ] The handle's affordance is settled — always visible or hover-revealed. It sits at the row's
      leading edge, where hover-revealing shifts the edge, which is worse than on the trailing
      edge
- [ ] Pointer-down on the handle does not toggle the row's selection (ticket 15 made the row a
      toggle)
- [ ] Decide whether drag auto-scroll is needed given the scroll area's height, and whether the
      detached window's larger height makes it moot
- [ ] Reordering re-aims "the next task" for ticket 15's auto-advance and ticket 19's ✓, since both
      pick by array order. Intended — confirm it is discoverable
- [ ] Check-script cases for the reorder mutation, including index translation across the
      incomplete/complete split
- [ ] Type-check and lint pass

**Already settled, do not re-open:** the task type gains **no `order` field**. Array position
stays the ordering, and reorder is a splice. An explicit order is a second source of truth needing
reconciliation on add, delete, clear-completed and any hand-edited file, plus re-densification on
collision, for no gain.

**Out of scope:** neighbour animation as tasks shift (the drop-indicator line is the whole motion
budget here), keyboard-accessible reorder, and screen-reader announcements for drag.
