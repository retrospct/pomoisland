// Assertion script: proves the pure task reducer behaves as specified, without
// Electron, without the filesystem, and without a test framework.
//
// electron/taskStore.ts owns persistence and broadcast; src/shared/tasks.ts owns
// the logic. Only the latter is exercised here — it is the seam agreed for the
// task-list effort (see .scratch/task-list-features/spec.md, Testing Decisions).
//
// Mirrors the complete-reason-check.ts / placement-check.ts style: synchronous,
// deterministic, exercising real logic through its public interface.
//
// Run:  node scripts/task-check.ts

import {
  activeTaskAtEstimate,
  activeTaskTitle,
  applyMutation,
  emptyTasksState,
  isAtEstimate,
  normalizeTasksState,
  recordFocusComplete,
} from '../src/shared/tasks.ts'
import type { TasksState } from '../src/shared/types.ts'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TODAY = '2026-08-16'

/** Deterministic id generator so assertions can name the ids they expect. */
function ids(): () => string {
  let n = 0
  return () => `id-${++n}`
}

function pass(msg: string): void {
  console.log(`  PASS  ${msg}`)
}

function fail(msg: string): void {
  console.error(`  FAIL  ${msg}`)
  process.exitCode = 1
}

function assert(condition: boolean, msg: string): void {
  if (condition) pass(msg)
  else fail(msg)
}

function eq(label: string, actual: unknown, expected: unknown): void {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a === e) pass(label)
  else fail(`${label}\n        expected ${e}\n        got      ${a}`)
}

// ---------------------------------------------------------------------------
// Case 1: adding a task
// ---------------------------------------------------------------------------
// Adding to an empty list auto-activates it (there is nothing else to work on),
// and the chosen estimate becomes the default for the next task added (MO-53).
function testAdd(): void {
  console.log('\nCase 1: add')
  const newId = ids()
  const empty = emptyTasksState(TODAY)

  const one = applyMutation(empty, { type: 'add', title: 'Write spec', estimate: 3 }, newId)
  assert(one.tasks.length === 1, `one task after add; got ${one.tasks.length}`)
  eq('added task has the given title and estimate, zero completed, not done', one.tasks[0], {
    id: 'id-1',
    title: 'Write spec',
    estimateSessions: 3,
    completedSessions: 0,
    done: false,
  })
  assert(one.activeTaskId === 'id-1', 'first added task auto-activates')
  assert(one.defaultEstimate === 3, `estimate remembered as default; got ${one.defaultEstimate}`)

  const two = applyMutation(one, { type: 'add', title: 'Second' }, newId)
  assert(two.activeTaskId === 'id-1', 'adding a second task does not steal the active task')
  assert(
    two.tasks[1]?.estimateSessions === 3,
    `omitted estimate falls back to the remembered default; got ${two.tasks[1]?.estimateSessions}`,
  )

  const blank = applyMutation(empty, { type: 'add', title: '   ' }, ids())
  assert(blank.tasks[0]?.title === 'Untitled task', 'a blank title becomes "Untitled task"')

  const zero = applyMutation(empty, { type: 'add', title: 'Clamped', estimate: 0 }, ids())
  assert(zero.tasks[0]?.estimateSessions === 1, 'an estimate below 1 clamps to 1')
}

/** Three incomplete tasks (id-1..id-3), id-1 active, default estimate 1. */
function threeTasks(): TasksState {
  const newId = ids()
  let s = emptyTasksState(TODAY)
  for (const title of ['First', 'Second', 'Third']) {
    s = applyMutation(s, { type: 'add', title }, newId)
  }
  return s
}

/**
 * `state` with `id` marked done, built directly rather than through the update
 * mutation. Used only where the *active* task must end up complete: the done
 * path advances now (Case 9), so no mutation can produce that state, but a
 * tasks.json written before it did — or edited by hand — loads exactly that way
 * and normalizeTasksState doesn't reconcile it.
 */
function withDoneTask(state: TasksState, id: string): TasksState {
  return { ...state, tasks: state.tasks.map((t) => (t.id === id ? { ...t, done: true } : t)) }
}

