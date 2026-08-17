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
  activeTaskTitle,
  applyMutation,
  emptyTasksState,
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

if (process.exitCode === 1) {
  console.log('\n✗ One or more task assertions failed.\n')
} else {
  console.log('\n✓ All task assertions passed.\n')
}
