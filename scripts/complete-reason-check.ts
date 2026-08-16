// Assertion script: proves that the main-process Timer distinguishes a block
// whose clock RAN OUT from one the user SKIPPED, via CompleteEvent.reason.
//
// This is the seam the "bring timer to front when time ends" behavior
// (Prefs.raiseOnComplete, electron/raiseOnComplete.ts) hangs off: a manual
// Next/skip must not raise the island, because Next is a global shortcut meant
// for background use and would otherwise un-hide an island the user
// deliberately hid. Both paths funnel through the same private complete(), so
// nothing but `reason` tells them apart — hence a test.
//
// Mirrors the tick-cadence-check.ts style: synchronous, deterministic, no test
// framework, exercising real Timer logic via `tickOnce()`.
//
// Run:  node scripts/complete-reason-check.ts

import { Timer } from '../electron/timer.ts'
import type { CompleteEvent } from '../electron/timer.ts'
import type { Prefs } from '../src/shared/types.ts'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Only the fields Timer actually reads. Cast rather than spelling out the whole
// Prefs shape so this script doesn't rot every time an unrelated pref is added
// (scripts/ is outside both tsconfig includes, so nothing would catch it).
function makePrefs(over: Partial<Prefs> = {}): Prefs {
  return {
    cFocus: 1,
    cShort: 5,
    cLong: 15,
    cSessions: 4,
    autoStart: false,
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

/** Drive the timer until it completes, or give up after `max` steps. */
function runToCompletion(timer: Timer, max = 1000): void {
  for (let i = 0; i < max && timer.getState().status === 'running'; i++) timer.tickOnce()
}

/** Collect every CompleteEvent a timer emits. */
function record(timer: Timer): CompleteEvent[] {
  const events: CompleteEvent[] = []
  timer.onComplete((e) => events.push(e))
  return events
}

// ---------------------------------------------------------------------------
// Case 1: the clock running out reports reason 'elapsed'
// ---------------------------------------------------------------------------
function testElapsedFocus(): void {
  console.log("\nCase 1: focus block runs out → reason 'elapsed'")
  const timer = new Timer(() => makePrefs())
  const events = record(timer)
  timer.action({ type: 'playPause' })
  runToCompletion(timer)

  assert(events.length === 1, `expected exactly 1 complete event; got ${events.length}`)
  assert(events[0]?.reason === 'elapsed', `expected reason 'elapsed'; got '${events[0]?.reason}'`)
  assert(
    events[0]?.finishedMode === 'focus',
    `expected finishedMode 'focus'; got '${events[0]?.finishedMode}'`,
  )
}

// ---------------------------------------------------------------------------
// Case 2: a manual skip reports reason 'skipped'
// ---------------------------------------------------------------------------
function testSkippedFocus(): void {
  console.log("\nCase 2: user presses Next → reason 'skipped'")
  const timer = new Timer(() => makePrefs())
  const events = record(timer)
  timer.action({ type: 'playPause' })
  timer.action({ type: 'skip' })

  assert(events.length === 1, `expected exactly 1 complete event; got ${events.length}`)
  assert(events[0]?.reason === 'skipped', `expected reason 'skipped'; got '${events[0]?.reason}'`)
}

// ---------------------------------------------------------------------------
// Case 3: skipping an idle (never-started) block still reports 'skipped'
// ---------------------------------------------------------------------------
// Next is a global shortcut, so it can land on a timer that was never started.
function testSkipFromIdle(): void {
  console.log("\nCase 3: Next on an idle timer → reason 'skipped'")
  const timer = new Timer(() => makePrefs())
  const events = record(timer)
  timer.action({ type: 'skip' })

  assert(events.length === 1, `expected exactly 1 complete event; got ${events.length}`)
  assert(events[0]?.reason === 'skipped', `expected reason 'skipped'; got '${events[0]?.reason}'`)
}

// ---------------------------------------------------------------------------
// Case 4: a break block running out also reports 'elapsed'
// ---------------------------------------------------------------------------
// raiseOnComplete fires on EVERY completion, focus and break alike, so the
// break path must carry the same reason.
function testElapsedBreak(): void {
  console.log("\nCase 4: break block runs out → reason 'elapsed' + finishedMode 'break'")
  const timer = new Timer(() => makePrefs({ cShort: 1, autoStart: true }))
  const events = record(timer)
  timer.action({ type: 'playPause' })
  runToCompletion(timer) // focus completes

  // complete() holds for COMPLETE_HOLD_MS before advance(); jump straight there.
  timer.action({ type: 'playPause' }) // status 'complete' → advance()
  const afterAdvance = timer.getState()
  assert(afterAdvance.mode === 'break', `expected mode 'break' after advance; got '${afterAdvance.mode}'`)

  if (afterAdvance.status !== 'running') timer.action({ type: 'playPause' })
  runToCompletion(timer)

  const breakEvent = events.at(-1)
  assert(events.length === 2, `expected 2 complete events (focus + break); got ${events.length}`)
  assert(
    breakEvent?.finishedMode === 'break',
    `expected finishedMode 'break'; got '${breakEvent?.finishedMode}'`,
  )
  assert(breakEvent?.reason === 'elapsed', `expected reason 'elapsed'; got '${breakEvent?.reason}'`)
}

// ---------------------------------------------------------------------------
// Run all cases
// ---------------------------------------------------------------------------
console.log('\nCompletion-reason check — 4 cases\n' + '-'.repeat(50))
testElapsedFocus()
testSkippedFocus()
testSkipFromIdle()
testElapsedBreak()

if (process.exitCode === 1) {
  console.log('\n✗ One or more completion-reason assertions failed.\n')
} else {
  console.log('\n✓ All completion-reason assertions passed.\n')
}
