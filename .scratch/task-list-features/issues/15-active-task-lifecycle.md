# 15 — Active-task lifecycle: done-path advance, click-to-deselect, no-task rendering

**What to build:** the app stops lying about what you are working on.

Today, ticking off your last incomplete task leaves the Island showing it as active
indefinitely, and there is no way to say "I'm not working on anything" at all — clicking a row
selects it, and clicking again just selects it a second time.

After this ticket: completing your last task clears the active task; completing one of several
moves to the next incomplete one; ticking a task you *weren't* working on leaves your active task
alone; and clicking the already-active row deselects it. A session with no active task runs
normally and credits nothing.

**Blocked by:** 13 — all of this is reducer behaviour and is proved through that seam.

**Status:** ready-for-agent

**Why this shape:** see [ticket 05](05-no-task-mode-and-click-to-deselect.md). "No active task"
is **derived, not modelled** — a null active task id *is* the state, per
`docs/adr/0008-derived-state-over-modelled-state.md`. Do not add a flag, a status member or a
mode enum. "No-task mode" names a situation and must not become a type.

Note the file overlap: tickets 20 and 23 also edit the task list and will conflict on merge, but
neither gates this one.

- [ ] Completing the active task advances to the first remaining incomplete task, matching the
      delete and clear-completed paths
- [ ] Completing a **non-active** task leaves the active task untouched — the delete path's
      identity test is the pattern to copy; a naive version re-aims on every tick
- [ ] Completing the last incomplete task leaves no active task
- [ ] Clicking the already-active row deselects it
- [ ] The toggle applies to incomplete rows only; completed rows are never rendered as active, so
      their click keeps meaning un-complete-and-activate
- [ ] Un-complete-and-activate is a **single** mutation — today it fires two in sequence, so
      renderers briefly observe a task that is incomplete but not yet active, a state no user
      action produced
- [ ] Deselecting mid-session lets the timer run on, and that session credits nothing
- [ ] Every view that names the active task renders the no-task case deliberately
- [ ] The island shows one empty-state string whether the list is empty or everything is done;
      the list itself keeps the distinction
- [ ] The task list's empty-state copy becomes "No tasks yet. Add one below." — the existing
      string contains an em dash, which this project's copy rule excludes
- [ ] The timer's task field stays a denormalized mirror; its comment is corrected, because it
      currently claims free-text task labels exist and they no longer do
- [ ] Check-script cases: deselect toggles, done-path advances, done-path leaves a non-active task
      alone, last task leaves none active, un-complete-and-activate has no intermediate state
- [ ] Type-check and lint pass

**Deliberate, do not "fix":** finishing a task mid-block donates that block to the next task.
Credit resolves from the active task at completion time, so auto-advancing mid-session re-aims it.
The alternatives were all worse — snapshotting the task at block start introduces the "session's
task" notion this effort explicitly refused, falling to null contradicts auto-advance, and
splitting credit is absurd for a unit that only counts whole blocks.

**Not in this ticket:** the active row's "Click to deselect" tooltip. It is unreachable until
ticket 21 removes the title's own native tooltip, which wins on hover.
