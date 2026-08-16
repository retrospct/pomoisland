# 04 — Pause-at-estimate: boundary, timer state, and the resume controls

Type: grilling
Status: closed
Assignee: Justin Lee

<!-- Ticket 08 was merged into this one when the decision phase was shortened; its
     questions are Part B below. -->


## Question — Part A: the boundary

The hardest decision on the map. When a task's completed sessions reach its estimate,
the timer "pauses" and the bar's slot shows two buttons. But `advance()` goes
**focus → break → focus** (`electron/timer.ts:174`), so there is a break in the way.

1. **Which boundary?**
   - *Before the break*: pause the moment the final focus block completes. The two buttons
     appear immediately and the user never gets their break unless they ask for it.
   - *After the break*: the break runs normally, and the pause lands at the focus boundary
     where the buttons ("start another session" / "next task") actually make sense — but
     the bar sits in its paused state for the whole break.

2. **What `Status` is the timer in while paused-at-estimate?** Existing states are
   `idle | running | paused | complete` (`src/shared/types.ts:4`). Reuse `idle`, reuse
   `paused`, or introduce a new state? A new state touches every consumer — `derive.ts`,
   tray (`electron/tray.ts:104`), notifications (`electron/notify.ts:21`), idle auto-pause
   (`electron/idle.ts:17`).

3. **Does the 2600 ms completion flourish still run?** `complete()` sets `status: 'complete'`
   and schedules `advance()` after `COMPLETE_HOLD_MS` (`timer.ts:8`, `158`). Does
   pause-at-estimate suppress the hold, run inside it, or replace `advance()`?

4. **Where does it hook?** `recordFocusComplete` fires at `complete()` time, which means
   `skip()` also counts as a completed session (`timer.ts:225`). Should a *skipped* session
   be able to trigger the pause?

   **Cheaper than it was, as of PR #47 (`2aabf28`).** `CompleteEvent` now carries
   `reason: 'elapsed' | 'skipped'`, and `skip()` passes `'skipped'` — `raiseOnComplete` already
   uses it to avoid raising the island on a manual Next. So the discriminator exists.

   But **it is not yet on the path this ticket needs.** `complete()` fires `focusCompleteHooks`
   *before* `completeHooks`, and the focus hooks take **no argument** — so
   `recordFocusComplete`, which is what actually credits the task, still cannot tell a skip from
   an elapsed block. Making it able to means either threading `reason` into the focus hooks or
   moving task credit onto the `onComplete` channel. That is a real fork, and it belongs to this
   ticket.

   The question now splits in two, and they can be answered differently:
   - Does a skipped session **credit the task** at all (`completedSessions + 1`)?
   - Given it credits, does reaching the estimate that way **trip the pause**?

   Precedent from #47 argues for treating skip as user-driven and therefore not something that
   should interrupt them — but note that would also overturn today's behaviour, where a skip
   credits the task silently.

5. **Long-break interaction.** If the task's final session also lands on a long-break
   boundary (`idx % cSessions === 0`), does that change anything?

6. **Precedence.** Pause-at-estimate ON plus `autoStart` ON: pause wins (settled). Confirm
   mechanically where that precedence lives, given `autoStart` is read in exactly two lines
   inside `advance()` (`timer.ts:187`, `:198`).

Note this overturns a deliberate existing decision — `electron/taskStore.ts:91-96` says
tasks are never auto-completed at estimate and "keeps counting, e.g. 8/7".

## Question — Part B: the resume controls (merged from ticket 08)

Two buttons occupy the progress bar's slot while paused: **+** (add and start another
session) and **✓** (complete this task, start the timer on the next one). Part A decides
when they appear; these decide what they do. Answer both parts in one session.

7. **What does + mutate?** Increment the estimate by 1 and start a focus block — or
   start a session without touching the plan, letting the task run 5/4? The former keeps
   the bar honest; the latter preserves the existing "keeps counting" spirit.

