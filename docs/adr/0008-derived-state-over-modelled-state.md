# ADR-0008: Derive UI states from existing state rather than modelling them

Status: Accepted
Date: 2026-08-16

## Context

The task-list effort (`.scratch/task-list-features/`) introduced three situations the UI has to
render differently, and each one arrived looking like it wanted its own state:

- **At estimate** — a task has completed as many focus sessions as it was estimated to take, so
  the timer stops and offers two resume controls instead of rolling on.
- **No active task** — the user has deselected, or completed their last task, and a session may
  run crediting nothing.
- **Task progress vs the cycle dots** — a new segmented task-progress bar sits near the existing
  session dots and could plausibly have been part of the same placeable-element system.

Each was decided independently, on its own merits, in tickets 04, 05 and 03. All three landed on
the same answer, which is why it is worth recording once rather than three times.

## Decision

**None of the three becomes a modelled state.** Each is derived at the point of use from state
that already exists:

- **At estimate** is a pure predicate over `(status, mode, active task, the pause-at-estimate
  pref)` — `completedSessions >= estimateSessions`, evaluated only at the focus boundary. It is
  not a fifth `Status` member, not a field on `TimerState`, not persisted, and not broadcast.
  `Status` stays `idle | running | paused | complete`; at estimate the timer is genuinely `idle`
  at a focus boundary, which is what `idle` already means. The predicate is injected into
  `Timer` as a getter in the same shape as the existing `getPrefs`, so `Timer` never imports the
  task store.
- **No active task** is `activeTaskId === null`, which is already the source of truth in
  `TasksState`. No flag, no mode enum. "No-task mode" names a situation and must not become a
  type.
- **The task progress bar** is task-adjacent, not dots-adjacent: it renders where the active
  task is already named and already in scope, and has no structural relationship to
  `IslandPlacement` at all. `islandPlacement.dots` governs the cycle counter and means nothing
  to the bar.

The general rule, for this codebase: **if a state can be computed from state that already
exists, compute it.** Introduce a stored representation only when the derived one is wrong, not
merely when it is less explicit.

## Alternatives considered

Each was genuinely on the table and rejected for the same underlying reason.

- **A fifth `Status` variant** for at-estimate. The honest model, and the option a reader is
  most likely to expect. Rejected because it touches every exhaustive switch plus all four
  status consumers (view derivation, tray, notifications, the idle watcher) for a state that
  behaves *identically to `idle`* in all of them.
- **Reusing `paused`** for at-estimate. Rejected on the domain model: `paused` means the user
  pressed pause. It would also make the tray render "Focus paused — 25:00" and the expanded
  panel render "Paused, pick it back up", neither of which is true.
- **Staying in `complete`** by suppressing the advance timeout. Rejected because it wedges the
  timer in the transient state the completion flourish owns, and `playPause()` on `complete`
  already calls `advance()`, so a stray play silently advances past the decision.
- **A stored at-estimate flag** set by the timer and cleared on exit. Rejected because it has to
  be persisted, cleared on four separate paths (`skip`, `reset`, `switchMode`, active-task
  change), and reconciled against a task the user edited while the app was closed.
- **A fifth `IslandElement`** for the progress bar. Rejected because it touches the element
  union, `placement.ts`, `derive.ts`, an exhaustive switch, two `hasContent` guards, `store.ts`
  defaults and `migrateIslandPlacement`, the Settings placement grid, and all eight assertions
  in `scripts/placement-check.ts` — and would still reach only one of six views.

The common thread: a stored flag must be cleared on every path that can invalidate it, and every
one of those paths is a place to forget. A predicate has no paths.

## Consequences

- **The states survive restart for free** and clear the instant their inputs change — a pref
  toggled off, an active task deselected. There is nothing to migrate and no IPC to add.
- **A future reader will look for state that isn't there.** That is the main cost, and the main
  reason for this ADR: the design shows up as an *absence* of persistence and IPC, which reads
  like an omission rather than a decision.
- **Accepted consequence, at estimate**: the predicate cannot distinguish "stopped because you
  hit your estimate" from "idle for any other reason", so an over-estimate active task shows the
  two resume controls after Reset and at app launch. This is correct — if the active task is
  over its estimate and the timer sits at a focus boundary, the question is the right one
  however you arrived there — but it is deliberate, not a leak.
- **The predicate is shared, not duplicated.** It lives in the pure task module extracted for
  the assertion-script seam and is read by the main process and both renderers, so main and UI
  cannot drift.
- **This does not apply to `TimerState.task`**, which stays a deliberate denormalized mirror of
  the active task's title. That duplication buys the tray and the island's view derivation the
  title without either depending on the task store, and it matters more now that a block can run
  with no active task at all.
