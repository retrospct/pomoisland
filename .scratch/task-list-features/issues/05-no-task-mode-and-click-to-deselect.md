# 05 — No-task mode and click-to-deselect

Type: grilling
Status: open

## Question

The brief assumes "this state should already exist". **It does not.** What exists is a
display fallback in `src/island/derive.ts:105` —
`const displayTask = hasTask ? rawTask : isBreak ? 'Break time' : 'No task set'` — driven
purely by whether `TimerState.task` is an empty string, plus a dimmed colour at `:107`.
There is no modelled state.

And there is a live bug behind it: `taskStore.ts` clears `activeTaskId` on the `delete`
path (`:138`) and on `clearCompleted` (`:147`), but **not** when the last incomplete task
is marked done via `{type:'update', patch:{done:true}}` (`:129`). So today, completing your
last task leaves the island still showing it as the active task.

Decide:

1. **Is "no active task" a modelled state or a derived one?** `activeTaskId === null` is
   already the source of truth. Is anything more needed, or is the whole job (a) fixing the
   done path to clear it and (b) making every view render the null case deliberately?

2. **What does each view show?** Collapsed, Peek, Expanded, L3Card, CircleCard — and what
   happens to the task progress bar from ticket 03 (hidden entirely, or an empty track?).

3. **Does the done path clearing `activeTaskId` auto-advance to the next incomplete task,
   or fall to null?** `delete` and `clearCompleted` both auto-advance
   (`tasks.find(t => !t.done)?.id ?? null`). Consistency argues for auto-advance — but
   ticket 08's ✓ button *also* advances, and if the done path already advances, the two
   behaviours may collide or may be the same code path.

4. **Click-to-deselect mechanics.** Row click currently always fires `setActive`
   (`TaskList.tsx:363`); it must become a toggle. Note reactivating a *done* task un-dones
   it first (`TaskList.tsx:226`) — does the toggle interact with that?

Settled already: deselecting mid-session lets the timer run on untasked, and the session
credits nothing (credit resolves from `activeTaskId` at `complete()` time).
