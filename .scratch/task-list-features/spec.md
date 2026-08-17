# Spec: Task list features

Status: ready-for-agent
Assignee: Justin Lee
Wayfinder map: [map.md](map.md)
Decisions: tickets [01](issues/01-task-vocabulary-and-planned-sessions-model.md),
[02](issues/02-research-electron-frameless-resizable-macos.md),
[03](issues/03-where-the-task-progress-bar-renders.md),
[04](issues/04-pause-at-planned-boundary-and-timer-state.md),
[05](issues/05-no-task-mode-and-click-to-deselect.md)

---

## Problem Statement

PomoIsland can time a session and it can hold a task list, but the two barely know about
each other, and the task list itself is cramped into a panel that only exists inside the
Island.

Concretely, from a user's point of view:

**The timer doesn't respect the estimate you gave a task.** You say a task will take four
sessions. You work four sessions. Nothing happens — the counter rolls on to 5/4, 8/4, 12/4,
and the app never once asks whether that was the plan. The estimate is decoration. The only
signal you were over is a number you have to go and look at.

**You can't tell how far through a task you are without opening the list.** The Island shows
which cycle you're in — the session dots — but a task's own progress is a small "3/5" tacked
onto the end of the task name in two views, and absent everywhere else.

**Finishing your last task leaves the app lying to you.** Tick off the last incomplete task
and the Island keeps showing it as the active task, indefinitely. There is no way to say
"I'm not working on anything right now" at all: clicking a row selects it, and clicking it
again just selects it a second time.

**Skipping a session silently counts as doing one.** Press Next four times and a four-session
task is fully credited, your daily total is up four, and you may have earned a milestone ring
for work you didn't do.

**The task list is trapped in the Island.** It drops below the timer, is fixed at one width,
scrolls inside 220 pixels, and vanishes the moment you want to look at anything else. You
can't put it beside your work, can't make it bigger, can't keep it visible.

**Rows are cramped and jumpy.** Long titles truncate with no way to read them. Hover-revealed
controls unmount rather than hide, so the row physically reflows under your pointer. There's
no way to reorder tasks at all.

**The vocabulary is inconsistent.** The model says "pomodoros" in a codebase whose own
glossary reserves that word for user-facing copy and uses "session" everywhere else.

---

## Solution

Two batches, shipped as one effort.

### Task ↔ timer semantics

**A task progress bar in the Island.** Wherever the Island already names the active task —
Peek and Expanded — a segmented bar appears directly beneath it, one segment per estimated
session, filled as you complete them. Hovering reveals the exact count. It replaces today's
"• 3/5" text; a Settings toggle puts that text back.

**Pause at estimate.** When a task reaches the number of sessions you estimated, the timer
runs the break as normal and then *stops* at the start of what would be the next focus
session, instead of rolling on. Two controls take the bar's place: **+** starts another
session, **✓** finishes the task and starts the next one. The stop beats Auto-start.

Crucially, **+ does not raise the estimate**. The task runs 5/4, 6/4 — and the timer stops
again at every subsequent session. That nagging is deliberate: the point is to keep telling
you that you're working past your own estimate, and the way out is to open the list and
revise the estimate on purpose, not to have the number quietly rewrite itself.

**A skipped session no longer counts.** By default, ending a block early with Next credits
neither the task nor your daily total. A new Behavior setting restores the old behaviour for
anyone who wants it.

**A real "no task" state.** Finishing your last task clears the active task, or moves it to
the next incomplete one. Clicking the already-active row deselects it. A session with no
active task runs normally and credits nothing.

### Task list interface

**Pop the list out into its own window.** Resizable, remembers its size and position across
restarts, and can be pinned above other apps. While detached, the list leaves the Island
entirely — it's a move, not a copy — and every route that used to open the panel focuses the
window instead.

**Rows that hold still and tell you more.** Hover-revealed controls fade instead of
unmounting, so rows stop reflowing. Truncated titles show the full text on hover. An edit
pencil joins the hover set. Tasks can be dragged into a new order.

### Vocabulary

**"Estimate" becomes the single word** for how many sessions a task is expected to take, in
the model and in copy. "Pomodoro" leaves the task model entirely. The run of focus sessions
ending in a long break gains a name it never had: a **cycle**.

---

## User Stories

### Task progress bar

1. As someone mid-task, I want to see a segmented bar of my estimated sessions in the Peek
   card, so that I can judge my progress without opening the task list.
2. As someone in the Expanded panel, I want that same bar beneath the task name, so that the
   two views agree.
3. As someone glancing at the bar, I want each completed session to be a filled segment, so
   that progress is countable at a glance rather than estimated from a length.