// ---------------------------------------------------------------------------
// Case 2: deleting a task
// ---------------------------------------------------------------------------
// Deleting the active task must leave something sensible active, or the island
// keeps pointing at a task that no longer exists.
function testDelete(): void {
  console.log('\nCase 2: delete')
  const s = threeTasks()

  const afterActive = applyMutation(s, { type: 'delete', id: 'id-1' }, ids())
  assert(afterActive.tasks.length === 2, `two tasks remain; got ${afterActive.tasks.length}`)
  assert(
    afterActive.activeTaskId === 'id-2',
    `deleting the active task falls through to the first remaining incomplete one; got ${afterActive.activeTaskId}`,
  )

  const afterOther = applyMutation(s, { type: 'delete', id: 'id-3' }, ids())
  assert(afterOther.activeTaskId === 'id-1', 'deleting a non-active task leaves the active one alone')

  const soleTask = applyMutation(emptyTasksState(TODAY), { type: 'add', title: 'Only' }, ids())
  const afterLast = applyMutation(soleTask, { type: 'delete', id: 'id-1' }, ids())
  assert(afterLast.activeTaskId === null, 'deleting the last task leaves nothing active')

  // A completed task can still be the active one (see withDoneTask). Deleting
  // some *other* task must not quietly re-aim it: the fall-through triggers on
  // the active task going missing, not on it being done.
  const activeIsDone = withDoneTask(threeTasks(), 'id-1')
  const afterUnrelated = applyMutation(activeIsDone, { type: 'delete', id: 'id-3' }, ids())
  assert(
    afterUnrelated.activeTaskId === 'id-1',
    `deleting an unrelated task leaves a completed active task alone; got ${afterUnrelated.activeTaskId}`,
  )
}

// ---------------------------------------------------------------------------
// Case 3: update and setActive
// ---------------------------------------------------------------------------
// Done is manual-only: changing an estimate never auto-completes or un-completes
// a task, so it can keep counting past its estimate (e.g. 8/7).
function testUpdateAndSetActive(): void {
  console.log('\nCase 3: update and setActive')
  const s = threeTasks()

  const retitled = applyMutation(s, { type: 'update', id: 'id-2', patch: { title: 'Renamed' } }, ids())
  assert(retitled.tasks[1]?.title === 'Renamed', 'update patches the named task')
  assert(retitled.tasks[0]?.title === 'First', 'update leaves other tasks alone')

  const estimated = applyMutation(
    s,
    { type: 'update', id: 'id-1', patch: { estimateSessions: 9 } },
    ids(),
  )
  assert(estimated.tasks[0]?.estimateSessions === 9, 'update can change an estimate')
  assert(estimated.tasks[0]?.done === false, 'changing an estimate never auto-completes a task')

  const activated = applyMutation(s, { type: 'setActive', id: 'id-3' }, ids())
  assert(activated.activeTaskId === 'id-3', 'setActive selects the named task')

  const cleared = applyMutation(s, { type: 'setActive', id: null }, ids())
  assert(cleared.activeTaskId === null, 'setActive with a null id clears the active task')
}

// ---------------------------------------------------------------------------
// Case 4: clearing completed tasks
// ---------------------------------------------------------------------------
function testClearCompleted(): void {
  console.log('\nCase 4: clearCompleted')
  const s = threeTasks()

  const oneDone = applyMutation(s, { type: 'update', id: 'id-2', patch: { done: true } }, ids())
  const cleared = applyMutation(oneDone, { type: 'clearCompleted' }, ids())
  assert(cleared.tasks.length === 2, `completed tasks are removed; got ${cleared.tasks.length}`)
  assert(cleared.activeTaskId === 'id-1', 'clearing tasks you were not working on keeps the active one')

  // The active task itself being cleared must fall through, same as delete. The
  // done path advances before clearCompleted ever sees it now, so the state is
  // built directly to keep this covering clearCompleted rather than Case 9.
  const activeDone = withDoneTask(s, 'id-1')
  const clearedActive = applyMutation(activeDone, { type: 'clearCompleted' }, ids())
  assert(
    clearedActive.activeTaskId === 'id-2',
    `clearing the active task falls through to the first remaining incomplete one; got ${clearedActive.activeTaskId}`,
  )

  const allDone = ['id-1', 'id-2', 'id-3'].reduce(
    (acc, id) => applyMutation(acc, { type: 'update', id, patch: { done: true } }, ids()),
    s,
  )
  const clearedAll = applyMutation(allDone, { type: 'clearCompleted' }, ids())
  assert(clearedAll.tasks.length === 0, 'clearing every task empties the list')
  assert(clearedAll.activeTaskId === null, 'clearing every task leaves nothing active')
}

