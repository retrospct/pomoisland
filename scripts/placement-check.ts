// Assertion script: proves the pure placement derivation (MO-22) groups the
// visible collapsed-island elements into the correct left/below/right clusters,
// honouring layout visibility (split/minimal/compact), per-element slot
// assignment, showDots, and canonical element order.
//
// Mirrors the audio-check.ts / tick-cadence-check.ts style: a synchronous,
// deterministic test that runs in Node without a test framework.
//
// Run:  node scripts/placement-check.ts
//
// The TDD seam is `deriveClusters()` in src/island/placement.ts — a pure
// function with no rendering or Electron deps, so this logic is proven before
// any view code consumes it.

import { deriveClusters } from '../src/island/placement.ts'
import type { IslandPlacement } from '../src/shared/types.ts'

let failures = 0

function eq(label: string, actual: unknown, expected: unknown): void {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a === e) {
    console.log(`  PASS  ${label}`)
  } else {
    failures++
    console.error(`  FAIL  ${label}\n        expected ${e}\n        got      ${a}`)
  }
}

const allRight: IslandPlacement = { ring: 'right', time: 'right', dots: 'right' }

// --- default arrangement: everything right of the notch ---
eq(
  'split + all-right → all three on the right, in order',
  deriveClusters('split', allRight, true),
  {
    left: [],
    below: [],
    right: ['ring', 'time', 'dots'],
  },
)

// --- layout visibility still applies (placement only moves what is visible) ---
eq('minimal hides the ring', deriveClusters('minimal', allRight, true), {
  left: [],
  below: [],
  right: ['time', 'dots'],
})
eq('compact hides the timer numbers', deriveClusters('compact', allRight, true), {
  left: [],
  below: [],
  right: ['ring', 'dots'],
})

// --- showDots gates the dots element ---
eq('showDots=false drops the dots', deriveClusters('split', allRight, false), {
  left: [],
  below: [],
  right: ['ring', 'time'],
})

// --- per-element slots distribute across all three positions ---
eq(
  'mixed slots split across left/below/right',
  deriveClusters('split', { ring: 'left', time: 'below', dots: 'right' }, true),
  { left: ['ring'], below: ['time'], right: ['dots'] },
)

// --- multiple elements on one side keep canonical order (ring, time, dots) ---
eq(
  'all on left preserve canonical order',
  deriveClusters('split', { ring: 'left', time: 'left', dots: 'left' }, true),
  { left: ['ring', 'time', 'dots'], below: [], right: [] },
)
eq(
  'order is canonical regardless of assignment order',
  deriveClusters('split', { dots: 'right', ring: 'right', time: 'right' } as IslandPlacement, true),
  { left: [], below: [], right: ['ring', 'time', 'dots'] },
)

// --- a hidden element's slot is irrelevant ---
eq(
  'minimal: ring slot ignored, time+dots land where assigned',
  deriveClusters('minimal', { ring: 'left', time: 'left', dots: 'right' }, true),
  { left: ['time'], below: [], right: ['dots'] },
)

if (failures > 0) {
  console.error(`\n\u2717 ${failures} placement assertion(s) failed.`)
  process.exit(1)
}
console.log('\n\u2713 All placement assertions passed.')