8. **What does ✓ do, in order?** Mark done → clear/advance `activeTaskId` → start a focus
   block. Ticket 05 may already make the done path auto-advance, in which case ✓ is partly
   a wrapper over existing behaviour — check before specifying new code.

9. **Do either of them skip the break?** Falls straight out of Part A's boundary answer. If
   the pause lands *before* the break, both buttons starting a focus block means the user
   never breaks.

10. **"No more incomplete tasks → starts a timer with no active tasks."** Confirm this means
    ✓ falls into ticket 05's no-task mode *and* starts running — the timer running with
    `activeTaskId === null`.

Deferred to implementation (record as spec notes, don't decide here): where the two buttons
render in each host and how the pause state degrades in narrow views; tooltip copy.

## Resolution

**The pause is a stop the app already knew how to make.** Every choice below pushes the
feature into one branch inside `advance()` and a pure predicate, leaving `Status`,
`complete()`, `notify.ts` (bar one copy branch) and `raiseOnComplete.ts` alone.

### A1. Boundary — after the break

The break runs normally. The pause lands at the **break → focus** boundary, where "start
another session" and "next task" are the two things that can actually happen next. Rejected
*before the break*: both buttons start a focus block, so pausing first would make finishing
a task the one path through the app that silently eats your break, and the long-break case
(§A5) makes that worse rather than better. The cost is honest and cosmetic: the bar reads
"done, awaiting your call" for the duration of the break.

Consequence, settled by this alone: **neither button skips a break**, because by the time
either is visible the break has already run.

### A2. Timer state — reuse `idle`, no new `Status`

`Status` stays `idle | running | paused | complete` (`src/shared/types.ts:4`,
`CONTEXT.md:23`). At-estimate is a timer that is genuinely stopped at a focus boundary,
which is what `idle` already means.

Rejected, with reasons that are worth keeping:

- **`paused`** — two lies. `tray.ts:52` would render "Focus paused — 25:00" and
  `derive.ts:95` the micro-copy "Paused, pick it back up", neither of which is true. It also
  overloads the one word in the lifecycle that means *the user pressed pause*.
- **Staying in `complete`** — wedges the timer in the transient state the 2600 ms flourish
  owns, and `playPause()` on `complete` calls `advance()` (`timer.ts:207`), so any stray
  play silently advances past the decision.
- **A fifth `Status` variant** — the honest model, but it buys a five-file blast radius
  (`derive.ts`, `tray.ts:104`, `notify.ts`, `idle.ts:17`, every exhaustive switch) for a
  state that behaves identically to `idle` in all four consumers.

The concept belongs to the **task**, not the runtime: the timer is idle, and the *task* is
at its estimate.

### A3. Credit — a skip credits nothing, behind a new Behavior toggle

`recordFocusComplete` bumps **two** counters, not one: `task.completedSessions` *and*
`completedToday` (which drives the `SessionDots` hover reveal, `dailyGoal`, and the
milestone rings at 10 and 20). Both get the same answer, because a task and the day must
not disagree about what happened in the same minute.

**Default: a skipped block credits neither.** A session is "one focus block"
(`CONTEXT.md:25`); a block you cut short is not one, and today's behaviour lets four taps of
the global Next shortcut mark a 4-session task complete.

**New pref `creditSkipped` (default off) restores the old behaviour** for users who want it.
This overturns today's silent credit, so it is a behaviour change for existing users and
belongs in the release notes, not passed off as a new-feature default.

**Mechanism**: thread `reason` into `FocusCompleteHook` (`() => void` →
`(e: { reason }) => void`, one consumer at `ipc.ts:68`). Rejected moving task credit onto
the `onComplete` channel, which would reorder it after `notify` and `raiseOnComplete`.

### A4. The flourish runs — only the scheduled `advance()` is replaced

`complete()` is untouched: the ripple, the sound, the notification and the bring-to-front
all fire exactly as they do for every other session. Suppressing them would make the *last*
session of a task the only one that isn't celebrated, which is backwards. The single change
is that the `COMPLETE_HOLD_MS` timeout lands in the at-estimate state instead of starting
the next block.

### A5. Condition, precedence, long break

The condition is **`completedSessions >= estimateSessions`**, evaluated **only at the focus
boundary** — one check in `advance()`'s break → focus branch, placed before `p.autoStart` is
read (`timer.ts:198`). That is where pause-beating-`autoStart` lives, mechanically.

`>=` rather than `===` is forced by B1: since **+** never raises the estimate, an equality
test would fire once at 4/4 and never again at 5/4.

Two edges are deliberately **not** special-cased:

- Lowering an estimate below the completed count with the stepper (a 2/6 dropped to 2/2)
  fires the pause at the *next* boundary, never at mutation time. This keeps Settings and
  the task list unable to stop a running timer.
- Reactivating an already-over task (a 6/4) means the very next session ends in the buttons.
  Correct: the task *is* over its estimate.

**Long break: nothing changes.** The focus → break branch is untouched, so by the time the
pause is evaluated the break has already run and its length was never relevant.
`skip()`, `reset()` and `switchMode()` clear the state through their existing paths.

### A6. A credited skip trips the pause

With `creditSkipped` on, a skip can be the block that reaches the estimate, and it trips the
pause like any other. No exemption: the pause reads the counter and nothing else, and a
session that counts toward an estimate but can't reach it is a distinction with no
explanation. The PR #47 precedent (a manual Next doesn't raise the island) is about not
*interrupting* a background user; a stopped timer showing two buttons is not that.

**Watch-item, logged deliberately**: this may prove annoying in practice. It only reaches
users who turned `creditSkipped` on, so it self-selects. Revisit if it bites.

### A7. Derived, never stored

At-estimate is a **pure predicate** over `(status, mode, activeTask, prefs.pauseAtEstimate)`,
evaluated independently by main and both renderers. It is not a field on `TimerState`, not
persisted, and needs no new IPC. It survives restart for free, and clears the instant the
pref is switched off or the active task changes.

**Accepted consequence**: the predicate cannot distinguish "stopped because you hit your
estimate" from "idle for any other reason", so a 6/4 active task shows the two buttons after
Reset and at app boot. This is correct, not a leak — if the active task is over its estimate
and the timer sits at a focus boundary, "+ or ✓?" is the right question however you got
there. The alternative is an app that knows you're over your estimate and shows a plain play
button anyway, at the cost of persisting a flag and clearing it on four paths.

**Placement**: the predicate lives in the pure task module extracted for the testing seam,
and is injected into `Timer` as a `getAtEstimate: () => boolean` getter in the same shape as
the existing `getPrefs`. `Timer` therefore never imports `taskStore` and stays drivable from
a `scripts/*-check.ts` script.

### A8. The escape hatch stays open

Because the state is `idle`, the global Play/Pause shortcut and the tray's Play/Pause start
a focus block straight out of it, bypassing the buttons. **Allowed.** It does what **+**
does, from a surface where the buttons aren't visible; making a global shortcut silently
inert based on task state is invisible from exactly the background context that shortcut
exists for. Next/skip is likewise untouched: skipping from at-estimate credits nothing and
advances to a break, which is today's from-idle skip behaviour (`complete-reason-check.ts`
Case 3) unchanged.

