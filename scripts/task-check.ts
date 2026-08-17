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
    estimatePomodoros: 3,
    completedPomodoros: 0,
    done: false,
  })
  assert(one.activeTaskId === 'id-1', 'first added task auto-activates')
  assert(one.defaultEstimate === 3, `estimate remembered as default; got ${one.defaultEstimate}`)

  const two = applyMutation(one, { type: 'add', title: 'Second' }, newId)
  assert(two.activeTaskId === 'id-1', 'adding a second task does not steal the active task')
  assert(
    two.tasks[1]?.estimatePomodoros === 3,
    `omitted estimate falls back to the remembered default; got ${two.tasks[1]?.estimatePomodoros}`,
  )

  const blank = applyMutation(empty, { type: 'add', title: '   ' }, ids())
  assert(blank.tasks[0]?.title === 'Untitled task', 'a blank title becomes "Untitled task"')

  const zero = applyMutation(empty, { type: 'add', title: 'Clamped', estimate: 0 }, ids())
  assert(zero.tasks[0]?.estimatePomodoros === 1, 'an estimate below 1 clamps to 1')
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
    { type: 'update', id: 'id-1', patch: { estimatePomodoros: 9 } },
    ids(),
  )
  assert(estimated.tasks[0]?.estimatePomodoros === 9, 'update can change an estimate')
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

  // The active task itself being cleared must fall through, same as delete.
  const activeDone = applyMutation(s, { type: 'update', id: 'id-1', patch: { done: true } }, ids())
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
  assert(once.tasks[0]?.completedPomodoros === 1, 'the active task is credited')
  assert(once.tasks[1]?.completedPomodoros === 0, 'other tasks are not credited')
  assert(once.completedToday === 1, `the daily total is credited; got ${once.completedToday}`)

  const twice = recordFocusComplete(once, TODAY)
  assert(twice.tasks[0]?.completedPomodoros === 2, 'credit accumulates on the same task')
  assert(twice.completedToday === 2, 'the daily total accumulates')

  // Reaching the estimate must not complete the task — deliberate, so a task can
  // read 8/7 rather than silently closing itself.
  const atEstimate = recordFocusComplete(twice, TODAY)
  assert(
    atEstimate.tasks[0]?.completedPomodoros === 3 && atEstimate.tasks[0]?.done === false,
    'passing the estimate never auto-completes the task',
  )

  const untasked = recordFocusComplete({ ...s, activeTaskId: null }, TODAY)
  assert(
    untasked.tasks.every((t) => t.completedPomodoros === 0),
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

if (process.exitCode === 1) {
  console.log('\n✗ One or more task assertions failed.\n')
} else {
  console.log('\n✓ All task assertions passed.\n')
}