// ---------------------------------------------------------------------------
// Case 5: crediting a completed focus session
// ---------------------------------------------------------------------------
// A completed focus block bumps the active task's count and the daily total.
// The task is NOT auto-completed when it reaches its estimate; it just keeps
// counting (e.g. 8/7). Completion is manual (the checkbox) only.
function testFocusComplete(): void {
  console.log('\nCase 5: recordFocusComplete')
  const s = threeTasks()

  const once = recordFocusComplete(s, TODAY)
  assert(once.tasks[0]?.completedSessions === 1, 'the active task is credited')
  assert(once.tasks[1]?.completedSessions === 0, 'other tasks are not credited')
  assert(once.completedToday === 1, `the daily total is credited; got ${once.completedToday}`)

  const twice = recordFocusComplete(once, TODAY)
  assert(twice.tasks[0]?.completedSessions === 2, 'credit accumulates on the same task')
  assert(twice.completedToday === 2, 'the daily total accumulates')

  // Reaching the estimate must not complete the task — deliberate, so a task can
  // read 8/7 rather than silently closing itself.
  const atEstimate = recordFocusComplete(twice, TODAY)
  assert(
    atEstimate.tasks[0]?.completedSessions === 3 && atEstimate.tasks[0]?.done === false,
    'passing the estimate never auto-completes the task',
  )

  const untasked = recordFocusComplete({ ...s, activeTaskId: null }, TODAY)
  assert(
    untasked.tasks.every((t) => t.completedSessions === 0),
    'with no active task, no task is credited',
  )
  assert(untasked.completedToday === 1, 'the daily total is still credited with no active task')

  const tomorrow = recordFocusComplete({ ...once, completedToday: 7 }, '2026-08-17')
  assert(
    tomorrow.completedToday === 1,
    `the daily total resets to 1 on a new date; got ${tomorrow.completedToday}`,
  )
  assert(tomorrow.completedDate === '2026-08-17', 'the recorded date rolls over')
}

// ---------------------------------------------------------------------------
// Case 6: normalizing what was read off disk
// ---------------------------------------------------------------------------
// tasks.json is user-writable and survives app versions, so anything may be in
// it — including nothing at all.
function testNormalize(): void {
  console.log('\nCase 6: normalizeTasksState')

  eq('undefined normalizes to an empty state', normalizeTasksState(undefined, TODAY), emptyTasksState(TODAY))
  eq('a non-object normalizes to an empty state', normalizeTasksState('nonsense', TODAY), emptyTasksState(TODAY))

  const partial = normalizeTasksState({ activeTaskId: 'id-9' }, TODAY)
  assert(Array.isArray(partial.tasks), 'a missing tasks array becomes an empty array')
  assert(partial.activeTaskId === 'id-9', 'persisted fields survive normalization')
  assert(partial.defaultEstimate === 1, 'missing fields fall back to defaults')
  assert(partial.completedDate === TODAY, "a missing date defaults to today's")

  const badTasks = normalizeTasksState({ tasks: 'not an array' }, TODAY)
  assert(badTasks.tasks.length === 0, 'a non-array tasks value becomes an empty array')

  // The top-level scalars need the same treatment as the per-task fields, or the
  // function hardens half its output and passes the rest through. defaultEstimate
  // is the one with teeth: it feeds Math.round() in the add path, so a junk value
  // mints tasks with a NaN estimate.
  const junk = normalizeTasksState(
    { defaultEstimate: 'x', completedToday: 'many', completedDate: 5, activeTaskId: 42 },
    TODAY,
  )
  assert(junk.defaultEstimate === 1, `a junk defaultEstimate falls back to 1; got ${junk.defaultEstimate}`)
  assert(junk.completedToday === 0, `a junk daily total falls back to 0; got ${junk.completedToday}`)
  assert(junk.completedDate === TODAY, "a junk date falls back to today's")
  assert(junk.activeTaskId === null, `a non-string active id becomes null; got ${junk.activeTaskId}`)

  const addedAfterJunk = applyMutation(junk, { type: 'add', title: 'Sane' }, ids())
  assert(
    addedAfterJunk.tasks[0]?.estimateSessions === 1,
    `a task added after a junk defaultEstimate has a real estimate, not NaN; got ${addedAfterJunk.tasks[0]?.estimateSessions}`,
  )
}

// ---------------------------------------------------------------------------
// Case 7: the active task's title
// ---------------------------------------------------------------------------
// The timer mirrors this string; an empty string means no active task.
function testActiveTaskTitle(): void {
  console.log('\nCase 7: activeTaskTitle')
  const s = threeTasks()

  assert(activeTaskTitle(s) === 'First', `the active task's title is returned; got "${activeTaskTitle(s)}"`)
  assert(activeTaskTitle({ ...s, activeTaskId: null }) === '', 'no active task yields an empty string')
  assert(
    activeTaskTitle({ ...s, activeTaskId: 'gone' }) === '',
    'an active id with no matching task yields an empty string',
  )
}