## Resolution — Part B: the two buttons

### B1. + starts a session and does **not** touch the estimate

The task runs 5/4, 6/4, and the pause re-fires at every subsequent boundary. **The nag loop
is the feature.** The point is to keep telling you that you are working past what you
estimated; the two ways out are to keep choosing **+** deliberately, or to open the task
list and raise the estimate — which is a considered act, not a reflex.

Rejected *increment the estimate*: it silences the signal at the exact moment the signal is
the product. Under it, 10/4 costs nothing because the number quietly rewrites itself; under
B1, 5/4 has weight because you had to choose it.

This makes ticket 07's overflow case **live** rather than hypothetical, and invalidates that
ticket's §2 note that "ticket 08's **+** button increments the estimate". Amended on the map.

### B2. ✓ is `update {done:true}` plus a start, and owns no advance logic

Order: mark the task done → `activeTaskId` moves to the next incomplete task → start a focus
block, running.

The middle step is **ticket 05's**, not this one's. `taskStore.ts:129` does not clear
`activeTaskId` on the done path today, while `delete` (`:140`) and `clearCompleted` (`:150`)
both auto-advance via `tasks.find(t => !t.done)?.id ?? null`. That has to be fixed for 05
regardless; once it is, ✓ inherits the advance. Two code paths independently choosing "the
next task" is how they drift.

