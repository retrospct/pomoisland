# 04 — Pause-at-planned: which boundary, and what the timer does

Type: grilling
Status: open

## Question

The hardest decision on the map. When a task's completed sessions reach its planned count,
the timer "pauses" and the bar's slot shows two buttons. But `advance()` goes
**focus → break → focus** (`electron/timer.ts:171`), so there is a break in the way.

1. **Which boundary?**
   - *Before the break*: pause the moment the final focus block completes. The two buttons
     appear immediately and the user never gets their break unless they ask for it.
   - *After the break*: the break runs normally, and the pause lands at the focus boundary
     where the buttons ("start another session" / "next task") actually make sense — but
     the bar sits in its paused state for the whole break.

2. **What `Status` is the timer in while paused-at-planned?** Existing states are
   `idle | running | paused | complete` (`src/shared/types.ts:4`). Reuse `idle`, reuse
   `paused`, or introduce a new state? A new state touches every consumer — `derive.ts`,
   tray (`electron/tray.ts:83`), notifications (`electron/notify.ts:21`), idle auto-pause
   (`electron/idle.ts:17`).

3. **Does the 2600 ms completion flourish still run?** `complete()` sets `status: 'complete'`
   and schedules `advance()` after `COMPLETE_HOLD_MS` (`timer.ts:8`, `158`). Does
   pause-at-planned suppress the hold, run inside it, or replace `advance()`?

4. **Where does it hook?** `recordFocusComplete` fires at `complete()` time, which means
   `skip()` also counts as a completed session (`timer.ts:222`). Should a *skipped* session
   be able to trigger the pause?

5. **Long-break interaction.** If the task's final session also lands on a long-break
   boundary (`idx % cSessions === 0`), does that change anything?

6. **Precedence.** Pause-at-planned ON plus `autoStart` ON: pause wins (settled). Confirm
   mechanically where that precedence lives, given `autoStart` is read in exactly two lines
   inside `advance()` (`timer.ts:184`, `:195`).

Note this overturns a deliberate existing decision — `electron/taskStore.ts:91-96` says
tasks are never auto-completed at estimate and "keeps counting, e.g. 8/7".
