// Completion ("done") ripple-ring definitions, ported verbatim from
// design-reference/project/RippleConcept.dc.html. Shared by the island's
// CompletionFx and the Settings "Done animation" live preview so the swatch
// the user picks matches exactly what fires on the island.

import type { Ripple } from './types'

export interface RippleRing {
  /** Peak opacity. */
  op: number
  /** Max scale at the end of the expand. */
  sc: number
  /** Animation duration, seconds. */
  dur: number
  /** Start delay, seconds. */
  delay: number
  /** Border width, px. */
  w: number
  /** Use the brighter accent tint for this ring. */
  bright: boolean
}

export const RIPPLE_DEFS: Record<Ripple, RippleRing[]> = {
  burst: [
    { op: 0.92, sc: 2.0, dur: 2.6, delay: 0, w: 2.5, bright: true },
    { op: 0.62, sc: 2.12, dur: 2.6, delay: 0.34, w: 2, bright: false },
    { op: 0.4, sc: 2.22, dur: 2.6, delay: 0.68, w: 1.5, bright: false },
  ],
  echo: [
    { op: 0.95, sc: 2.3, dur: 3.4, delay: 0, w: 2, bright: true },
    { op: 0.5, sc: 2.3, dur: 3.4, delay: 0.85, w: 2, bright: false },
    { op: 0.26, sc: 2.3, dur: 3.4, delay: 1.7, w: 1.5, bright: false },
  ],
  heartbeat: [
    { op: 0.98, sc: 1.95, dur: 3.0, delay: 0, w: 2.5, bright: true },
    { op: 0.7, sc: 2.05, dur: 3.0, delay: 0.2, w: 2, bright: false },
  ],
  bloom: [{ op: 0.85, sc: 2.45, dur: 2.8, delay: 0, w: 3, bright: true }],
}
