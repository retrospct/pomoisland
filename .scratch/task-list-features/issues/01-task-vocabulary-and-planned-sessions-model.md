# 01 — Task vocabulary and the planned-sessions model

Type: grilling
Status: open

## Question

What do we call task-side concepts, and does the `Task` model change shape?

Three sub-decisions:

1. **`estimatePomodoros` vs "planned sessions".** The brief and the intended UI copy both
   say *planned sessions*; the model says `estimatePomodoros` (`src/shared/types.ts:212`)
   and `CONTEXT.md` says to prefer "session" over "pomodoro" in code, reserving "pomodoro"
   for user copy. So the field name violates the repo's own convention. Rename to
   `plannedSessions` (touching `taskStore.ts`, `TaskList.tsx`, `TaskMutation`, and existing
   `tasks.json` files), or accept a deliberate model/UI divergence and document it?

2. **Task session vs global session.** Two counters that both render as "sessions" in the
   UI — `TimerState.sessionIndex` against `cSessions` (the dots) and
   `Task.completedPomodoros` against its estimate (the new bar). They will sit within a few
   pixels of each other. What does each get called in copy, in code, and in `CONTEXT.md`?

3. **Does `Task` gain an explicit `order` field?** Ordering is implicit array position
   today and the UI re-partitions into active/done before rendering
   (`src/island/TaskList.tsx:56`). Ticket 09 consumes this answer.

Also: `CONTEXT.md` has no task vocabulary at all, though the model predates this work.
Decide the terms here; the actual `CONTEXT.md` edit is spec/implementation work, not a
map ticket.
