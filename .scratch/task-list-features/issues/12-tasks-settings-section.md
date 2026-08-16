# 12 — Tasks settings section: copy and placement

Type: grilling
Status: deferred — decided during implementation, not on the map
Blocked by: 03 (04 resolved 2026-08-16)

**Ticket 04 settled the pref keys and defaults**, and added a third toggle that does *not*
live here. Q4 below is answered; Q1–Q3 and Q5 stand.

| Key | Section | Default |
|---|---|---|
| `taskProgress` | **Tasks** | on |
| `pauseAtEstimate` | **Tasks** | on |
| `creditSkipped` | **Behavior**, not Tasks | off |

`creditSkipped` governs what counts as a completed session at all — it moves
`completedToday`, the daily-goal reveal and the milestone rings, not just task counters — so
it sits with `autoStart` and `pauseIdle` in Behavior. Its copy is settled: **"Count skipped
sessions"** / *"A session you end early with Next still counts toward your task estimate and
daily goal."* The Tasks section is still exactly two rows, which is what Q1's column-balance
question was sized against.

Q2's copy now also has to describe a `pauseAtEstimate` that pauses **after the break**, and
whose **+** deliberately never raises the estimate.

## Question

A new **Tasks** section in the General tab, below Behavior, with exactly two toggles
(settled): task progress bar on/off (default on) and pause-at-estimate on/off (default on).
Blocked because the toggle copy has to describe what tickets 03 and 04 actually decided.

1. **Placement in the grid.** `GeneralTab` is a 2-column grid (`sections.tsx:713`); Behavior
   is the *entire* right column (`sections.tsx:850`). "Below Behavior" means a sibling block
   inside that right-hand `<div>`. Does adding it unbalance the columns badly enough to
   warrant moving something?

2. **Copy.** Follow the `BEHAVIORS` table shape — `[key, title, desc]` at
   `sections.tsx:667` — rendered as `ToggleRow`. Title and one-line description for each.
   The progress-bar toggle's description must make clear it only hides the bar next to the
   session dots: counts stay visible in the hover and expanded views and in the task list
   itself.

3. **Do these go in `BEHAVIORS` or a new table?** They are `Prefs` booleans rendered by the
   same `ToggleRow`, so mechanically they could just be appended — but they belong under a
   separate `<SectionLabel>Tasks</SectionLabel>`. New `TASKS` table, presumably.

4. **Pref key names**, consistent with whatever ticket 01 settles for task vocabulary.
   Defaults go in `DEFAULT_PREFS` (`electron/store.ts:19`); no migration helper needed for
   plain booleans since `load()` merges over defaults.

5. **Does pause-at-estimate's description need to mention `autoStart`?** Its off-branch
   defers to "Auto-start next session", which sits a few rows above in the same tab. Cross-
   referencing another setting in body copy is not a pattern the app uses yet.
