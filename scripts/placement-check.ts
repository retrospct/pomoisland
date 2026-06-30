// Assertion script: proves the pure placement derivation groups the
// collapsed-island elements into the correct left/below/right clusters,
// honouring per-element slot assignment (including 'off') and canonical
// element order.
//
// Mirrors the audio-check.ts / tick-cadence-check.ts style: a synchronous,
// deterministic test that runs in Node without a test framework.
//
// Run:  npx tsx scripts/placement-check.ts

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

const defaultPlacement: IslandPlacement = {
  ring: 'off',
  status: 'below',
  time: 'below',
  dots: 'below',
}

// --- default: ring off, status/time/dots below the notch ---
eq(
  'default: ring off, status+time+dots below in canonical order',
  deriveClusters(defaultPlacement),
  { left: [], below: ['status', 'time', 'dots'], right: [] },
)

// --- off slot hides an element ---
eq(
  'off hides an element',
  deriveClusters({ ring: 'off', status: 'off', time: 'below', dots: 'below' }),
  { left: [], below: ['time', 'dots'], right: [] },
)

// --- all elements off → empty clusters ---
eq(
  'all off → empty clusters',
  deriveClusters({ ring: 'off', status: 'off', time: 'off', dots: 'off' }),
  { left: [], below: [], right: [] },
)

// --- per-element slots distribute across all three positions ---
eq(
  'mixed slots: ring left, status below, time right, dots right',
  deriveClusters({ ring: 'left', status: 'below', time: 'right', dots: 'right' }),
  { left: ['ring'], below: ['status'], right: ['time', 'dots'] },
)

// --- multiple elements on one side keep canonical order (ring, status, time, dots) ---
eq(
  'all on right preserve canonical order',
  deriveClusters({ ring: 'right', status: 'right', time: 'right', dots: 'right' }),
  { left: [], below: [], right: ['ring', 'status', 'time', 'dots'] },
)
eq(
  'all on left preserve canonical order',
  deriveClusters({ ring: 'left', status: 'left', time: 'left', dots: 'left' }),
  { left: ['ring', 'status', 'time', 'dots'], below: [], right: [] },
)

// --- status and time can be placed independently ---
eq(
  'status left, time right, rest off',
  deriveClusters({ ring: 'off', status: 'left', time: 'right', dots: 'off' }),
  { left: ['status'], below: [], right: ['time'] },
)

// --- canonical order is ring, status, time, dots regardless of object key order ---
eq(
  'order is canonical regardless of assignment order',
  deriveClusters({ dots: 'right', ring: 'right', time: 'right', status: 'right' } as IslandPlacement),
  { left: [], below: [], right: ['ring', 'status', 'time', 'dots'] },
)

if (failures > 0) {
  console.error(`\n✗ ${failures} placement assertion(s) failed.`)
  process.exit(1)
}
console.log('\n✓ All placement assertions passed.')
