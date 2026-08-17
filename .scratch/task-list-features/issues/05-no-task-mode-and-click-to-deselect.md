# 05 — No-task mode and click-to-deselect

Type: grilling
Status: closed
Assignee: Justin Lee

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

## Facts corrected while grilling

Three things in the Question above are wrong or incomplete, and the resolution is written
against these instead.

**`displayTask` has four render sites, not five.** Task text appears in floating **L2** only
(ring variant `Island.tsx:1176`, outlined variant `:1255`), **Peek** (`:1337`) and
**ExpandedBody** (`:1567`). It does **not** appear in L1, in **L3Card**, in **CircleCard**
(L4), or in the snapped collapsed pill — those render dots and time with no task line. So
"what does each view show" is a smaller question than the ticket assumed.

**`TimerState.task` is a pure mirror.** Nothing writes `setTask` except the
`activeTaskTitle()` sync at `ipc.ts:57-66`, so it is always exactly the active task's title
or `''`. The comment at `Island.tsx:1478-1479` calling it "the free-text timer label [that]
isn't always backed by a task-list entry" is **stale** — there is no free-text path. See §6.

**`onToggleDone` is not a toggle.** Active rows send `{done: true}` (`TaskList.tsx:141`);
done rows send `{done: false}` (`:230`). Separately, a done row's *row click* fires **two**
mutations back to back (`:227-228`), each committing, persisting and broadcasting.

## Resolution

### 1. The done path auto-advances — and only when the done task was the active one

`taskStore.ts:129` currently leaves `activeTaskId` pointing at a task you just marked done.
It is fixed to auto-advance exactly like its siblings `delete` (`:140`) and `clearCompleted`
(`:150`): `tasks.find(t => !t.done)?.id ?? null`.

**The guard is the part that's easy to get wrong**: marking a *non-active* task done from
the list must leave `activeTaskId` untouched. `delete` gets this right by testing
`s.activeTaskId === m.id` first; a naive copy into the `update` case would re-aim the active
task every time any row is ticked.

Rejected *fall to null*: it would drop the commonest gesture in the app — tick a task off,
keep working — into no-task mode, where the next session credits nothing. It would also
contradict **ticket 04 §B2**, which specified ✓ as `update {done:true}` plus a start
precisely so that "pick the next task" stays one code path instead of two that drift.

**This closes the hard coupling 04 declared.** ✓ owns no advance logic; it inherits this one.

### 2. No-task is derived, never modelled

`activeTaskId === null` **is** the state. Nothing is added — no flag, no `Status` member, no
mode enum. The entire job is §1 plus making the four render sites handle null deliberately,
which `derive.ts:105` already does.

This matches ticket 04 §A7, which made at-estimate a derived predicate for the same reasons.
The app now has two "modes" that are both pure predicates over existing state rather than
stored flags — one idea, applied twice. **"No-task mode" is a name for a situation, not for
anything in the model, and must not become a type.**

### 3. Click-to-deselect: active partition only, and one mutation

Row click becomes a toggle: clicking the already-active row sends `setActive: null`.

**Done rows are untouched.** They render with `isActive={false}` hardcoded
(`TaskList.tsx:219`), so a done row can never *be* the active row. Their click keeps meaning
un-done-and-activate. The toggle's meaning is "stop working on this", which is incoherent
for a row that is by definition not what you're working on.

**Collapse the done row's two mutations into one.** Between `{done:false}` (`:227`) and
`setActive` (`:228`) the renderer briefly sees a task that is un-done but not yet active — a
state no user action produced. One mutation carrying both changes removes the flicker window
and halves the disk writes.

### 4. What the views show, and what the bar does

The four sites already render `derive.ts:105`'s fallback — "No task set", or "Break time"
during a break, in the dimmed `taskDim` colour (`:107`). **That is the whole job for the
text.** `TaskSessions` (`Island.tsx:1338`, `:1568`) already renders conditionally on
`activeTask` and needs no change.

**Ticket 03's progress bar hides entirely** when there is no active task. Not an empty
track: an empty track promises a thing that isn't there, and it would sit directly beneath
the global session dots, which *are* still counting — implying the two are related when one
is inert. Hiding it makes the no-task island visually identical to today's, which is right
for a state reached constantly today without complaint.

**Recorded as a requirement on ticket 03.**

### 5. Empty-state copy: one string on the island