4. As someone who wants the exact figure, I want hovering the bar to reveal "3/5", so that
   precision is one gesture away without permanently spending space on it.
5. As someone who has worked past my estimate, I want the bar to show that honestly rather
   than clamping at full, so that being over is visible rather than hidden.
6. As someone on a break, I want the bar to stay visible and unchanged, so that I can decide
   during the break what I'll do when it ends.
7. As someone with no active task, I want the bar to be absent rather than an empty track, so
   that the Island doesn't imply progress on nothing.
8. As someone who finds the bar noisy, I want a Settings toggle that returns the plain "• 3/5"
   count, so that I can have the information without the graphic.
9. As someone who turned the bar off, I want the app to look exactly as it did before the
   feature shipped, so that "off" is a real escape hatch and not a degraded third state.
10. As someone who has turned the session dots off, I want that to have no effect on the task
    bar, so that switching off the cycle counter doesn't silently remove an unrelated feature.
11. As someone using a collapsed floating layout, I want the bar *not* to appear there and
    grow the pill, so that a layout I chose for being small stays small.
12. As someone reading the task list, I want rows to keep their numeric count rather than each
    growing a bar, so that tasks stay comparable to each other at a glance.

### Pause at estimate

13. As someone who estimated four sessions, I want the timer to stop when I've done four, so
    that my estimate means something.
14. As someone who has just finished a task's last session, I want my break to run normally
    first, so that hitting an estimate never costs me a break.
15. As someone whose final session lands on a long break, I want the long break to run as it
    normally would, so that the cycle isn't disrupted by the task.
16. As someone at the stop, I want the completion flourish, sound and notification to fire
    exactly as they do for every other session, so that the last session of a task isn't the
    only uncelebrated one.
17. As someone at the stop, I want two clear controls where the bar was, so that the decision
    in front of me is obvious.
18. As someone who wants to keep going, I want **+** to start another session immediately, so
    that continuing is one click.
19. As someone who has kept going, I want my task to read 5/4 rather than silently becoming
    5/5, so that overrunning has visible weight.
20. As someone who keeps overrunning, I want the timer to stop and ask again at every session
    past the estimate, so that I can't drift to 12/4 without noticing.
21. As someone who accepts the overrun, I want to be able to open the task list and raise the
    estimate deliberately, so that there's a considered way out of the loop.
22. As someone who is done, I want **✓** to mark the task complete and start the timer on the
    next task, so that moving on is one click.
23. As someone with no tasks left when I press ✓, I want the timer to start anyway with no
    active task, so that finishing my list doesn't stop me working.
24. As someone using Auto-start, I want the estimate stop to beat it, so that the one thing I
    asked to be interrupted for actually interrupts.
25. As someone who has hit an estimate, I want the notification to say so rather than "back to
    focus", so that it doesn't describe something that then doesn't happen.
26. As someone at the stop, I want an unmissable but non-hostile cue, so that I notice without
    being harassed if I've stepped away.
27. As someone using the global play/pause shortcut, I want it to start a session from the stop
    like **+** does, so that a background shortcut never silently does nothing.
28. As someone who hovers over the controls, I want tooltips explaining what each does, so
    that + and ✓ aren't a guessing game.
29. As someone who doesn't want this at all, I want a Settings toggle to switch it off, so that
    the timer behaves as it does today.
30. As someone who deselects the task at the stop, I want that to be an accepted third answer,
    so that "neither of these" is available.

### Skipped sessions

31. As someone who presses Next to end a block early, I want that not to credit the task, so
    that skipping four times can't complete a four-session task.
32. As someone who presses Next, I want that not to inflate my daily total, so that milestone
    rings mean work I actually did.
33. As someone who deliberately uses Next as a "done early" button, I want a Behavior setting
    that credits skips, so that my workflow still works.
34. As someone who enabled that setting, I want a skip that reaches the estimate to stop the
    timer like any other session would, so that the rule has no exceptions I have to learn.

### No active task and deselection

35. As someone who has just completed the last incomplete task, I want the Island to stop
    showing it as active, so that the app isn't lying about what I'm doing.
36. As someone who completes a task with others remaining, I want the next incomplete task to
    become active, so that I can keep working without a detour to the list.
37. As someone who ticks off a task I *wasn't* working on, I want my active task left alone,
    so that housekeeping doesn't hijack my session.
38. As someone who wants to work untracked, I want to click the active row to deselect it, so
    that "no task" is reachable deliberately.
39. As someone who has deselected mid-session, I want the timer to keep running, so that
    deciding not to track something doesn't stop the work.
