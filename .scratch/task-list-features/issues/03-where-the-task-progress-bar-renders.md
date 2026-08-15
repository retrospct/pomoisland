# 03 — Where the task progress bar renders

Type: grilling
Status: open

## Question

The brief says the bar sits "below the 4 global session dots" and should appear in "any
view that has the session dots". Neither is directly expressible today.

`IslandSlot`'s `'below'` means *below the notch*, not below another element, and clusters
are horizontal flex rows (`src/island/placement.ts:21`). There is no vertical-stacking
primitive. And `SessionDots` has **five** call sites, only one of which goes through the
cluster system:

| Site | View | Via clusters? |
|---|---|---|
| `Island.tsx:293` | all collapsed presentations (snapped, faux-notch, floating L1/L2) | yes |
| `Island.tsx:930` | L3Card "Companion" | no |
| `Island.tsx:1083` | CircleCard "Badge" | no |
| `Island.tsx:1315` | Peek | no — and renders unconditionally, ignoring `dots: 'off'` |
| `Island.tsx:1525` | ExpandedBody | no |

Two candidate homes:

- **(a) Inside `SessionDots.tsx`** as a second row of the same container. Reaches all five
  call sites for free. Costs: `SessionDots` stops being purely about dots, and it needs
  task state it doesn't currently receive.
- **(b) A fifth `IslandElement`.** Touches `types.ts:30`, `placement.ts:18`, `derive.ts`,
  the exhaustive `never` switch at `Island.tsx:242`, the `hasContent` guards at 238/1121,
  `store.ts` defaults + `migrateIslandPlacement`, `sections.tsx:1035`, and
  `scripts/placement-check.ts` — **and still misses four of the five call sites.**

Decide the home, then the edges: does the bar appear in Peek (which shows dots even when
placement is `off`)? In the collapsed pill at all, given the width? What happens when
`dots: 'off'` but a task is active — bar with no dots, or nothing?