**This hard-couples 04 to 05** answering *auto-advance* rather than *fall to null*. It is
the first question of ticket 05, not an assumption made here.

When there is no next incomplete task, ✓ lands in **05's no-task mode with the timer
running**: `activeTaskId === null`, a focus block counting down, crediting nothing at the
end.

### B3. Attention cue — visual only

The bar switches to an over-estimate treatment and the two buttons pulse, `rm`-guarded.

Rejected a **repeating beep until dismissed**: the app has no precedent for a repeating cue
(`sound.ts` alarms are one-shot, `notify.ts` fires a single silent notification, and
`raiseOnComplete` shows the island without stealing focus), it has no dismissal affordance
short of interacting, and it punishes precisely the person who stepped away from the desk.
Most of the weight is already bought by B1 and A1: the timer *stops* and stays stopped,
which is far harder to ignore than one that rolls on to 10/4.

**Held as a later dial, not designed now**: a single extra escalation — re-raising the
island, or one repeat of the completion alarm after a delay. One-line follow-up if the
visual proves too quiet; very hard to walk back if shipped first.

### B4. Tooltips (native `title=""`)

- **+** → "Start another session"
- **✓** → "Finish task and start the next", falling back to **"Finish task"** when there is
  no next incomplete task, so the copy doesn't promise a next that doesn't exist at the
  moment it drops into no-task mode.

Ticket 11 owns where the buttons physically sit and how they degrade in narrow views.

## Prefs produced by this ticket

Three plain booleans. No migration helper — `store.ts:155` merges over `DEFAULT_PREFS`
(ADR-0004).

| Key | Section | Default | Notes |
|---|---|---|---|
| `pauseAtEstimate` | Tasks | on | Named per ticket 01; "planned" never enters the codebase |
| `taskProgress` | Tasks | on | The bar beside the session dots (ticket 03) |
| `creditSkipped` | **Behavior** | **off** | §A3; behaviour change for existing users |

`creditSkipped` goes in **Behavior**, not Tasks. It governs what counts as a completed
session — moving `completedSessions`, `completedToday`, the daily-goal reveal and the
milestone rings alike — so filing it under Tasks would imply it only touches task counters,
which is the one thing it isn't. Behavior already holds the two prefs that change what the
timer does on its own (`autoStart`, `pauseIdle`); this is the third of that kind. It also
leaves ticket 12's Tasks section at exactly the two rows its column-balance question was
sized against.

**This overturns the map's "exactly two new visible prefs" standing decision**, which is now
*two in Tasks, one in Behavior*. Amended on the map.

Behavior row copy: **"Count skipped sessions"** / *"A session you end early with Next still
counts toward your task estimate and daily goal."*

## Notification copy

`notify.ts` fires on break completion with "Break over / Back to focus" — 2600 ms before
`advance()` lands in at-estimate and does *not* go back to focus. The title stays; the body
branches when the pause is about to land:

> **Break over** — "You've hit your estimate. Pick up where you left off, or finish the task."

One branch in `copyFor`, reading the same predicate. `notify.ts` already imports `getPrefs`,
so importing the task predicate is in keeping. Leaving it unbranched would make the one
notification a user gets at the end of a task the only one describing something that then
doesn't happen.

Resolves the map's *Not yet specified* line on pause-at-estimate notification behaviour.