40. As someone whose session ends with no active task, I want nothing credited, so that
    untracked work stays untracked.
41. As someone hovering the active row, I want a tooltip telling me clicking again deselects,
    so that the gesture is discoverable.
42. As someone with no active task, I want every view to say so plainly, so that the state
    reads as intentional rather than broken.
43. As someone reactivating a completed task, I want it to become incomplete and active in one
    step, so that there's no flicker through a nonsensical in-between state.

### Detached task window

44. As someone who wants the list beside my work, I want to pop it out into its own window, so
    that it isn't tied to the Island.
45. As someone with a detached list, I want the Island to stop rendering the inline panel, so
    that I never have two copies of the same list disagreeing.
46. As someone with a detached list, I want the Island's task routes to focus that window, so
    that every path to my tasks leads to the one that exists.
47. As someone with many tasks, I want to resize the window, so that I can see more than a
    220-pixel scroll area.
48. As someone who sized the window carefully, I want that size and position remembered across
    restarts, so that I set it up once.
49. As someone who reconnects a display or changes resolution, I want the window to reappear
    somewhere visible, so that it can't be stranded off-screen.
50. As someone referring to the list while working, I want to pin it above other windows, so
    that it stays visible.
51. As someone with the list pinned, I want the Island to remain above it, so that the timer is
    never hidden by its own task list.
52. As someone who has pinned the window, I want the control to look and read like the Island's
    existing "Always on Top", so that I don't have to learn a second idiom for one concept.
53. As someone done with the separate window, I want to pop the list back into the Island, so
    that the move is reversible.
54. As someone dragging the detached window, I want the header to be the drag region, so that
    it moves like a normal window despite having no title bar.

### Task rows

55. As someone with a long task title, I want the full text on hover, so that I can read what I
      wrote.
56. As someone whose titles all fit, I want no popover at all, so that hovering isn't noisy.
57. As someone moving the pointer across rows, I want hover controls to fade in without the row
    changing size, so that the list doesn't shift under me.
58. As someone renaming a task, I want an edit pencil in the hover controls, so that editing
    doesn't need a separate mode.
59. As someone reprioritising, I want to drag a task to a new position, so that the order
    reflects my plan.
60. As someone dragging, I want a clear indicator of where it will land, so that I can drop
    accurately.
61. As someone dragging, I want to stay within incomplete tasks, so that reordering can't
    accidentally complete something.
62. As someone who has reordered, I want "the next task" to follow the new order, so that ✓ and
    auto-advance respect my priorities.

### Settings and vocabulary

63. As someone in Settings, I want a Tasks section with the two task toggles, so that they're
    where I'd look for them.
64. As someone in Settings, I want the skipped-session toggle grouped with the other behaviour
    switches, so that its scope reads correctly.
65. As someone reading toggle descriptions, I want to know what each actually changes, so that
    I can decide without experimenting.
66. As an existing user upgrading, I want my saved tasks to survive the rename with their
    counts intact, so that nothing resets.
67. As someone reading the app's copy, I want "estimate" used consistently, so that the model
    and the interface agree.
68. As someone reading the glossary, I want a name for the run of sessions ending in a long
    break, so that "sessions until long break" is expressible.

---

## Implementation Decisions

### Ownership and architecture

- **The main process remains the single source of truth** for timer runtime, prefs and tasks;
  both renderers stay pure IPC subscribers (ADR-0002). Nothing in this spec moves state into a
  renderer, including the detached window, which subscribes to the same broadcast task state.
- **Zero runtime dependencies.** The drag-reorder interaction, the truncation popover and all
  tooltips are hand-rolled. No drag-and-drop or positioning library is added. Existing
  in-repo precedents are the hand-rolled dropdown popover, the pure-CSS two-layer hover reveal
  used by the session dots, and native tooltips.

### Task model and migration

- `Task.estimatePomodoros` and `Task.completedPomodoros` are renamed to **`estimateSessions`**
  and **`completedSessions`**. The suffix is retained rather than going bare, because a
  `completed: number` sitting next to the existing `done: boolean` on the same object is a
  live misread hazard in the done-path logic.
- Everything already named "estimate" — the persisted default, the add mutation's field, the
  stepper callback — is **unchanged**, which is a direct consequence of choosing *estimate*
  over *planned*.
- **A per-task normalizer is added to the task store's load path.** There is none today: the
  persisted tasks array is passed through with a bare cast, so a rename without one would
  leave existing tasks with `undefined` where a number belongs and surface as `NaN` in the
  stepper and the new bar. The normalizer reads the old keys as fallbacks, forever, and never
  writes them; the new shape lands on the next persist, so it is self-healing.
