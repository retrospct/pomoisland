// Assertion script: proves that the main-process Timer emits exactly one `tick`
// event per second of elapsed focus time, including across pause/resume and reset.
//
// Mirrors the audio-check.ts style: a synchronous, deterministic test that runs in
// Node without a test framework, exercising real Timer logic via `tickOnce()`.
//
// Run:  node scripts/tick-cadence-check.ts
//
// The TDD seam is `tickOnce()` on the Timer class, which advances the timer by one
// TICK_MS (250 ms) step synchronously, bypassing the real setInterval.  The whole-
// second-crossing logic lives entirely in `electron/timer.ts`; this script proves
// that logic is correct before any IPC or renderer code is involved.

import { Timer } from '../electron/timer.ts'
import type { Prefs } from '../src/shared/types.ts'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePrefs(focusMinutes = 1): Prefs {
  return {
    preset: 'classic',
    cFocus: focusMinutes,
    cShort: 5,
    cLong: 15,
    cSessions: 4,
    dailyGoal: 8,
    autoStart: false,
    dnd: false,
    launchLogin: false,
    messages: true,
    hideShare: false,
    pauseIdle: false,
    sound: 'chime',
    volume: 80,
    tick: 'soft',
    notify: false,
    accent: 'teal',
    theme: 'dark',
    timerStyle: 'circular',
    layout: 'split',
    showDots: true,
    ripple: 'burst',
    alwaysTop: true,
    magnetic: true,
    hoverRetractMs: 200,
    expandRetractMs: 1000,
  }
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

// ---------------------------------------------------------------------------
// Case 1: Steady 1-tick/second cadence over 4 seconds
// ---------------------------------------------------------------------------
// Starting from remaining = 60s (cFocus=1), drive 16 ticks (= 4 × 4 ticks/second).
// Each second = 4 × 250ms steps.  Expect exactly 4 tick events.
function testSteadyCadence(): void {
  console.log('\nCase 1: steady 4-second cadence')
  const timer = new Timer(() => makePrefs(1))
  let ticks = 0
  timer.onTick(() => ticks++)
  timer.action({ type: 'playPause' }) // running
  for (let i = 0; i < 16; i++) timer.tickOnce()
  assert(ticks === 4, `expected 4 ticks for 4 seconds; got ${ticks}`)
}

// ---------------------------------------------------------------------------
// Case 2: No ticks fired during pause
// ---------------------------------------------------------------------------
// Run 2 seconds (8 ticks), pause, drive 4 more (1 second), resume, drive 8 more (2s).
// Expect 4 total ticks (2 before pause + 2 after resume), not 5.
function testNoneWhilePaused(): void {
  console.log('\nCase 2: no ticks during pause')
  const timer = new Timer(() => makePrefs(1))
  let ticks = 0
  timer.onTick(() => ticks++)
  timer.action({ type: 'playPause' }) // running

  for (let i = 0; i < 8; i++) timer.tickOnce() // 2 seconds → 2 ticks
  const ticksAtPause = ticks

  timer.action({ type: 'playPause' }) // pause
  for (let i = 0; i < 4; i++) timer.tickOnce() // paused — should not advance remaining
  const ticksDuringPause = ticks - ticksAtPause

  timer.action({ type: 'playPause' }) // resume
  for (let i = 0; i < 8; i++) timer.tickOnce() // 2 more seconds → 2 more ticks

  assert(ticksAtPause === 2, `expected 2 ticks before pause; got ${ticksAtPause}`)
  assert(ticksDuringPause === 0, `expected 0 ticks while paused; got ${ticksDuringPause}`)
  assert(ticks === 4, `expected 4 total ticks after resume; got ${ticks}`)
}

// ---------------------------------------------------------------------------
// Case 3: Reset clears state — no phantom ticks after reset
// ---------------------------------------------------------------------------
// Run 2 seconds, reset, then run 4 seconds.  Expect 4 ticks (not 6).
function testResetClearsTicks(): void {
  console.log('\nCase 3: reset clears tick state')
  const timer = new Timer(() => makePrefs(1))
  let ticks = 0
  timer.onTick(() => ticks++)
  timer.action({ type: 'playPause' }) // running

  for (let i = 0; i < 8; i++) timer.tickOnce() // 2 seconds → 2 ticks
  timer.action({ type: 'reset' }) // idle, remaining back to 60

  timer.action({ type: 'playPause' }) // running again
  for (let i = 0; i < 16; i++) timer.tickOnce() // 4 seconds → 4 more ticks

  assert(ticks === 6, `expected 6 total ticks (2 + 4); got ${ticks}`)
}

// ---------------------------------------------------------------------------
// Case 4: Break mode — no ticks during a break
// ---------------------------------------------------------------------------
// Switch to break mode, run 4 seconds.  Expect 0 ticks.
function testNoTicksDuringBreak(): void {
  console.log('\nCase 4: no ticks during break mode')
  const timer = new Timer(() => makePrefs(1))
  let ticks = 0
  timer.onTick(() => ticks++)
  timer.action({ type: 'switchMode' }) // switch to break (idle)
  timer.action({ type: 'playPause' }) // running
  for (let i = 0; i < 16; i++) timer.tickOnce() // 4 seconds
  assert(ticks === 0, `expected 0 ticks during break; got ${ticks}`)
}

// ---------------------------------------------------------------------------
// Case 5: Exactly one tick per second — not two, not zero — at each boundary
// ---------------------------------------------------------------------------
// Verify tick fires exactly when `remaining` lands on a whole-second value
// (X.25 → X.0), aligned with the countdown display, not 750ms early.
function testBoundaryPrecision(): void {
  console.log('\nCase 5: tick fires at whole-second boundary, aligned with display')
  const timer = new Timer(() => makePrefs(1))
  const tickAtStep: number[] = []
  let step = 0
  timer.onTick(() => tickAtStep.push(step))
  timer.action({ type: 'playPause' }) // running

  // Drive 8 steps (2 seconds).  Ticks should fire at steps 4 and 8.
  // Starting remaining = 60.0; using Math.ceil:
  // step 1: prev=60.0, rem=59.75  ceil(59.75)=60, ceil(60.0)=60  → no tick
  // step 2: prev=59.75, rem=59.5  ceil(59.5)=60, ceil(59.75)=60  → no tick
  // step 3: prev=59.5, rem=59.25  ceil(59.25)=60, ceil(59.5)=60   → no tick
  // step 4: prev=59.25, rem=59.0  ceil(59.0)=59 < ceil(59.25)=60  → TICK at step 4
  // step 5: prev=59.0, rem=58.75  ceil(58.75)=59, ceil(59.0)=59   → no tick
  // step 6-7: no tick
  // step 8: prev=58.25, rem=58.0  ceil(58.0)=58 < ceil(58.25)=59  → TICK at step 8

  for (let i = 1; i <= 8; i++) {
    step = i
    timer.tickOnce()
  }

  assert(tickAtStep.length === 2, `expected 2 ticks in 8 steps; got ${tickAtStep.length} at steps ${tickAtStep.join(',')}`)
  assert(tickAtStep[0] === 4, `first tick expected at step 4 (1.0s elapsed); got ${tickAtStep[0]}`)
  assert(tickAtStep[1] === 8, `second tick expected at step 8 (2.0s elapsed); got ${tickAtStep[1]}`)
}

// ---------------------------------------------------------------------------
// Run all cases
// ---------------------------------------------------------------------------
console.log('\nTick cadence check — 5 cases\n' + '-'.repeat(50))
testSteadyCadence()
testNoneWhilePaused()
testResetClearsTicks()
testNoTicksDuringBreak()
testBoundaryPrecision()

if (process.exitCode === 1) {
  console.log('\n✗ One or more cadence assertions failed.\n')
} else {
  console.log('\n✓ All tick-cadence assertions passed.\n')
}
