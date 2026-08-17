# 14 — Rename to `estimateSessions` / `completedSessions`, with a tolerant read

**What to build:** an existing user upgrades and their saved tasks keep every count intact. From
the outside nothing changes at all; this is the vocabulary fix that unblocks the progress bar and
the estimate stop.

The task model currently says "pomodoros" in a codebase whose own glossary reserves that word for
user-facing copy and uses "session" everywhere else. Rename the two count fields, and add the
per-task normalizer that makes the rename survivable — there is none today, so a rename without
one leaves existing tasks with `undefined` where a number belongs and surfaces as `NaN` in the
stepper and the new bar.

Old keys are read forever as fallbacks and never written back, so the new shape lands on the next
persist and the migration is self-healing.

**Blocked by:** 13 — the normalizer belongs in the extracted pure module, and its check script is
where the migration is proved.

**Status:** ready-for-agent

**Why this shape:** see [ticket 01](01-task-vocabulary-and-planned-sessions-model.md). *Estimate*
won as the word because the number is a guess the user revises, not a commitment. Everything
already named "estimate" — the persisted default, the add mutation's field, the stepper callback —
is deliberately **unchanged**; that was the point of choosing estimate over planned.

- [ ] Both task count fields carry the `Sessions` suffix, not bare names — a bare `completed`
      beside the existing `done` boolean is a live misread hazard in the done-path logic
- [ ] A per-task normalizer runs on load, reading new keys first and old keys as fallback, with a
      sane default when neither is present
- [ ] Old keys are never written back
- [ ] No `version` field is added to the persisted task state — the prefs store's merge-over-
      defaults is the precedent
- [ ] No `order` field is added to the task type; array position remains the ordering
- [ ] A task file written before this change loads with its counts intact and no `NaN` anywhere
      in the stepper or the row count
- [ ] The check script from 13 gains cases for: old keys only, new keys only, both present, and
      neither
- [ ] The glossary gains **Task**, **Estimated sessions** and **Cycle**, and the existing
      **Session** entry notes that a session belongs both to a cycle and, when a task is active,
      to that task
- [ ] Type-check and lint pass