- **No `version` field is added** to the persisted task state. Versioning machinery earns its
  place when a *shape* changes, not when a key is renamed. The precedent is the prefs store,
  which merges over defaults with no version.
- **No `order` field is added to `Task`.** Array position remains the ordering. An explicit
  order is a second source of truth needing reconciliation on add, delete, clear-completed and
  hand-edited files, plus re-densification on collision, for no gain — the array is already
  ordered, already durable, and the main process is its sole writer. Reorder is a splice.

### Timer: pause at estimate

- **The pause lands at the break → focus boundary**, not at the end of the final focus block.
  Both resume controls start a focus session, so pausing before the break would make finishing
  a task the one path through the app that silently eats a break.
- **No new `Status`.** The lifecycle stays `idle → running → paused → complete`. At estimate,
  the timer is `idle` at a focus boundary, which is exactly what `idle` already means. Reusing
  `paused` would make the tray render "Focus paused" and the Expanded panel render "Paused,
  pick it back up", neither of which is true; a fifth variant would touch every exhaustive
  switch and all four status consumers for a state that behaves identically to `idle` in all
  of them.
- **At-estimate is a derived predicate, never stored, never broadcast, never persisted.** It is
  a pure function of `(status, mode, active task, the pause-at-estimate pref)`, evaluated
  independently by the main process and both renderers.
  - **Accepted consequence**: the predicate cannot distinguish "stopped because you hit your
    estimate" from "idle for any other reason", so an over-estimate active task shows the two
    controls after Reset and at app launch. This is correct — if the active task is over its
    estimate and the timer sits at a focus boundary, the question is the right one however you
    arrived. The alternative is persisting a flag and clearing it on four separate paths.
- **The predicate is injected into the timer as a getter**, in the same shape as the existing
  prefs getter. The timer therefore never imports the task store and stays constructible from
  a plain Node script with no Electron runtime.
- **The condition is `completedSessions >= estimateSessions`**, evaluated *only* at the focus
  boundary — never at mutation time. Two edges are deliberately not special-cased: lowering an
  estimate below the completed count fires at the next boundary, and reactivating an already
  over-estimate task means the very next session ends at the stop. Evaluating only at the
  boundary keeps Settings and the task list structurally unable to stop a running timer.
- **`>=` rather than `==`** is forced by **+** not raising the estimate; equality would fire
  once and never again.
- **The completion path is untouched.** The flourish, sound, notification and bring-to-front
  all still fire. The single change is that the scheduled advance lands in the stop instead of
  starting the next block.
- **Precedence over Auto-start** lives as a check in the advance function's break → focus
  branch, placed before the auto-start pref is read. The focus → break branch is untouched,
  which is why the long-break case needs no handling: by the time the check runs, the break has
  already happened and its length was never relevant.
- **Reset, skip and switch-mode clear the state through their existing paths** — there is no
  state to clear, only a predicate that goes false.
- **The global play/pause shortcut and tray item start a session from the stop.** Making a
  global control silently inert based on task state is invisible from the background context
  those controls exist for.

### Session credit

- **The focus-complete hook gains the completion reason as an argument.** It currently takes
  none, so the store that credits the task cannot distinguish an elapsed block from a skipped
  one even though the reason already exists on the completion event.
  - Rejected: moving task credit onto the general completion channel, which would reorder it
    after notifications and bring-to-front.
- **By default a skipped block credits neither the task nor the daily total.** Both counters
  get the same answer; splitting them would let a task and the day disagree about the same
  minute.
- **A new Behavior pref restores crediting.** With it on, a skip that reaches the estimate
  trips the stop like any other session — no exemption, because the user has said in so many
  words that a skip *is* a session.
- **This is a behaviour change for existing users** whose skips credit today, and belongs in
  release notes rather than passing as a new-feature default.

### Task store: active task lifecycle

- **The done path auto-advances**, matching the delete and clear-completed paths, which both
  fall through to the first remaining incomplete task.
  - **Guarded**: marking a *non-active* task done must leave the active task untouched. The
    delete path gets this right by testing identity first; a naive copy would re-aim on every
    tick.
- **"No active task" is derived, not modelled.** A null active task id *is* the state. No flag,
  no status member, no mode enum. "No-task mode" names a situation and must not become a type.
- **Row click becomes a toggle on incomplete tasks only.** Completed rows are never rendered as
  active, so the toggle can never apply to them; their click keeps meaning
  un-complete-and-activate.
- **The un-complete-and-activate path collapses into a single mutation.** It currently fires
  two in sequence, so renderers briefly observe a task that is incomplete but not yet active —
  a state no user action produced.
