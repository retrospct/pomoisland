// Pure placement derivation for the collapsed island (MO-22).
//
// `layout` controls which elements are VISIBLE (split = all, minimal = no ring,
// compact = no time); `islandPlacement` controls WHERE each visible element sits
// relative to the notch. This module groups the visible elements into left /
// below / right clusters, in canonical element order, with no rendering or
// Electron/`@shared` value imports so it is unit-checkable in plain Node
// (scripts/placement-check.ts) — the TDD seam for this feature.

import type { IslandElement, IslandPlacement, IslandSlot, Layout } from '@shared/types'

export interface IslandClusters {
  left: IslandElement[]
  below: IslandElement[]
  right: IslandElement[]
}

// Canonical render order within any cluster.
const ELEMENT_ORDER: readonly IslandElement[] = ['ring', 'time', 'dots']

/** Which elements a layout shows. Mirrors the legacy showRing/showTimeText model. */
export function visibleElements(layout: Layout, showDots: boolean): Set<IslandElement> {
  const visible = new Set<IslandElement>()
  if (layout !== 'minimal') visible.add('ring') // minimal hides the ring
  if (layout !== 'compact') visible.add('time') // compact hides the timer numbers
  if (showDots) visible.add('dots')
  return visible
}

/** Group the visible elements into left/below/right clusters by their assigned slot. */
export function deriveClusters(
  layout: Layout,
  placement: IslandPlacement,
  showDots: boolean,
): IslandClusters {
  const visible = visibleElements(layout, showDots)
  const clusters: IslandClusters = { left: [], below: [], right: [] }
  for (const el of ELEMENT_ORDER) {
    if (!visible.has(el)) continue
    const slot: IslandSlot = placement[el]
    clusters[slot].push(el)
  }
  return clusters
}