The island says **"No task set"** whether the list is empty or everything is done. Rejected
differentiating: the island's task line is one truncating row in three layouts, the nuance
isn't read at a glance, and "All done" becomes wrong the instant a done task is un-ticked.
The distinction stays in the task list, which is where it is actionable and where
`TaskList.tsx:125` already makes it.

**Copy fix while in the file**: that existing string has an em dash, which the project's
copy rule excludes. "No tasks yet — add one below." becomes **"No tasks yet. Add one
below."**

Resolves the map's *Not yet specified* line on empty-state copy.

### 6. `TimerState.task` stays a mirror; the comment is what changes

Keep the field. The duplication buys something real: `tray.ts:57` and `derive.ts` get the
active title without either taking a dependency on the task store, and the timer's own notion
of what it is timing survives independently — which matters precisely because ticket 04's
no-task mode lets a block run with `activeTaskId === null`.

Rejected dropping it in favour of reading `TasksState`: four render sites plus `tray.ts`
consume it, and the tray has no `TasksState` subscription today.

**The edit is the comment at `Island.tsx:1478-1479`**, which currently tells a future reader
that free-text task labels exist. It becomes: mirror of the active task's title, written only
by the `ipc.ts` sync; empty string means no active task. This is the one place in this ticket
where the domain model is written down rather than changed.

### 7. Deselect discoverability: a native tooltip, gated on ticket 06

The active row gets a native `title=""` reading **"Click to deselect"**, matching the app's
tooltip idiom throughout.

Rejected a visible control: ticket 11 is already fitting six things into a 320px row, and
this would be a seventh that applies to exactly one row.

**Blocked on ticket 06.** `TaskList.tsx:433` already sets `title={task.title}` on the *title
span*, and a nested `title` wins on hover — so a row-level tooltip would appear only when the
pointer is off the text, which is worse than nothing. **Requirement recorded on ticket 06**:
when it replaces native title tooltips with the hand-rolled truncation popover, it must
*remove* the span's `title` attribute rather than leave both. With that done, this tooltip is
clean and free.

### 8. Deselecting is a legitimate exit from at-estimate

Clicking the active row while ticket 04's + / ✓ buttons are showing deselects normally: the
derived predicate goes false, the buttons vanish, the timer stays `idle`. **No special-casing.**

It is the honest third answer to the question those buttons ask — not "another session", not
"finish it", but "I'm not working on this any more". Blocking it would make the task list
read-only exactly when a user is most likely to want to reorganise. And it costs nothing,
because there is no at-estimate state to unwind (04 §A7).

### 9. Selection stays pointer-only — recorded, not papered over

The row is a plain `<div>` with `onClick` — no `role`, no `tabIndex` — so selection is
already unreachable by keyboard today, and making it a toggle doesn't change that.

Rejected `role="button"` on the row: it *contains* three real buttons (checkbox, pencil,
delete), so that would nest interactive elements and swallow their keyboard events. Rejected
bare `aria-pressed`: on a non-focusable div it is a lie in the accessibility tree.

Doing this properly means a listbox pattern (`role="listbox"` / `role="option"` /
`aria-selected`) across the whole list — real work, and not this ticket. Consistent with the
map's existing pointer-only stance on reorder. **Goes in the spec's Out of Scope**, naming
the listbox refactor as the fix if it is ever wanted.

### 10. Finishing a task mid-block donates the block to the next task

A focus block is running; ten minutes in, you tick the active task done. §1 auto-advances
`activeTaskId` to the next incomplete task, and credit resolves from `activeTaskId` at
`complete()` time — so the whole block credits the **next** task, which you hadn't started.

**Intended. No mechanism to avoid it is worth adding.** Snapshotting the task at block start
would introduce the "session's task" notion the map explicitly refused; falling to null would
contradict §1; splitting credit is absurd for a unit that only counts whole blocks. In
practice "I finished this while the timer runs" means the user has already moved on, so
crediting the next task matches intent more often than not.

**This needs one sentence in the spec** so an implementer doesn't read it as a bug and fix
it — the same reason `taskStore.ts:91-96` documents the 8/7 case.

## Pushed onto other tickets

- **03** — the progress bar hides entirely when there is no active task (§4).
- **06** — must remove the title span's native `title` attribute, not just add a popover
  alongside it, or §7's row tooltip is unreachable.