- **Finishing a task mid-block donates that block to the next task.** Credit resolves from the
  active task at completion time, so auto-advancing mid-session re-aims it. This is intended:
  the alternatives are snapshotting the task at block start (which introduces the "session's
  task" notion this effort explicitly refused), falling to null (which contradicts
  auto-advance), or splitting credit (absurd for a unit that only counts whole blocks). It is
  spelled out so an implementer doesn't read it as a bug.
- **The timer's task field stays a denormalized mirror** of the active task's title, written
  only by the existing sync. It buys the tray and the Island's view derivation the title
  without either depending on the task store, and it matters more now that a block can run with
  no active task. Its comment — which claims free-text task labels exist, and they no longer do
  — is corrected.

### Progress bar placement

- **The bar is task-adjacent, not dots-adjacent**: a small component rendered at the two views
  that already name the active task and already hold it in scope — **Peek and Expanded**.
  - Rejected: **inside the session-dots component**, which would reach all five of its call
    sites free but put an unlabelled task bar in three views that never name a task, and would
    require feeding task state into a component that is about the cycle counter.
  - Rejected: **a fifth placeable island element**, which touches the element union, the
    placement derivation, the view derivation, an exhaustive switch, two content guards, the
    prefs defaults and migration, the Settings placement grid and every assertion in the
    placement check script — and still reaches only one of six views.
  - **The placement system, its migration and its check script are untouched.** The
    "there is no vertical-stacking primitive" problem that framed this question does not arise,
    because both chosen hosts are already vertical stacks.
