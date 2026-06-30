// Pure placement derivation for the collapsed island.
//
// `islandPlacement` controls both VISIBILITY and POSITION of each element: a slot
// of `'off'` hides the element; `'left'`/`'below'`/`'right'` places it in that
// cluster. This module groups the visible elements into left/below/right clusters,
// in canonical element order, with no rendering or Electron/`@shared` value imports
// so it is unit-checkable in plain Node (scripts/placement-check.ts).

import type { IslandElement, IslandPlacement } from '@shared/types'

export interface IslandClusters {
  left: IslandElement[]
  below: IslandElement[]
  right: IslandElement[]
}

// Canonical render order within any cluster.
const ELEMENT_ORDER: readonly IslandElement[] = ['ring', 'status', 'time', 'dots']

/** Group elements into left/below/right clusters by their assigned slot. Off-slotted elements are excluded. */
export function deriveClusters(placement: IslandPlacement): IslandClusters {
  const clusters: IslandClusters = { left: [], below: [], right: [] }
  for (const el of ELEMENT_ORDER) {
    const slot = placement[el]
    if (slot === 'off') continue
    clusters[slot].push(el)
  }
  return clusters
}
