# 04 — Pause-at-estimate: boundary, timer state, and the resume controls

Type: grilling
Status: open

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