- **Excluded**: the collapsed floating layout that has a task line (a collapsed presentation
  should not grow), and the task rows (a list is a comparison context — numbers compare, bars
  of differing segment counts don't).
- **The dots placement slot has no relationship to the bar.** The slot governs the cycle
  counter; the bar is task progress with its own pref.
- **Position**: between the task line and the timer's own progress bar, giving a
  specific-to-general reading order of task name → this task's progress → this block's
  progress.
- **The bar's row vanishes when there is no active task** — no reserved space, because the goal
  is that a task-less Island looks identical to today's.
- **The bar's slot is fixed-height when there *is* a task**, sized by whichever of the bar or
  the two resume controls is taller, so the swap at estimate is purely a crossfade with no
  reflow. This matters most in Peek, which is hover-revealed: a card that changes height under
  the pointer is a known past bug in this codebase, and the existing two-layer dots grid exists
  specifically to avoid it.
- **The bar persists unchanged through breaks.** Hiding it would add and remove a row at every
  block boundary — resize churn twice per session — and would remove the readout at the moment
  it is most decision-relevant, since the stop lands after the break.

### Prefs

Three new plain booleans. No migration helper is needed — the prefs load path merges over
defaults.

| Pref | Settings section | Default | Notes |
|---|---|---|---|
| Task progress bar | **Tasks** | on | Off falls back to the existing count text |
| Pause at estimate | **Tasks** | on | Named "estimate", never "planned" |
| Count skipped sessions | **Behavior** | **off** | Behaviour change for existing users |

- **Off for the progress bar means today's app byte for byte** — the existing count text
  becomes the off-state rather than being deleted. This gives a new-feature toggle the best
  possible meaning, and costs nothing since the component exists and is already wired at both
  sites.
- **The skipped-session pref belongs in Behavior, not Tasks.** It governs what counts as a
  session at all, moving the daily total, the daily-goal reveal and the milestone rings — not
  just task counters. Behavior already holds the two prefs that change what the timer does on
  its own. This keeps the Tasks section at exactly two rows.
- **Pause-at-estimate has no third "respects Auto-start" control** — that is its off-branch,
  reusing the existing pref.
- **The detached-window prefs persist with no Settings UI**, but the reason has changed: the
  original precedent was a pref with no control anywhere, and the correct precedent is now the
  always-on-top pref, which is user-toggleable from the Island menu and the tray but not from
  Settings.

### Notifications

- **The break-completion notification branches its body** when the stop is about to land. The
  title stays accurate; the body currently promises a return to focus that then doesn't happen.
- Title: **Break over**. Body when at estimate: **"You've hit your estimate. Pick up where you
  left off, or finish the task."**

### Copy

- **+** → "Start another session"
- **✓** → "Finish task and start the next", falling back to **"Finish task"** when no
  incomplete task remains, so the copy doesn't promise a next that doesn't exist at the moment
  it drops into the no-task state.
- Active row → "Click to deselect"
- Behavior toggle → **"Count skipped sessions"** / "A session you end early with Next still
  counts toward your task estimate and daily goal."
- Task-bar toggle description → closer to **"Show task progress as a bar instead of a count."**
- Empty task list → **"No tasks yet. Add one below."** (the existing string contains an em
  dash, which this project's copy rule excludes)
- **No em dashes in any user-facing copy.**
- The Island shows **one** empty-state string whether the list is empty or everything is done.
  The list itself keeps the distinction, where it is actionable.

### Detached window (Electron facts, already researched)

- **AppKit owns resize on macOS** — Electron's own hit-testing for frameless resize is compiled
  out. The corner grip is a hand-drawn glyph that must not intercept pointer events.
- **Pin with a normal-level always-on-top at relative level 1**, which places the window above
  ordinary applications but below the Island in all three of the Island's levels. The window is
  **never** parented to the Island window.
- **Persist normal bounds, debounced**; restore by validating, intersecting against a live
  display, then clamping size and origin in that order.
- **Transparency must stay off** on this window.
- **Reuse the shipped pin idiom** — the same glyph and label the Island menu and tray already
  use for always-on-top. Do not invent a second pin affordance.

### Vocabulary added to the domain glossary

- **Task** — a list entry with a title, an estimate and a completion state.
- **Estimated sessions** — how many focus sessions a task is expected to take. Prose qualifies
  the task side; row copy is unchanged and needs no adjective.
- **Cycle** — the run of focus sessions ending in a long break. This is the name that was
  missing; it makes the existing "sessions until long break" setting legible.
- The existing **Session** entry gains a clarification: a session belongs both to a cycle and,
  when a task is active, to that task.
- **Docked / detached** for where the list lives; **pop out / pop in** for the control.
  **Pin** means always-on-top and nothing else — "pinned" is retired for the docked axis.
- Code needs no prefixing: the receiver disambiguates a task's completed sessions from the
  timer's session index.

---

## Testing Decisions

### What a good test is here

**This repo has no test framework and is not gaining one.** Its established seam is
hand-rolled assertion scripts under `scripts/`, run directly by Node, that drive real
main-process modules synchronously and deterministically — no mocks, no framework, no
Electron runtime. Three already exist for audio, tick cadence, completion reason and placement.
New tests follow that shape exactly.

A good test here drives a module through its **public surface** and asserts on **observable
results** — the state a timer reports, the task state a reducer returns. It must not assert on
call ordering, internal fields, or which hook fired. The existing completion-reason script is
the model: it constructs a real timer, advances it a tick at a time through a public test-only
method, and asserts on the events it emits.

### Seams

**One new seam. Everything else reuses what exists.**

1. **The timer is reused as-is.** Pause-at-estimate hangs off an injected getter in the same
   shape as the existing prefs getter, so the timer remains constructible with two plain
   functions and no Electron import. This is what makes the boundary behaviour testable
   without touching the seam at all.

2. **New seam: the pure task reducer is extracted out of the task store.** The store imports
   Electron at module load to resolve the user-data path, so it cannot be driven from a check
   script today. The extraction pulls out dependency-free functions over task state — the
   mutations, focus-complete credit, the tolerant read of the renamed fields, and the
   at-estimate predicate — and leaves the filesystem and listener shell behind. This is the
   highest available seam: one module, no I/O, and it is also the module the timer's injected
   predicate reads through, so both features test through the same door.

3. **No seam for UI.** The bar visuals, drag-reorder, the truncation popover and the detached
   window are verified by hand, consistent with how the rest of the Island is developed.
   **Sole exception**: if the bar's segment-count and overflow math becomes a pure function, it
   is tested alongside the placement check, which is prior art for exactly that — a pure
   derivation extracted specifically so it is checkable in plain Node.

### What gets tested

Through the extracted reducer:

- The tolerant read: old persisted keys are honoured, new keys win, and a task missing both
  gets a sane default rather than `NaN`.
- Old keys are never written back; the new shape lands on persist.
- Deselect toggles: clicking the active task clears it; clicking a different one selects it.
- The done path advances the active task to the next incomplete one.
- The done path leaves the active task alone when a *non-active* task is completed.
- Completing the last incomplete task results in no active task.
- Un-complete-and-activate is a single mutation with no intermediate state.
- Focus-complete credits the active task and the daily total on an elapsed block.
- Focus-complete credits nothing on a skipped block by default.
- Focus-complete credits both on a skipped block when the pref is on.
- The daily total resets on date rollover (existing behaviour, now covered).
- The at-estimate predicate is true at and beyond the estimate, false below it, false with no
  active task, and false when the pref is off.

Through the timer, extending the existing completion-reason script's approach:

- The stop lands at the break → focus boundary, not at the end of the final focus block.
- The stop beats Auto-start.
- Status at the stop is `idle`, and mode is `focus`.
- The completion flourish still fires for the final session — the completion event is emitted
  exactly as for any other block.
- A long-break boundary changes nothing about where the stop lands.
- Reset and switch-mode leave no residue, since there is no state to leave.

### Prior art to follow

- **The completion-reason script** — closest match. Real timer, synchronous stepping, events
  collected and asserted, a minimal prefs object cast rather than fully spelled out so the
  script doesn't rot when unrelated prefs are added.
- **The placement check** — the model for testing a pure derivation extracted from rendering
  code, and the precedent to follow if the bar's segment math is extracted.
- Both print per-case pass/fail lines and set a non-zero exit code on failure. New scripts do
  the same and are registered as `*:check` package scripts alongside the existing four.

---

## Out of Scope

- **Keyboard-accessible reorder and drag announcements.** Reorder is pointer-only by explicit
  decision.
- **Keyboard-accessible task *selection*.** The row is a plain container holding three real
  buttons, so making the row itself a button would nest interactive elements and swallow their
  keyboard events, and a pressed-state attribute on a non-focusable element would be a lie in
  the accessibility tree. Doing it properly means a listbox pattern across the whole list —
  named here as the fix if it is ever wanted, but not this effort.
- **Multi-select and bulk task operations.**
- **The task list in the snap overlay window.** It renders none of this today.
- **Neighbour animation on drag** (the drop-indicator line is in scope; reflowing neighbours
  are not) and **pop-out/pop-in window choreography**. Both belong to the global motion pass.
- **The session index never wrapping at the cycle length.** After the first cycle every dot
  reads done and none reads current until reset. A real bug, but it belongs to the cycle
  counter, not the task bar.
- **Documentation rot** unrelated to this work: an ADR that names a store library the repo
  doesn't use, and two ADRs sharing a number.
- **A repeating audible cue at the estimate stop.** Held as a possible later escalation, not
  designed or shipped here — see Further Notes.
- **Auto-completing a task at its estimate.** The stop asks; it never decides.
- **Giving the daily goal a home independent of the dots placement slot.** Fixing the leaked
  hover target is in scope; redesigning where the daily goal lives is not.

---

## Further Notes

### Implementation tickets

This spec is broken into **twelve vertical slices, tickets 13 through 24** — see the map's
*Implementation tickets* table for the dependency graph. Tickets 13, 20 and 23 have no blockers
and can start immediately.

### Work deferred to implementation, not out of scope

Seven questions were consciously moved off the decision phase to shorten it. **These ship** —
their questions are real and are written up in full in their ticket files, to be answered by an
implementation session with the code in front of it. If any turns out to be a genuine product
call rather than a build call, escalate it rather than guessing.

Each is absorbed by an implementation ticket, which is where it gets answered: **06** → 21,
**07** → 17, **09** → 22, **10** → 23 and 24, **11** → 20 (with the resume-control half in 19),
**12** → 16, 17 and 18.

File anchors below are resolved against commit `2aabf28` and may drift.

- **[06 — Truncation detection and the title popover](issues/06-truncation-detection-and-title-popover.md)**
  — detection strategy (`scrollWidth > clientWidth` on hover versus observers on a list that
  re-renders every tick), and whether the popover needs the invisible-spacer trick the existing
  dropdown uses at `Island.tsx:129` to avoid being clipped by the auto-sizing Island window.
  **Carries a hard requirement from ticket 05**: it must *remove* the title span's native
  `title` attribute (`TaskList.tsx:433`), not add a popover alongside it, or the active row's
  "Click to deselect" tooltip is unreachable behind it.
- **[07 — Segmented progress bar design](issues/07-segmented-progress-bar-design.md)**
  — segment count at large estimates (the stepper clamps only at a minimum of 1,
  `TaskList.tsx:143`), overflow rendering, and whether the fill tracks the live accent
  (`view.accent`, which shifts for focus/break/final-minute) or holds a stable colour. Track
  colour is `--il-track`, per the peek bar at `Island.tsx:1346`. Narrowed by ticket 03: there
  are now only two hosts, both card-width, so the "differs sharply by host width" problem is
  gone — but the hover reveal now carries the count outright, and distinguishing the segmented
  task bar from the continuous timer bar ~15px below it in Peek is this ticket's job.
- **[09 — Reorder: model and drag interaction](issues/09-reorder-model-and-drag-interaction.md)**
  — the new mutation's index semantics, translating a rendered index in the incomplete
  partition back to a raw array index (`TaskList.tsx:56`), whether drags may cross the
  incomplete/complete boundary (recommend no), handle affordance, and whether drag auto-scroll
  is needed given the 220px scroll area (`TaskList.tsx:115`).
- **[10 — Detached window architecture and header controls](issues/10-detached-window-architecture-and-header.md)**
  — a fourth renderer entry versus reusing the island entry with a query param
  (`electron.vite.config.ts:36`); window lifecycle following the Settings singleton pattern;
  what ✕ means (pop back in, or stay detached and closed); flat versus nested geometry keys on
  a `Prefs` that is otherwise flat; and the Island-side consequences of exclusivity
  (`Island.tsx:22`, `:1705`, `IslandApp.tsx:231`). **One open sub-decision**: whether the
  detached window keeps its own always-on-top pref or reads the Island's — they are *not*
  interchangeable, because the Island's is inert while snapped. Also: adding pop out / pop in
  to the ⋯ dropdown means retuning `MENU_ALLOWANCE` a third time (200 → 264 → ?), and it is
  measured, not guessed.
- **[11 — Task row layout under pressure](issues/11-task-row-layout-under-pressure.md)**
  — what fits in 320px (`TaskList.tsx:19`) now the row carries a drag handle, checkbox, title,
  pencil, stepper and delete; switching hover-revealed controls from unmount to opacity
  (`TaskList.tsx:562`) and whether the space is reserved always or only while hovered; settling
  the whole hover-revealed set at once so the row has one rule; and whether docked and detached
  share a layout. **Inherits from ticket 03/04**: the bar/buttons slot is fixed-height and the
  buttons fit inside it, not the reverse.
- **[12 — Tasks settings section](issues/12-tasks-settings-section.md)**
  — grid placement in the 2-column General tab where Behavior is the entire right column
  (`sections.tsx:713`, `:850`), and final toggle copy following the existing behaviours table
  shape (`sections.tsx:667`). **Now fully unblocked** — pref keys, defaults and section
  assignment are all settled above.
- **[08](issues/08-plus-and-check-resume-controls.md)** was merged into 04 and is resolved;
  only its "where do the buttons render per host" question survives, in ticket 11.

### Still unspecified

- **Tray menu implications** of the no-task state and of a detached window.
- **Whether pop out deserves a global shortcut** — depends on ticket 10.

### The attention cue, and why it stops where it does

The visual treatment at the estimate stop is deliberately quiet: an over-estimate treatment on
the bar and a guarded pulse on the two controls. A repeating audible cue was considered and
held back. The app has no precedent for one — its alarms are one-shot, its notification is
single and silent, and its only "come look" mechanism shows the Island without stealing focus.
A repeating beep has no dismissal short of interacting, which punishes exactly the person who
stepped away from the desk.

Most of the weight comes from the design itself rather than the cue: the timer *stops* and
stays stopped, which is far harder to ignore than one that rolls on to 12/4. If that proves
too quiet in practice, a single extra escalation — re-raising the Island, or one repeat of the
completion alarm after a delay — is a small follow-up. Shipping it first is very hard to walk
back.

### One watch-item, logged deliberately

With the skipped-session pref **on**, a skip that reaches the estimate trips the stop. This may
prove annoying. It reaches only users who turned that pref on, so it self-selects, and the
alternative — a session that counts toward an estimate but cannot reach it — is a distinction
with no explanation. Revisit if it bites.

### A pattern worth noticing

Three independent decisions in this effort landed on the same answer: **derive it, don't model
it.** At-estimate is a predicate, not a status. No-active-task is a null id, not a mode. The
progress bar's relationship to the cycle dots is nothing at all, rather than a shared
component. In each case the modelled alternative was available and rejected for the same
reason — a stored flag has to be cleared on every path that can invalidate it, and each of
those paths is a place to forget.

**This is now recorded as ADR-0008** (`docs/adr/0008-derived-state-over-modelled-state.md`).
It qualified on all three counts: hard to reverse (the derived design shows up as an *absence*
of IPC and persistence, which a future reader will look for and not find), surprising without
context, and the result of a real trade-off — the fifth-status option and the stored flag were
both genuinely on the table. Implementation sessions should respect it rather than re-deriving
it per ticket.

### Accepted deviations from the original brief

- The bar sits below the **task line**, not below the global session dots. It is against the
  thing it describes rather than against a different counter.
- **+** does not increment the estimate. The brief implied keeping the bar "honest" by growing
  it; the decision instead keeps the *overrun* honest by refusing to grow it.
- A **third** visible pref ships, not two — the skipped-session toggle, in Behavior rather than
  Tasks.
