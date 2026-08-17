# 03 — Where the task progress bar renders

Type: grilling
Status: closed
Assignee: Justin Lee

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

## Facts corrected while grilling

**"Peek renders it unconditionally, ignoring `dots: 'off'`" is half true.** `derive.ts:110`
already zeroes the array when the slot is off
(`count = placement.dots !== 'off' ? sessionTotal : 0`), so Peek's unguarded call renders an
empty container — invisible. **ExpandedBody** (`:1533`) is the one that actually leaks: it
passes `completedToday`, taking `SessionDots` down its two-layer branch
(`SessionDots.tsx:51`) and rendering a `minWidth: 20, minHeight: 16` goal layer that still
reveals the daily count on hover. With dots switched off, the expanded card keeps a hover
target the user disabled. See §5.

**The two lists are different lists.** Task text renders at four sites, dots at five, and
they overlap at only two:

| View | Dots? | Task name? |
|---|---|---|
| Collapsed clusters (L1 / snapped) | yes | **no** |
| L3Card | yes | **no** |
| CircleCard (L4) | yes | **no** |
| Floating L2 | via clusters | **yes** |
| Peek | yes | **yes** |
| ExpandedBody | yes | **yes** |

This is what reframed the ticket: "any view that has the session dots" would put a task
progress bar in three views that never say which task it belongs to.

## Resolution

### 1. The bar is task-adjacent, not dots-adjacent

**Neither of the ticket's two candidate homes.** A small component rendered where the active
task is already named and already in scope.

The bar is task information: it means nothing without the task it measures. In the three
dots-only views it would be a segmented line about an unnamed thing sitting beside a
segmented line about something else.

Rejected **(a) inside `SessionDots`**: reaches all five sites free, but three of them can't
label it, and `SessionDots` would stop being about dots while needing task state it doesn't
receive.

Rejected **(b) a fifth `IslandElement`**: the worst trade in the ticket. It touches
`types.ts:30`, `placement.ts:18`, `derive.ts`, the exhaustive `never` switch at
`Island.tsx:250`, the `hasContent` guards at `:246`/`:1129`, `store.ts` defaults +
`migrateIslandPlacement:132`, `sections.tsx:1040` and all eight assertions in
`scripts/placement-check.ts` — eight files to reach **one** of six views.

**The chosen home costs nothing structurally.** `Peek` (`:1276`) and `ExpandedBody` (`:1481`)
both already compute `activeTask`, and both are already vertical stacks — so the "there is no
vertical-stacking primitive" problem this ticket opens with simply does not arise. Placement,
migration and `placement-check.ts` are untouched.

**Accepted deviation from the brief.** The brief said "below the 4 global session dots";
the bar instead sits below the *task line*. In ExpandedBody the dots are up in the status row
(`:1533`) and the task name is below them (`:1567`), so the bar lands one row further down
than the brief pictured. This is better — it puts the bar against the thing it describes —
but it is a deviation, recorded rather than glossed.

### 2. Peek and ExpandedBody only — L2 excluded, task rows excluded

**Floating L2 is excluded** despite having a task line. It is a *collapsed* presentation whose
whole job is to be small and glanceable, and the bar is the one element whose width wants to
scale with the estimate — so adding it makes the pill grow, fighting the reason someone chose
a collapsed floating layout. Peek is one hover away and shows the bar there, which is the
right escalation: glance sees the task name, hover sees its progress.

**Task list rows keep the numeric `SessionCount`** (`TaskList.tsx:474`, `:506`), no bar.
Ticket 11 is already fitting six controls into a 320px row. More fundamentally a list is a
comparison context: "3/5" and "1/8" are instantly comparable as numbers and much less so as
two bars of different segment counts. The bar earns its place in the island precisely because
there is only ever one task there.

### 3. `dots: 'off'` has no effect on the bar

§1 decouples them structurally. The dots slot controls the global **round** counter; the bar
is task progress with its own pref. Coupling them would mean a user who turned off the dots
silently loses an unrelated feature.

This is the question the ticket opened with ("bar with no dots, or nothing?"). §1 dissolves it
rather than answering it.

### 4. `prefs.taskProgress` off falls back to `TaskSessions`

The bar replaces the existing "• 3/5" text hint (`TaskSessions`, `Island.tsx:1455`) at both
sites, and the count moves into the bar's hover reveal (ticket 07 Q3, reusing the
`SessionDots` two-layer opacity swap). Shipping both would put the same two integers on screen
twice within about twenty pixels, which reads as a rendering mistake rather than emphasis.

**But `TaskSessions` is not deleted — it becomes the off-state.** With `taskProgress` off, the
two sites render the text hint exactly as they do today. It costs nothing, since the component
exists and is already wired at both sites.