// ---------------------------------------------------------------------------
// Case 8: reading tasks written before the estimateSessions rename
// ---------------------------------------------------------------------------
// The count fields were once estimatePomodoros / completedPomodoros. Old keys
// are read forever and never written back, so the new shape lands on the next
// persist and the migration is self-healing. Without this, an upgraded user's
// tasks arrive with `undefined` where a number belongs and surface as NaN in the
// stepper and the progress bar.
function testCountFieldMigration(): void {
  console.log('\nCase 8: estimateSessions migration')

  const old = normalizeTasksState(
    { tasks: [{ id: 'a', title: 'Old', estimatePomodoros: 5, completedPomodoros: 2, done: false }] },
    TODAY,
  )
  assert(old.tasks[0]?.estimateSessions === 5, `an old estimate key is read; got ${old.tasks[0]?.estimateSessions}`)
  assert(old.tasks[0]?.completedSessions === 2, `an old completed key is read; got ${old.tasks[0]?.completedSessions}`)
  assert(
    !JSON.stringify(old.tasks[0]).includes('Pomodoros'),
    'old keys are dropped, not carried alongside the new ones',
  )

  const current = normalizeTasksState(
    { tasks: [{ id: 'a', title: 'New', estimateSessions: 4, completedSessions: 1, done: false }] },
    TODAY,
  )
  assert(current.tasks[0]?.estimateSessions === 4, 'a new estimate key is read')
  assert(current.tasks[0]?.completedSessions === 1, 'a new completed key is read')

  const both = normalizeTasksState(
    {
      tasks: [
        {
          id: 'a',
          title: 'Both',
          estimateSessions: 4,
          completedSessions: 1,
          estimatePomodoros: 99,
          completedPomodoros: 99,
          done: false,
        },
      ],
    },
    TODAY,
  )
  assert(
    both.tasks[0]?.estimateSessions === 4 && both.tasks[0]?.completedSessions === 1,
    'when both key generations are present, the new one wins',
  )

  const neither = normalizeTasksState({ tasks: [{ id: 'a', title: 'Bare', done: false }] }, TODAY)
  assert(
    neither.tasks[0]?.estimateSessions === 1,
    `a task with no estimate at all defaults to 1, never NaN; got ${neither.tasks[0]?.estimateSessions}`,
  )
  assert(
    neither.tasks[0]?.completedSessions === 0,
    `a task with no completed count at all defaults to 0, never NaN; got ${neither.tasks[0]?.completedSessions}`,
  )

  const garbage = normalizeTasksState({ tasks: [{ id: 'a', title: 'Junk', estimateSessions: 'lots', done: false }] }, TODAY)
  assert(
    garbage.tasks[0]?.estimateSessions === 1,
    'a non-numeric estimate falls back to the default rather than poisoning the bar',
  )

  const malformed = normalizeTasksState(
    { tasks: [null, 'nope', { title: 'No id' }, { id: 'a', title: 'Fine', done: false }] },
    TODAY,
  )
  assert(
    malformed.tasks.length === 1 && malformed.tasks[0]?.id === 'a',
    `entries that are not tasks are dropped, not repaired into id-less ghosts; got ${malformed.tasks.length}`,
  )
}

// ---------------------------------------------------------------------------
// Case 9: a skipped block credits nothing
// ---------------------------------------------------------------------------
// Pressing Next ends the block early, and a block you cut short is not a session
// (CONTEXT.md: "Session — one focus block"). Before this, four taps of the global
// Next shortcut completed a four-session task and earned a milestone ring for
// work nobody did.
//
// Task credit and the daily total get the SAME answer, always: splitting them
// would let a task and the day disagree about the same minute. The
// `creditSkipped` pref restores the old behaviour for people who used Next as a
// "done early" button, and it too moves both counters together.
function testSkippedCredit(): void {
  console.log('\nCase 9: skipped blocks credit nothing')
  const s = threeTasks()

  const elapsed = recordFocusComplete(s, TODAY, { reason: 'elapsed' })
  assert(elapsed.tasks[0]?.completedSessions === 1, 'an elapsed block credits the active task')
  assert(elapsed.completedToday === 1, 'an elapsed block credits the daily total')

  const skipped = recordFocusComplete(s, TODAY, { reason: 'skipped' })
  assert(skipped.tasks[0]?.completedSessions === 0, 'a skipped block credits no task')
  assert(
    skipped.completedToday === 0,
    `a skipped block credits no daily total; got ${skipped.completedToday}`,
  )

  // Repeated skips must stay at zero — the four-taps-completes-a-task case.
  const fourSkips = [1, 2, 3, 4].reduce(
    (acc) => recordFocusComplete(acc, TODAY, { reason: 'skipped' }),
    s,
  )
  assert(
    fourSkips.tasks[0]?.completedSessions === 0 && fourSkips.completedToday === 0,
    'four skips in a row still credit nothing',
  )

  const kept = recordFocusComplete(elapsed, TODAY, { reason: 'skipped' })
  assert(
    kept.tasks[0]?.completedSessions === 1 && kept.completedToday === 1,
    'a skip after a real session leaves earned credit untouched',
  )

  // A skip landing on a new date must not roll the daily counter over either: it
  // is not a completed session, so it is not evidence of activity today.
  const skipTomorrow = recordFocusComplete({ ...elapsed, completedToday: 7 }, '2026-08-17', {
    reason: 'skipped',
  })
  assert(
    skipTomorrow.completedToday === 7 && skipTomorrow.completedDate === TODAY,
    'a skip on a new date neither credits nor rolls the daily counter over',
  )

  // With the pref on, a skip is a session in every respect.
  const credited = recordFocusComplete(s, TODAY, { reason: 'skipped', creditSkipped: true })
  assert(
    credited.tasks[0]?.completedSessions === 1,
    'with the pref on, a skipped block credits the active task',
  )
  assert(
    credited.completedToday === 1,
    `with the pref on, a skipped block credits the daily total; got ${credited.completedToday}`,
  )

  // The pref is about skips only — it must not change elapsed blocks at all.
  const elapsedWithPref = recordFocusComplete(s, TODAY, {
    reason: 'elapsed',
    creditSkipped: true,
  })
  eq('the pref leaves elapsed blocks exactly as they were', elapsedWithPref, elapsed)

  // The default is the strict one: an omitted pref must not silently credit.
  const defaulted = recordFocusComplete(s, TODAY, { reason: 'skipped' })
  eq('an omitted creditSkipped defaults to off', defaulted, skipped)
}

