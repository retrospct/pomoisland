# 22 — Drag-reorder

**What to build:** drag a task to a new position so the list reflects your actual priorities.

Pointer-only and hand-rolled — no drag-and-drop library, per the map's zero-runtime-dependencies
standing decision. A drop-indicator line shows where the task will land.

**Blocked by:** 13 (the reorder mutation belongs in the pure module and is proved through its
check script), 20 (the handle lands on the settled row layout).

**Status:** done

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

## Settled 2026-08-17

**Index semantics: neither of the two options offered — no index at all.** The mutation is
`{ type: 'reorder', id, beforeId }`, naming the neighbour by id, with `beforeId: null` meaning
last among the **incomplete** tasks (not the end of the array, whenever a completed task sits
behind them). Translating a rendered index inside the reducer would put a rendering decision in
the model; having the caller compute a raw index would put the model's array in the view. Ids need
no translation, and they make a drop onto a task since completed or deleted a no-op rather than a
silent move of whatever shuffled into that slot.

**The handle is hover-revealed**, and this ticket's objection to that — revealing something at the
leading edge shifts the edge — was removed by ticket 20: the revealed set is opacity-only with its
space held permanently, so the grip occupies its column whether or not it is visible. Completed
rows reserve the same column without a grip, so the two groups' checkboxes line up.

**No auto-scroll.** Docked, the scroll area is 220px, about eight rows; detached it is however
tall the user made the window, usually the whole list. The drags needing it are those crossing
more than a screenful, on a list long enough that dragging is the wrong tool for moving something
that far.

**Drags end on `lostpointercapture` and nowhere else.** It is the one signal meaning "over,
however it ended" — the spec releases capture implicitly on pointerup and pointercancel and
dispatches it either way, so it also covers the OS taking the pointer. Committing on pointerup
*as well* was a double write: calling `releasePointerCapture` there fired the same handler in the
same tick with a pre-update closure, sending the mutation twice. Reorder is idempotent, which is
precisely why it would never have shown as a bug.

**The landing line is drawn only for a drop that would move something.** Both no-op arrangements
— dropping on yourself, and dropping before the row that already follows you — land the line on
the dragged row, which is faded to 0.4, so the line was rendering half-visible through its
parent. The same predicate suppresses the pointless persist-and-broadcast, including the
before-the-next-row case an id-only comparison misses.

**Re-aiming the next task is proved but not surfaced.** `task-check` asserts that dragging a task
to the top makes it the one the done-path advance picks. Nothing in the UI announces that;
"confirm it is discoverable" is left open rather than claimed.

**Accessibility:** the grip is `aria-hidden` and carries no button role. Keyboard reorder and
screen-reader drag announcements are both out of scope above, so a labelled button role would
advertise focus and an Enter action it cannot honor.
