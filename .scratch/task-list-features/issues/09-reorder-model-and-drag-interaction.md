# 09 — Reorder: data model and drag interaction

Type: grilling
Status: deferred — decided during implementation, not on the map
Answered: 2026-08-17, by ticket 22. The mutation names its neighbour by id, not by index, so the rendered/stored split needs no translation in either direction. Drags stay inside the incomplete group and the reducer enforces it.
The full write-up is in issues/22-*.md under "Settled 2026-08-17".
Blocked by: 01

## Question

A drag target icon to the left of the checkbox, reordering tasks. Pointer-only,
hand-rolled, no `dnd-kit` (see map Notes). `TaskList.tsx:3` already flags this as a planned
fast-follow.

1. **Mutation shape.** There is no `order` field (ticket 01 decides whether one is added).
   Either way a new `TaskMutation` variant is needed — `{type:'reorder', id, toIndex}` or
   similar — plus a case in `applyMutation` (`electron/taskStore.ts:109`). What are the
   index semantics?

2. **Per-partition vs raw indices.** The UI splits `tasks` into `active`/`done` before
   rendering (`TaskList.tsx:56`), so a drop index in the rendered list is *not* an index
   into the stored array. Does the mutation take a rendered index and translate, or a raw
   index the UI must compute?

3. **Can a drag cross the active/done boundary?** Dragging an incomplete task into the done
   group would imply completing it, which is a different gesture wearing a drag costume.
   Recommend confining drags to their own partition — but decide it.

4. **Does reorder change which task is "next"?** Ticket 08's ✓ and ticket 05's auto-advance
   both pick the next incomplete task by array order, so reordering silently re-aims them.
   Intended, and is it discoverable?

5. **Handle affordance.** Always visible, or hover-revealed like the pencil? It sits left of
   the checkbox — outside the group that ticket 11 is already compressing. Hover-revealing
   it makes the row's leading edge shift, which is worse than on the trailing edge.

6. **Drag mechanics**, hand-rolled: HTML5 drag events or pointer math? Note the list scrolls
   (`maxHeight: 220`, `TaskList.tsx:115`) — is drag auto-scroll needed, and does the
   detached window's larger height make it moot?

Motion in scope: a **drop-indicator line** (a 2px accent rule between rows), `rm`-guarded.
Neighbour FLIP animation is explicitly out of scope.