**Amended 2026-08-17**: this section claimed off is "exactly the app as it ships today, byte
for byte". That is no longer strictly true. §6's relocation of Peek's timer bar is
**unconditional** — correctly, since a *task* pref has no business moving the *timer's* own
progress bar. So with the pref off you get today's count treatment, in a Peek whose timer bar
has moved to the foot. The toggle still means "bar or count"; it just never meant "revert the
card".

Hiding the count entirely when off was rejected: it would leave the expanded card with no
completed/estimate readout at all.

**Amends ticket 12 Q2**, which assumed the toggle "only hides the bar next to the session
dots" with counts staying visible. The phrase "next to the session dots" does not survive §1.
Correct description is closer to *"Show task progress as a bar instead of a count."*

### 5. Fix the `dots: 'off'` hover-target leak here

Add the `view.dots.length > 0 &&` guard to **ExpandedBody** (`:1533`) and **Peek** (`:1323`),
matching the guards L3Card (`:938`) and CircleCard (`:1091`) already have. Same two-token fix,
in a file this ticket opens anyway; spinning it out costs more bookkeeping than the fix.

**Named behaviour change**: with dots off, the expanded card loses the daily-goal hover
reveal. That is correct. If the daily goal deserves a home independent of the dots slot, that
is separate design work, not a reason to leave an orphaned hover target.

### 6. Position: under the task line

**Amended 2026-08-17 during ticket 17's implementation.** This section originally read "under
the task line, **above the timer bar**", with the two bars roughly fifteen pixels apart in Peek
and §6 handing the job of distinguishing them to ticket 07. On seeing it rendered, the owner
moved **Peek's own continuous timer bar to the card foot**, below the time and the transport
controls.

So the position is now: the segmented task bar sits **directly under the task line with nothing
between them**, and Peek's timer bar sits at the foot of the card.

This strengthens rather than weakens §1's reasoning — the whole basis for task-adjacency was
putting the bar against the thing it measures, and now nothing separates them. The
specific-to-general reading order survives (task name → this task's progress → this block's
progress), just with the time and controls in the middle, which is a familiar media-player
shape. It is height-neutral, which matters because Peek is hover-revealed.

**Peek only.** ExpandedBody has no linear timer bar — its Ring is the progress indicator — so
the two bars were only ever adjacent in Peek, and this was a single-view change.

The paragraph below is kept for the record.

### 6 (superseded): under the task line, above the timer bar

In **Peek**, the task line (`:1337`, `marginBottom: 13`) is followed by the timer's own 4px
continuous `--il-track` progress bar (`:1345`). The task bar goes **between** them.

Reading order becomes task name → this task's progress → this block's progress:
specific-to-general, matching how the eye moves down the card. Below the timer bar would
separate the bar from the only text saying what it measures.

The two-stacked-bars collision is real but is **ticket 07's** to solve, and it starts with a
head start: the task bar is *segmented*, the timer bar is *continuous*.

**ExpandedBody has no equivalent problem** — its task line (`:1567`) is followed by the Ring
row, not a bar.

### 7. The row vanishes with no task; the slot is fixed-height with one

Two cases that 05 §4's "the bar hides entirely" conflated:

- **No active task** — the row vanishes and the card shrinks, resizing the window through the
  `ResizeObserver` at `IslandApp.tsx:125`. Reserved empty space was rejected: 05 §4's stated
  goal is that a task-less island looks *identical* to today's, and a gap defeats that. The
  resize is one the app already performs constantly (mode changes, the task panel opening).
- **With a task** — the slot has a **fixed height**, so ticket 04 §B3's bar→buttons swap at
  estimate is purely a crossfade with no reflow underneath it.

The fixed height matters most in **Peek**, because Peek is hover-revealed and a card that
changes height under the pointer is how MO-50 happened — `SessionDots.tsx:47-50` documents the
two-layer grid built specifically to stop it. The bar's visibility is not hover-driven, so
this is not a re-run of that bug, but the at-estimate swap *can* fire mid-hover, and a fixed
slot closes it off for free.

**Constraint on ticket 11**, which owns button layout: the slot height is set by whichever of
bar-or-buttons is taller, and 11 fits the buttons inside it rather than the reverse.

### 8. The bar shows through breaks, unchanged

With an active task, `displayTask` renders the task's title during a break too — the "Break
time" fallback only applies when there is no task (`derive.ts:105`). The bar stays with it.

It is still true (the task really is at 3/5 during the break), and hiding it would mean the
card gains and loses a row at every block boundary: resize churn twice per session for no
information gained. It also matters for ticket 04: pausing *after* the break means the bar is
exactly what the user glances at during that break to decide what happens when it ends.
Hiding it would remove the readout at the one moment it is most decision-relevant.

## Pushed onto other tickets

- **07** — owns distinguishing the segmented task bar from the continuous timer bar stacked
  ~15px below it in Peek (§6), and the hover reveal that now carries the count (§4).
- **11** — the bar/buttons slot is fixed-height, sized by the taller of the two; buttons fit
  inside it (§7).
- **12** — Q2's toggle description is amended; "next to the session dots" is wrong (§4).
