# 01 — Task vocabulary and the estimated-sessions model

Type: grilling
Status: closed
Assignee: Justin Lee

## Question

What do we call task-side concepts, and does the `Task` model change shape?

Three sub-decisions:

1. **`estimatePomodoros` vs "planned sessions".** The brief and the intended UI copy both
   say *planned sessions*; the model says `estimatePomodoros` (`src/shared/types.ts:220`)
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

## Resolution

**Estimate wins as the word, everywhere.** "Planned" was a placeholder in the brief, not a
considered term — *estimate* describes the thing more honestly, since the number is a guess
the user revises, not a commitment. It is now the single word for this concept in the model,
in user copy, and in this effort's own vocabulary. "Pomodoro" is retired from the task model
entirely, satisfying `CONTEXT.md:25` ("**Session** — one focus block. not: 'pomodoro' in
code").

### 1. Field rename — suffix only

`Task.estimatePomodoros` → **`Task.estimateSessions`**
`Task.completedPomodoros` → **`Task.completedSessions`**

Nothing else is renamed. `defaultEstimate`, `TaskMutation.add.estimate`, `onAdjustEstimate`
and `addEstimate` already say "estimate" and stay exactly as they are — a happy consequence
of keeping "estimate" rather than moving to "planned", which would have forced all four to
change and added a second migrated key to `tasks.json`.

Both fields keep the `Sessions` suffix rather than going bare (`task.estimate` /
`task.completed`). `Task` already has `done: boolean`, and a `completed: number` sitting
beside a `done: boolean` on the same object is a live misread hazard in `taskStore.ts`'s
done-path logic. Once `completed` needs the suffix, `estimate` takes it for symmetry.

**Blast radius — 12 references in 4 files**, all mechanical:
`src/shared/types.ts:231,233,255` · `src/island/TaskList.tsx:147,238,475,476,481,482` ·
`src/island/Island.tsx:1340,1341,1570,1571` · `electron/taskStore.ts:103,119,120`.

### 2. `tasks.json` back-compat — tolerant read, no versioning

`electron/taskStore.ts:36` merges the top level over defaults but passes the tasks array
through with a bare `as Task[]` cast — **there is no per-task normalizer today**. A rename
would therefore leave existing tasks with `undefined` where a number belongs, surfacing as
`NaN` in the stepper and the new progress bar. The rename cannot ship without one.

Add a per-task map inside `load()`:

```
estimateSessions: t.estimateSessions ?? t.estimatePomodoros ?? 1
completedSessions: t.completedSessions ?? t.completedPomodoros ?? 0
```

Old keys are read forever but never written; the new shape lands on the next persist, so
it is self-healing. **No `version` field on `TasksState`** — versioning machinery earns its
place when a *shape* changes, not when a key is renamed, and this is the app's first task
migration. The precedent is `store.ts:155`, which merges prefs over defaults with no version
(ADR-0004).

### 3. The two counters — qualify the task side, name the grouping

Both counters count the same unit — one focus session — so inventing a second noun for the
task side would be a lie in the model. Instead:

- **Task side** is qualified in prose as **estimated sessions**. The row copy is unchanged:
  `TaskList.tsx:506` already renders `"3/5 sessions"` with no adjective, and it reads fine.
- **Global side** keeps plain "sessions". Existing settings copy `'Sessions until long
  break'` (`sections.tsx:705`, `cSessions`, range 2–8) stands.
- **~~The gap was never the counters — it was the grouping.~~ Retracted 2026-08-17.** This
  claimed the run of `cSessions` focus sessions ending in a long break "has never had a name"
  and coined **cycle** for it. **The premise was false**: `CONTEXT.md` already names it
  **Round** ("a group of focus sessions; a long break follows every ... sessions"), and has
  since before this effort. Coining "cycle" minted a synonym for an existing glossary term,
  which is the one thing a glossary exists to prevent.
  **The word is Round.** It was found during ticket 14's implementation, when the glossary
  edit this ticket deferred was finally written, and resolved by the owner in favour of the
  existing term. "Sessions until long break" reads as "sessions in a round".
  Fixed in passing: that glossary entry referenced a pref `longEvery` which does not exist
  anywhere in the codebase — the real one is `cSessions`.
- **Code needs no prefixing.** The receiver disambiguates: `task.completedSessions` vs
  `timer.sessionIndex`. No `taskSessions` / `cycleSessions` renaming.

**Terms for `CONTEXT.md`** (the edit itself is spec/implementation work, per this ticket):
**Task**, **Estimated sessions**, plus a clarification under the existing **Session** entry
that a session belongs both to a **round** and, when a task is active, to that task. No new
name for the grouping — see the retraction above. Landed in ticket 14, which also added
**Active task** and **Completed sessions**.

### 4. No `order` field on `Task`

Ordering stays implicit array position. An `order: number` is a second source of truth
needing reconciliation on add, delete, `clearCompleted`, and any hand-edited `tasks.json`,
plus re-densification when values collide — for no gain, since the array is already ordered,
already durable, and the main process is the sole writer. Reorder is a splice.

This does not make ticket 09 easier or harder: mapping a drop index inside the active
partition back to an index in the raw array (`TaskList.tsx:56`) is required either way. It
does keep §2's normalizer a pure rename, with no new required field to default.

### 5. Consequent rename — `pause-at-planned` → `pause-at-estimate`

Because §1–§3 make *estimate* the single word, the coined feature name follows, or the
retired word survives at the map's highest-traffic spot. References updated across the map's
standing decisions and tickets 04, 07, 08 and 12; ticket 04's in-file title changes.

**Filenames are deliberately left alone** (`04-pause-at-planned-…md`) so the map's links stay
intact — a cosmetic gain not worth breaking references for. The point of renaming now is that
ticket 04 is still open and will produce the pref key that ships this behaviour: it should be
`pauseAtEstimate` from the start, never inheriting a word already retired.