// ---------------------------------------------------------------------------
// Case 10: the active task's lifecycle (ticket 15)
// ---------------------------------------------------------------------------
// Completing the task you are working on hands the active slot to the next
// incomplete task, so the island never claims you are working on something you
// just ticked off. The guard is the interesting half: ticking a task you were
// *not* working on is housekeeping and must not hijack the active slot.
function testActiveTaskLifecycle(): void {
  console.log('\nCase 10: active task lifecycle')
  const s = threeTasks()

  const activeDone = applyMutation(s, { type: 'update', id: 'id-1', patch: { done: true } }, ids())
  assert(
    activeDone.activeTaskId === 'id-2',
    `completing the active task advances to the next incomplete one; got ${activeDone.activeTaskId}`,
  )
  assert(activeDone.tasks[0]?.done === true, 'the completed task is still marked done')

  // The active task is deliberately *not* the first incomplete one here: with
  // id-1 active, a naive unguarded advance would re-aim to id-1 and look correct.
  // Working on id-2 is what separates "left alone" from "recomputed".
  const workingOnSecond = applyMutation(s, { type: 'setActive', id: 'id-2' }, ids())
  const otherDone = applyMutation(
    workingOnSecond,
    { type: 'update', id: 'id-3', patch: { done: true } },
    ids(),
  )
  assert(
    otherDone.activeTaskId === 'id-2',
    `completing a task you were not working on leaves the active one alone; got ${otherDone.activeTaskId}`,
  )

  // Only completion advances. Renaming or re-estimating the active task, or
  // un-completing something, must not re-aim it.
  const renamed = applyMutation(s, { type: 'update', id: 'id-1', patch: { title: 'Renamed' } }, ids())
  assert(renamed.activeTaskId === 'id-1', 'editing the active task does not re-aim it')
  const unDone = applyMutation(withDoneTask(s, 'id-2'), { type: 'update', id: 'id-2', patch: { done: false } }, ids())
  assert(unDone.activeTaskId === 'id-1', 'un-completing a task does not re-aim the active one')

  // Ticking the last one off is the whole point: no active task, rather than the
  // island naming a task you have finished. Nothing is deleted — the list still
  // holds all three, all done.
  const allDone = ['id-1', 'id-2', 'id-3'].reduce(
    (acc, id) => applyMutation(acc, { type: 'update', id, patch: { done: true } }, ids()),
    s,
  )
  assert(
    allDone.activeTaskId === null,
    `completing the last incomplete task leaves nothing active; got ${allDone.activeTaskId}`,
  )
  assert(allDone.tasks.length === 3, 'completing tasks never removes them from the list')

  // The daily total still counts an untasked block; no task is credited. This is
  // what "deselect mid-session and the session credits nothing" means for the
  // task side, and it is the same code path a completed-last-task session takes.
  const untaskedBlock = recordFocusComplete(allDone, TODAY)
  assert(
    untaskedBlock.tasks.every((t) => t.completedSessions === 0),
    'a session finished with no active task credits no task',
  )

  // Picking up a completed task again un-completes it and activates it in ONE
  // mutation. Two in sequence would commit, persist and broadcast a state where
  // the task is incomplete but not yet active — a state no user action produced,
  // and one the renderers would briefly draw.
  const revived = applyMutation(allDone, { type: 'setActive', id: 'id-2' }, ids())
  assert(revived.activeTaskId === 'id-2', 'reactivating a completed task makes it active')
  assert(
    revived.tasks[1]?.done === false,
    'reactivating a completed task un-completes it in the same mutation',
  )
  assert(
    revived.tasks[0]?.done === true && revived.tasks[2]?.done === true,
    'reactivating one completed task leaves the other completed tasks alone',
  )
  assert(
    revived.tasks[1]?.completedSessions === allDone.tasks[1]?.completedSessions,
    'reactivating a task keeps the sessions it already earned',
  )

  // Deselect, the round trip. Which of the two mutations a row click sends is the
  // task list's decision (it sends null for the row that is already active);
  // what the reducer owes is that both halves work and that clearing the active
  // task is *only* that — no task completed, no list edited, nothing to undo.
  const deselected = applyMutation(s, { type: 'setActive', id: null }, ids())
  assert(deselected.activeTaskId === null, 'deselecting leaves no active task')
  eq('deselecting changes nothing else about the list', deselected.tasks, s.tasks)

  const reselected = applyMutation(deselected, { type: 'setActive', id: 'id-3' }, ids())
  assert(reselected.activeTaskId === 'id-3', 'selecting again after a deselect works')
}

