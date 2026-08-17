# 03 — Where the task progress bar renders

Type: grilling
Status: open

**Settled by ticket 05 (closed 2026-08-16):** with no active task the bar **hides entirely** —
not an empty track. An empty track promises a thing that isn't there, and it would sit
directly beneath the global session dots, which *are* still counting, implying the two are
related when one is inert. This answers the second half of Q3's "what happens when `dots:
'off'` but a task is active" only in the no-task direction; the `dots: 'off'` case is still
open.

**Correction to the table below:** `displayTask` renders in **four** places, not five —
floating **L2** only (`Island.tsx:1176`, `:1255`), **Peek** (`:1337`) and **ExpandedBody**
(`:1567`). L1, **L3Card**, **CircleCard** and the snapped collapsed pill carry no task text
at all. The `SessionDots` call-site table is still accurate; the two lists are not the same
list, which is itself part of this ticket's problem.

## Question

The brief says the bar sits "below the 4 global session dots" and should appear in "any
view that has the session dots". Neither is directly expressible today.

`IslandSlot`'s `'below'` means *below the notch*, not below another element, and clusters
are horizontal flex rows (`src/island/placement.ts:21`). There is no vertical-stacking
primitive. And `SessionDots` has **five** call sites, only one of which goes through the
cluster system:

| Site | View | Via clusters? |
|---|---|---|
| `Island.tsx:301` | all collapsed presentations (snapped, faux-notch, floating L1/L2) | yes |
| `Island.tsx:938` | L3Card "Companion" | no |
| `Island.tsx:1091` | CircleCard "Badge" | no |
| `Island.tsx:1323` | Peek | no — and renders unconditionally, ignoring `dots: 'off'` |
| `Island.tsx:1533` | ExpandedBody | no |

Two candidate homes:

- **(a) Inside `SessionDots.tsx`** as a second row of the same container. Reaches all five
  call sites for free. Costs: `SessionDots` stops being purely about dots, and it needs
  task state it doesn't currently receive.
- **(b) A fifth `IslandElement`.** Touches `types.ts:30`, `placement.ts:18`, `derive.ts`,
  the exhaustive `never` switch at `Island.tsx:250`, the `hasContent` guards at 246/1129,
  `store.ts` defaults + `migrateIslandPlacement`, `sections.tsx:1040`, and
  `scripts/placement-check.ts` — **and still misses four of the five call sites.**

Decide the home, then the edges: does the bar appear in Peek (which shows dots even when
placement is `off`)? In the collapsed pill at all, given the width? What happens when
`dots: 'off'` but a task is active — bar with no dots, or nothing?
