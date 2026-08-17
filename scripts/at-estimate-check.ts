// Assertion script: proves the main-process Timer STOPS at the break → focus
// boundary when the active task has reached its estimate (ticket 18), instead of
// rolling on into the next focus block.
//
// A sibling of complete-reason-check.ts rather than more cases inside it: that
// script is about one thing — whether CompleteEvent.reason tells an elapsed block
// from a skipped one, the seam raiseOnComplete hangs off — while these cases are
// about where advance() lands. One behaviour per script is the shape the rest of
// scripts/ already has (audio, tick cadence, completion reason, placement, tasks,
// notch).
//
// The at-estimate condition itself is NOT tested here — it is a pure predicate
// over task state and lives in scripts/task-check.ts, Case 11. What the Timer
// owes is the boundary: it reads the predicate through an injected getter, in the
// same shape as its prefs getter, so it never imports the task store and stays
// constructible from a plain Node script with two plain functions. That
// injection is what makes this file possible at all.
//
// Run:  node scripts/at-estimate-check.ts

import { Timer } from '../electron/timer.ts'
import type { CompleteEvent } from '../electron/timer.ts'
import type { Prefs, TimerState } from '../src/shared/types.ts'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Only the fields Timer actually reads. Cast rather than spelling out the whole
// Prefs shape so this script doesn't rot every time an unrelated pref is added
// (scripts/ is outside both tsconfig includes, so nothing would catch it).
// autoStart defaults ON here, because "the stop beats Auto-start" is the whole
// point and a default-off would test nothing.
function makePrefs(over: Partial<Prefs> = {}): Prefs {
  return {
    cFocus: 1,
    cShort: 1,
    cLong: 1,
    cSessions: 4,
    autoStart: true,
    ...over,
  } as Prefs
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

/** Drive the timer until it completes, or give up after `max` steps. */
function runToCompletion(timer: Timer, max = 1000): void {
  for (let i = 0; i < max && timer.getState().status === 'running'; i++) timer.tickOnce()
}

/**
 * `complete()` holds for COMPLETE_HOLD_MS before advancing; playPause on a
 * `complete` timer calls the same advance() straight away, which is how the
 * completion-reason script jumps the hold too.
 */
function advancePastHold(timer: Timer): void {
  timer.action({ type: 'playPause' })
}

/** Start a focus block and run it out; leaves the timer in `complete`. */
function runFocusOut(timer: Timer): void {
  timer.action({ type: 'playPause' })
  runToCompletion(timer)
}

/** Run the break out from a timer already advanced into one; leaves `complete`. */
function runBreakOut(timer: Timer): void {
  if (timer.getState().status !== 'running') timer.action({ type: 'playPause' })
  runToCompletion(timer)
}

/**
 * Drive a fresh timer through one focus block and the break after it, landing
 * wherever the break → focus advance puts it. This is the only path to the stop:
 * it is a property of that one branch.
 */
function toFocusBoundary(timer: Timer): TimerState {
  runFocusOut(timer)
  advancePastHold(timer) // → break
  runBreakOut(timer)
  advancePastHold(timer) // → the focus boundary, where the stop lives
  return timer.getState()
}

/** Collect every CompleteEvent a timer emits. */
function record(timer: Timer): CompleteEvent[] {
  const events: CompleteEvent[] = []
  timer.onComplete((e) => events.push(e))
  return events
}

// ---------------------------------------------------------------------------
// Case 1: the stop lands after the break, not at the end of the final focus block
// ---------------------------------------------------------------------------
// Both resume controls start a focus session, so stopping before the break would
// make finishing a task the one path through the app that silently eats a break.
function testStopLandsAfterTheBreak(): void {
  console.log('\nCase 1: the stop lands at the break → focus boundary')
  const timer = new Timer(() => makePrefs(), () => true)

  runFocusOut(timer)
  const atFocusEnd = timer.getState()
  assert(
    atFocusEnd.status === 'complete',
    `the final focus block completes normally; got status '${atFocusEnd.status}'`,
  )
  assert(
    atFocusEnd.mode === 'focus',
    `nothing stops at the end of the focus block; got mode '${atFocusEnd.mode}'`,
  )

  advancePastHold(timer)
  const inBreak = timer.getState()
  assert(inBreak.mode === 'break', `the break still follows the focus block; got '${inBreak.mode}'`)
  assert(
    inBreak.status === 'running',
    `the break runs as normal — the focus → break branch is untouched; got '${inBreak.status}'`,
  )

  runBreakOut(timer)
  advancePastHold(timer)
  const stopped = timer.getState()
  assert(stopped.mode === 'focus', `the stop is at a focus boundary; got '${stopped.mode}'`)
  assert(stopped.status === 'idle', `the stop is idle; got '${stopped.status}'`)
}

// ---------------------------------------------------------------------------
// Case 2: the stop beats Auto-start
// ---------------------------------------------------------------------------
// Precedence is mechanical: the check sits in the break → focus branch before the
// auto-start pref is read. There is no third "respects Auto-start" pref — that is
// pause-at-estimate switched off, which is the control case here.
function testStopBeatsAutoStart(): void {
  console.log('\nCase 2: the stop beats Auto-start')

  const stopping = toFocusBoundary(new Timer(() => makePrefs({ autoStart: true }), () => true))
  assert(
    stopping.status === 'idle',
    `at estimate with autoStart ON, the timer stops; got '${stopping.status}'`,
  )

  const rolling = toFocusBoundary(new Timer(() => makePrefs({ autoStart: true }), () => false))
  assert(
    rolling.status === 'running',
    `below estimate with autoStart ON, the next session still starts; got '${rolling.status}'`,
  )

  // autoStart off already yields idle, so the stop must not be *inferred* from
  // that state — it has to be indistinguishable, which is the point of reusing
  // idle rather than adding a Status.
  const autoStartOff = toFocusBoundary(new Timer(() => makePrefs({ autoStart: false }), () => true))
  assert(
    autoStartOff.status === 'idle',
    `at estimate with autoStart OFF, the timer is idle as usual; got '${autoStartOff.status}'`,
  )
}

// ---------------------------------------------------------------------------
// Case 3: what the stop actually is, and that it can be left
// ---------------------------------------------------------------------------
// No new Status: at the stop the timer is `idle` at a focus boundary, which is
// what `idle` already means. Because it is only that, the global play/pause
// shortcut and the tray item start a session straight out of it — making a global
// control silently inert based on task state is invisible from the background
// context those controls exist for.
function testStopStateAndEscapeHatch(): void {
  console.log('\nCase 3: the stop is a plain idle focus boundary you can play out of')

  const timer = new Timer(() => makePrefs(), () => true)
  const stopped = toFocusBoundary(timer)
  assert(stopped.status === 'idle', `status is 'idle'; got '${stopped.status}'`)
  assert(stopped.mode === 'focus', `mode is 'focus'; got '${stopped.mode}'`)
  assert(stopped.isLongBreak === false, 'the long-break flag is cleared, as at any focus boundary')
  assert(
    stopped.total === 60 && stopped.remaining === 60,
    `a whole focus block is queued up, not a part-spent one; got ${stopped.remaining}/${stopped.total}`,
  )

  timer.action({ type: 'playPause' })
  const played = timer.getState()
  assert(
    played.status === 'running' && played.mode === 'focus',
    `play from the stop starts a focus session; got '${played.status}'/'${played.mode}'`,
  )

  // Next/skip out of the stop is today's from-idle skip, unchanged: it completes
  // as 'skipped' (crediting nothing) and advances to a break.
  const skipper = new Timer(() => makePrefs(), () => true)
  toFocusBoundary(skipper)
  const events = record(skipper)
  skipper.action({ type: 'skip' })
  assert(
    events.length === 1 && events[0]?.reason === 'skipped',
    `Next from the stop reports 'skipped'; got ${JSON.stringify(events.map((e) => e.reason))}`,
  )
  advancePastHold(skipper)
  assert(
    skipper.getState().mode === 'break',
    `Next from the stop advances to a break as it always did; got '${skipper.getState().mode}'`,
  )
}

// ---------------------------------------------------------------------------
// Case 4: the completion path is untouched
// ---------------------------------------------------------------------------
// The flourish, the sound, the notification and the bring-to-front all hang off
// the completion events. Suppressing them would make the last session of a task
// the only one that isn't celebrated. The single change is that the advance the
// hold schedules lands in the stop instead of starting the next block.
function testCompletionPathUntouched(): void {
  console.log('\nCase 4: the completion events still fire at the stop')

  const timer = new Timer(() => makePrefs(), () => true)
  const events = record(timer)
  const focusReasons: string[] = []
  timer.onFocusComplete((e) => focusReasons.push(e.reason))

  toFocusBoundary(timer)

  assert(events.length === 2, `both blocks completed (focus + break); got ${events.length}`)
  eq(
    'the final focus session and the break both report an elapsed completion',
    events.map((e) => `${e.finishedMode}:${e.reason}`),
    ['focus:elapsed', 'break:elapsed'],
  )
  eq('the focus-complete hook fires once for the final session', focusReasons, ['elapsed'])
}

// ---------------------------------------------------------------------------
// Case 5: a long-break boundary changes nothing
// ---------------------------------------------------------------------------
// cSessions: 1 makes every break the long one. Nothing needs handling, because
// the focus → break branch is untouched: by the time the stop is evaluated the
// break has already run and its length was never relevant.
function testLongBreakBoundary(): void {
  console.log('\nCase 5: a long-break boundary changes nothing')

  const timer = new Timer(() => makePrefs({ cSessions: 1 }), () => true)
  runFocusOut(timer)
  advancePastHold(timer)
  const inBreak = timer.getState()
  assert(inBreak.isLongBreak === true, 'the break after this session is the long one')
  assert(inBreak.total === 60, `the long break is the long-break length; got ${inBreak.total}`)
  assert(inBreak.status === 'running', 'the long break still auto-starts')

  runBreakOut(timer)
  advancePastHold(timer)
  const stopped = timer.getState()
  assert(
    stopped.mode === 'focus' && stopped.status === 'idle',
    `the stop still lands after the long break; got '${stopped.status}'/'${stopped.mode}'`,
  )
  assert(stopped.isLongBreak === false, 'the long-break flag is cleared at the stop')
}

// ---------------------------------------------------------------------------
// Case 6: the predicate is read at the boundary, never earlier
// ---------------------------------------------------------------------------
// Evaluating only at the focus boundary is what keeps the estimate stepper and
// Settings structurally unable to stop a running timer: whatever the predicate
// said while the block was running is never consulted.
function testEvaluatedAtTheBoundaryOnly(): void {
  console.log('\nCase 6: the predicate is read at the boundary, not earlier')

  // False all through the focus block and the break, true only by the boundary
  // (the shape of a session that reaches the estimate as it completes).
  let becomesTrue = false
  const rising = new Timer(() => makePrefs(), () => becomesTrue)
  runFocusOut(rising)
  advancePastHold(rising)
  runBreakOut(rising)
  becomesTrue = true
  advancePastHold(rising)
  assert(
    rising.getState().status === 'idle',
    `a predicate true at the boundary stops the timer; got '${rising.getState().status}'`,
  )

  // True while the block runs, false by the boundary — an estimate raised
  // mid-session. It must roll on, and above all must not have stopped anything
  // mid-block.
  let becomesFalse = true
  const falling = new Timer(() => makePrefs(), () => becomesFalse)
  falling.action({ type: 'playPause' })
  falling.tickOnce()
  assert(
    falling.getState().status === 'running',
    'a true predicate never interrupts a running block',
  )
  runToCompletion(falling)
  advancePastHold(falling)
  assert(falling.getState().mode === 'break', 'a true predicate never interferes with the break')
  runBreakOut(falling)
  becomesFalse = false
  advancePastHold(falling)
  assert(
    falling.getState().status === 'running',
    `a predicate false by the boundary rolls on; got '${falling.getState().status}'`,
  )
}

// ---------------------------------------------------------------------------
// Case 7: reset and switch-mode leave no residue
// ---------------------------------------------------------------------------
// There is nothing to leave: the stop is derived, so these paths clear it by
// simply moving the timer somewhere the predicate is not consulted. The proof is
// that a timer reset from the stop is byte-identical to one reset from anywhere
// else — if a fifth Status or a stored flag existed, it would show up here.
function testNoResidue(): void {
  console.log('\nCase 7: reset and switch-mode leave no residue')

  const stopped = new Timer(() => makePrefs(), () => true)
  toFocusBoundary(stopped)
  stopped.action({ type: 'reset' })

  const untouched = new Timer(() => makePrefs(), () => true)
  untouched.action({ type: 'reset' })
  eq('a reset from the stop is indistinguishable from any other reset', stopped.getState(), untouched.getState())
  assert(stopped.getState().sessionIndex === 0, 'reset from the stop rewinds the round')

  const switching = new Timer(() => makePrefs(), () => true)
  toFocusBoundary(switching)
  switching.action({ type: 'switchMode' })
  const switched = switching.getState()
  assert(
    switched.mode === 'break' && switched.status === 'idle',
    `switch-mode from the stop moves to an idle break; got '${switched.status}'/'${switched.mode}'`,
  )
  switching.action({ type: 'playPause' })
  assert(switching.getState().status === 'running', 'nothing is wedged: that break can be started')
}

// ---------------------------------------------------------------------------
// Case 8: with no getter, or a false one, this is today's app exactly
// ---------------------------------------------------------------------------
// The getter is optional so the other check scripts keep constructing a Timer
// with prefs alone; the default has to be the old behaviour rather than a stop
// nobody asked for.
function testDefaultIsTodaysBehaviour(): void {
  console.log("\nCase 8: no getter is today's behaviour")

  const noGetter = toFocusBoundary(new Timer(() => makePrefs({ autoStart: true })))
  assert(
    noGetter.status === 'running',
    `a Timer built without the getter auto-starts as before; got '${noGetter.status}'`,
  )

  const noGetterNoAuto = toFocusBoundary(new Timer(() => makePrefs({ autoStart: false })))
  assert(
    noGetterNoAuto.status === 'idle',
    `and still respects autoStart off; got '${noGetterNoAuto.status}'`,
  )

  // A never-true predicate must reproduce the no-getter timer exactly, state for
  // state, over a whole round trip.
  const withFalse = toFocusBoundary(new Timer(() => makePrefs({ autoStart: true }), () => false))
  eq('a never-true predicate changes no timer state at all', withFalse, noGetter)
}

// ---------------------------------------------------------------------------
// Run all cases
// ---------------------------------------------------------------------------
console.log('\nAt-estimate stop check — 8 cases\n' + '-'.repeat(50))
testStopLandsAfterTheBreak()
testStopBeatsAutoStart()
testStopStateAndEscapeHatch()
testCompletionPathUntouched()
testLongBreakBoundary()
testEvaluatedAtTheBoundaryOnly()
testNoResidue()
testDefaultIsTodaysBehaviour()

if (process.exitCode === 1) {
  console.log('\n✗ One or more at-estimate assertions failed.\n')
} else {
  console.log('\n✓ All at-estimate assertions passed.\n')
}