// ---------------------------------------------------------------------------
// Case 11: the at-estimate predicate (ticket 18)
// ---------------------------------------------------------------------------
// The stop is DERIVED, never stored (ADR-0008): a pure function of the active
// task's counts and the pause-at-estimate pref, plus — for the renderers — the
// timer's status and mode. Nothing persists it, so there is nothing to clear on
// reset, skip or switch-mode.
//
// At-or-past, not equality: ticket 19's + never raises the estimate, so an
// equality test would fire once at 4/4 and stay silent at 5/4 forever after.
function testAtEstimate(): void {
  console.log('\nCase 11: at-estimate predicate')

  /** id-1 active, `completed` sessions done against an estimate of `estimate`. */
  function at(completed: number, estimate: number): TasksState {
    const s = threeTasks()
    return {
      ...s,
      tasks: s.tasks.map((t) =>
        t.id === 'id-1'
          ? { ...t, completedSessions: completed, estimateSessions: estimate }
          : t,
      ),
    }
  }

  assert(activeTaskAtEstimate(at(4, 4), true), 'true exactly at the estimate (4/4)')
  assert(activeTaskAtEstimate(at(5, 4), true), 'true past the estimate (5/4)')
  assert(activeTaskAtEstimate(at(12, 4), true), 'still true far past the estimate (12/4)')
  assert(!activeTaskAtEstimate(at(3, 4), true), 'false below the estimate (3/4)')
  assert(!activeTaskAtEstimate(at(0, 1), true), 'false on a fresh task (0/1)')

  // No active task: a session can run crediting nothing, and there is no
  // estimate to have reached.
  assert(
    !activeTaskAtEstimate({ ...at(4, 4), activeTaskId: null }, true),
    'false with no active task',
  )
  assert(
    !activeTaskAtEstimate({ ...at(4, 4), activeTaskId: 'gone' }, true),
    'false when the active id matches no task',
  )
  assert(!activeTaskAtEstimate(emptyTasksState(TODAY), true), 'false with an empty list')

  // The pref is the whole off-switch — there is no second "respects Auto-start"
  // control, because that is this pref turned off.
  assert(!activeTaskAtEstimate(at(4, 4), false), 'false with the pref off, even at 4/4')
  assert(!activeTaskAtEstimate(at(12, 4), false), 'false with the pref off, even at 12/4')

  // Only the ACTIVE task's counts matter: another task being over its estimate
  // is not the user's current business.
  const otherOver = {
    ...at(1, 4),
    tasks: at(1, 4).tasks.map((t) =>
      t.id === 'id-3' ? { ...t, completedSessions: 9, estimateSessions: 2 } : t,
    ),
  }
  assert(
    !activeTaskAtEstimate(otherOver, true),
    'false when a task you are NOT working on is over its estimate',
  )

  // Credit lands through recordFocusComplete, so the predicate must flip on the
  // very block that reaches the estimate — that block's credit is applied before
  // the boundary is evaluated.
  const oneShort = at(3, 4)
  assert(!activeTaskAtEstimate(oneShort, true), 'false one session short')
  assert(
    activeTaskAtEstimate(recordFocusComplete(oneShort, TODAY), true),
    'true once the session that reaches the estimate is credited',
  )
  // A skipped block credits nothing (Case 9), so it cannot reach the estimate
  // either — the predicate reads counters and nothing else.
  assert(
    !activeTaskAtEstimate(recordFocusComplete(oneShort, TODAY, { reason: 'skipped' }), true),
    'a skipped block does not reach the estimate, because it credits nothing',
  )

  // Lowering the estimate below the completed count is deliberately NOT
  // special-cased: the predicate simply becomes true, and the stop lands at the
  // next boundary rather than at mutation time.
  const lowered = applyMutation(at(2, 6), { type: 'update', id: 'id-1', patch: { estimateSessions: 2 } }, ids())
  assert(
    activeTaskAtEstimate(lowered, true),
    'lowering an estimate to the completed count makes the predicate true',
  )
  // Reactivating an already over-estimate task is likewise un-special-cased.
  const revivedOver = applyMutation(withDoneTask(at(9, 2), 'id-1'), { type: 'setActive', id: 'id-1' }, ids())
  assert(
    activeTaskAtEstimate(revivedOver, true),
    'reactivating an over-estimate task leaves the predicate true',
  )

  // The full predicate adds the timer half: the stop is a timer sitting IDLE at
  // a FOCUS boundary. This is the shape the renderers read; the timer itself
  // reads the task half only, because the advance branch it is called from *is*
  // the focus boundary.
  const over = at(4, 4)
  assert(isAtEstimate({ status: 'idle', mode: 'focus' }, over, true), 'true when idle at a focus boundary')
  assert(
    !isAtEstimate({ status: 'running', mode: 'focus' }, over, true),
    'false while a focus block is running',
  )
  assert(
    !isAtEstimate({ status: 'paused', mode: 'focus' }, over, true),
    'false while paused — paused means the user pressed pause',
  )
  assert(
    !isAtEstimate({ status: 'complete', mode: 'focus' }, over, true),
    'false during the completion flourish',
  )
  assert(
    !isAtEstimate({ status: 'idle', mode: 'break' }, over, true),
    'false at a break boundary — the break runs as normal',
  )
  assert(
    !isAtEstimate({ status: 'idle', mode: 'focus' }, at(3, 4), true),
    'false below the estimate even when idle at a focus boundary',
  )
  assert(
    !isAtEstimate({ status: 'idle', mode: 'focus' }, over, false),
    'false with the pref off even when idle at a focus boundary',
  )
}

// ---------------------------------------------------------------------------
// Case 12: reorder
// ---------------------------------------------------------------------------
// Reorder is a splice on the stored array — there is no `order` field, so array
// position IS the ordering (ticket 22).
//
// The mutation names its neighbour by **id**, never by index. The rendered list
// is split into incomplete-then-complete, so a rendered index is not a stored
// index, and the two ways to fix that are both worse: translating a rendered
// index inside the reducer would put a rendering decision in the model, and
// having the caller compute a raw index puts the model's layout in the view. Ids
// are stable under both. They also make a stale drop safe — a task completed by a
// finishing session, or deleted from the other window, mid-drag — where an index
// would silently move whichever task had shuffled into that slot.
//
// `beforeId: null` means "last among the incomplete tasks", which is NOT the end
// of the array whenever a completed task sits behind them.
function testReorder(): void {
  console.log('\nCase 12: reorder')
  const ordered = (s: TasksState) => s.tasks.map((t) => t.id)

  const s = threeTasks() // id-1, id-2, id-3 — all incomplete, id-1 active

  const down = applyMutation(s, { type: 'reorder', id: 'id-1', beforeId: 'id-3' }, ids())
  eq('moving the first task before the third lands it second', ordered(down), [
    'id-2',
    'id-1',
    'id-3',
  ])

  const up = applyMutation(s, { type: 'reorder', id: 'id-3', beforeId: 'id-1' }, ids())
  eq('moving the last task before the first lands it first', ordered(up), [
    'id-3',
    'id-1',
    'id-2',
  ])

  const toEnd = applyMutation(s, { type: 'reorder', id: 'id-1', beforeId: null }, ids())
  eq('a null beforeId moves the task to the end', ordered(toEnd), ['id-2', 'id-3', 'id-1'])

  const noop = applyMutation(s, { type: 'reorder', id: 'id-2', beforeId: 'id-2' }, ids())
  eq('dropping a task before itself changes nothing', ordered(noop), ['id-1', 'id-2', 'id-3'])

  const inPlace = applyMutation(s, { type: 'reorder', id: 'id-1', beforeId: 'id-2' }, ids())
  eq('dropping a task back where it started changes nothing', ordered(inPlace), [
    'id-1',
    'id-2',
    'id-3',
  ])

  // The index-translation case, and the reason ids are the interface. Stored order
  // is [id-1, id-2(done), id-3], so the *rendered* incomplete group is
  // [id-1, id-3] — rendered index 1 is stored index 2.
  const withDone = withDoneTask(threeTasks(), 'id-2')
  const acrossDone = applyMutation(withDone, { type: 'reorder', id: 'id-3', beforeId: 'id-1' }, ids())
  eq('reorder addresses stored positions across a completed task', ordered(acrossDone), [
    'id-3',
    'id-1',
    'id-2',
  ])

  // "End of the incomplete group", not "end of the array".
  //
  // Asserted on the incomplete subsequence rather than the raw array, because the
  // raw array is deliberately NOT partitioned: `add` appends, so completing a task
  // in the middle leaves it sitting between two incomplete ones forever. Where a
  // completed task ends up relative to the moved one is therefore unobservable —
  // the view groups by `done` before rendering and firstIncompleteId skips them —
  // and pinning it here would assert an arrangement the app never promised.
  const endWithDone = applyMutation(withDone, { type: 'reorder', id: 'id-1', beforeId: null }, ids())
  eq(
    'a null beforeId means last incomplete, not last overall',
    endWithDone.tasks.filter((t) => !t.done).map((t) => t.id),
    ['id-3', 'id-1'],
  )
  assert(
    endWithDone.tasks.length === 3 && endWithDone.tasks.some((t) => t.id === 'id-2' && t.done),
    'the completed task is still there, wherever it sits',
  )

  // Guards. Each returns the state untouched rather than throwing: a drop is a
  // gesture, and a gesture that lands nowhere is a no-op, not an error.
  const goneSubject = applyMutation(s, { type: 'reorder', id: 'nope', beforeId: 'id-1' }, ids())
  eq('reordering a task that no longer exists is a no-op', ordered(goneSubject), [
    'id-1',
    'id-2',
    'id-3',
  ])

  const goneTarget = applyMutation(s, { type: 'reorder', id: 'id-1', beforeId: 'nope' }, ids())
  eq('dropping before a task that no longer exists is a no-op', ordered(goneTarget), [
    'id-1',
    'id-2',
    'id-3',
  ])

  // Drags are confined to the incomplete group, and the reducer enforces it
  // rather than trusting the view: dropping an incomplete task among the
  // completed ones would imply completing it, which is a different gesture
  // wearing a drag costume.
  const intoDone = applyMutation(withDone, { type: 'reorder', id: 'id-1', beforeId: 'id-2' }, ids())
  eq('an incomplete task cannot be dropped before a completed one', ordered(intoDone), [
    'id-1',
    'id-2',
    'id-3',
  ])

  const movingDone = applyMutation(withDone, { type: 'reorder', id: 'id-2', beforeId: 'id-1' }, ids())
  eq('a completed task cannot be dragged at all', ordered(movingDone), ['id-1', 'id-2', 'id-3'])

  // Reorder moves rows and nothing else. It does re-aim "the next task" for
  // ticket 15's auto-advance and ticket 19's ✓, because both read array order —
  // that is the point of dragging, and it happens without reorder touching
  // activeTaskId at all.
  assert(down.activeTaskId === 'id-1', 'reorder leaves the active task active')
  const reAimed = applyMutation(s, { type: 'reorder', id: 'id-3', beforeId: 'id-1' }, ids())
  const advanced = applyMutation(reAimed, { type: 'update', id: 'id-1', patch: { done: true } }, ids())
  assert(
    advanced.activeTaskId === 'id-3',
    `dragging a task to the top makes it the next one the done-path advances to; got ${advanced.activeTaskId}`,
  )

  // Counts and estimates travel with the row.
  const carried = applyMutation(
    { ...s, tasks: s.tasks.map((t) => (t.id === 'id-1' ? { ...t, completedSessions: 2 } : t)) },
    { type: 'reorder', id: 'id-1', beforeId: null },
    ids(),
  )
  assert(
    carried.tasks[2]?.completedSessions === 2,
    'a moved task keeps its completed sessions',
  )
}

// ---------------------------------------------------------------------------
// Run all cases
// ---------------------------------------------------------------------------
console.log('\nTask reducer check\n' + '-'.repeat(50))
testAdd()
testDelete()
testUpdateAndSetActive()
testClearCompleted()
testFocusComplete()
testNormalize()
testActiveTaskTitle()
testCountFieldMigration()
testSkippedCredit()
testActiveTaskLifecycle()
testAtEstimate()
testReorder()

if (process.exitCode === 1) {
  console.log('\n✗ One or more task assertions failed.\n')
} else {
  console.log('\n✓ All task assertions passed.\n')
}
