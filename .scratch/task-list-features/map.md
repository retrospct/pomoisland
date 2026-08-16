# Map: Task list features

## Destination

A written spec at `.scratch/task-list-features/spec.md` plus implementation issues under
`.scratch/task-list-features/issues/`, covering the task-list UI batch (detach, resize,
hover pencil, truncation popover, drag-reorder, click-to-deselect) and the task↔timer
semantics batch (task progress bar, pause-at-estimate, the two new Tasks settings).

**The decision phase was deliberately shortened** after charting. Only four tickets are
worked on the map — **01, 04, 03, 05** — the ones whose answers are expensive to get wrong
or that constrain everything downstream. Ticket 08 was merged into 04. Seven others are
written up in full but marked **deferred**: their questions are real and still have to be
answered, just by `/implement` sessions with the code in front of them rather than by a
map session. `/to-spec` **must** carry them into the spec as implementation notes — see
**Deferred to implementation** below.

The map is done when those four are resolved. **01 is closed**; 04, 03 and 05 remain.
**No production code is written on this map** — the map produces decisions and a spec, not
the feature.

## Notes

**Domain**: PomoIsland — macOS notch-aware Pomodoro timer, Electron + React 19 + TS
(Vite). Main process owns the timer runtime, prefs (`electron/store.ts`, hand-rolled JSON
at `userData/prefs.json`) and tasks (`electron/taskStore.ts`, `userData/tasks.json`);
both renderers are pure IPC subscribers (ADR-0002). Read `CONTEXT.md` before any ticket.

**Skills every session should consult**: `/grilling` and `/domain-modeling` by default;
`/prototype` for the tickets typed `prototype`; `/research` for those typed `research`.

### Standing decisions from charting

These were settled in the charting interview and bind every ticket. They are not
decisions the map still has to make.

- **Vocabulary — two independent axes.** *Docked* (list lives inside the island) vs
  *detached* (list is its own window) is axis one; the header control is labelled
  **pop out** / **pop in**. *Pin* means **always-on-top** and nothing else. The word
  "pinned" is retired for axis one. Planned `Prefs` keys: `tasksDetached`,
  `tasksAlwaysOnTop`.
- **Zero runtime dependencies.** `package.json` has no `dependencies` block; everything
  ships via `devDependencies` + electron-vite. Drag-reorder, the truncation popover and
  all tooltips are **hand-rolled**. No `dnd-kit`, no `floating-ui`. Precedents to copy:
  the hand-rolled popover in `src/island/Menu.tsx:241`, the pure-CSS two-layer hover
  reveal in `src/island/SessionDots.tsx`, native `title=""` tooltips used throughout.
- **Detach is exclusive.** While detached, the island never renders the inline panel; the
  ⋯ → Tasks item and the `il-task-open` label both focus the detached window instead.
  Pop-out/pop-in is a *move*, never a clone.
- **Detached window is persisted and always-on-top-capable.** Geometry survives restart
  (first window-geometry keys in `prefs.json`). `tasksDetached` and `tasksAlwaysOnTop`
  are persisted with **no Settings UI**. Only two new *visible* toggles ship in Settings,
  both in the new Tasks section.
  **Amended 2026-08-16 (PR #47, `2aabf28`)** — the stated precedent was `dnd`, "persisted
  with no control" (ADR-0004). That is now the wrong precedent: `alwaysTop` shipped a UI.
  It is user-toggleable from the island ⋯ menu and the tray menu — just not from Settings.
  See **Landed since charting** below; ticket 10 inherits the pattern rather than inventing
  one.
- **Exactly two new visible prefs**: task-progress-bar on/off (default **on**) and
  pause-at-estimate on/off (default **on**). The "respects Auto-start next session" clause
  is the else-branch of pause-at-estimate, reusing the existing `autoStart` pref — not a
  third control.
- **Reorder is pointer-only.** Keyboard-accessible reorder is explicitly not a
  requirement for this app.
- **Deselecting mid-session lets the timer run on, untasked.** Credit resolves from
  `activeTaskId` at `complete()` time (`electron/taskStore.ts:97`); a deselected session
  credits nothing. No second "session's task" notion is introduced.
- **Testing seams — one new seam, settled 2026-08-16 in a `/to-spec` session.** The repo
  has no test framework; the seam is hand-rolled `scripts/*-check.ts` node scripts driving
  real main-process modules (`scripts/complete-reason-check.ts` drives `Timer` via
  `tickOnce()`). Three consequences: **(a)** `Timer` is reused as-is — pause-at-estimate
  hangs off an injected predicate in the same shape as the existing `getPrefs` getter, so
  ticket 04 adds no seam. **(b)** One new seam: the pure task reducer is extracted out of
  `electron/taskStore.ts`, which imports `electron` at module load and so cannot be driven
  from a check script today. Pure functions over `TasksState` (mutations, focus-complete
  credit, ticket 01's tolerant `estimateSessions` read, ticket 04's at-estimate predicate);
  the fs + listener shell stays behind. One script covers 01's migration, 05's deselect
  toggle and done-path advance, and 04's credit/pause logic. **(c)** No seam for UI — the
  bar visuals, drag-reorder, popover and detached window are verified by hand, as the rest
  of the island is. Sole exception: if ticket 07's segment-count/overflow math becomes a
  pure function, it tests alongside `scripts/placement-check.ts`.
- **Motion: free tier only.** Bar fill, hover fade, popover fade, the progress-bar→buttons
  swap, and a drag **drop-indicator line** are in scope, all guarded by the existing `rm`
  reduced-motion flag (`src/island/Island.tsx:1346`). Neighbour FLIP animation and
  pop-out window choreography are out (see Out of scope).

### Landed since charting

Main moved under the map. **PR #47 `2aabf28` — "always-on-top toggle and bring-to-front when
time ends"** (merged 2026-08-16) touched `Island.tsx`, `IslandApp.tsx`, `Menu.tsx`,
`sections.tsx`, `types.ts`, `timer.ts`, `tray.ts`, `windows.ts`, `store.ts`. Every `file:line`
citation on this map and in every ticket was **re-resolved against `2aabf28` by content, not by
offset** — they are current. It touched no task file: `TaskList.tsx` and `taskStore.ts` are
untouched, so ticket 01's rename is unaffected.

Four consequences for open tickets:

- **`alwaysTop` now has a UI, and a shipped visual language for "pin".** A `role="menuitemcheckbox"`
  row at the top of the island ⋯ dropdown — thumbtack glyph, label **"Always on Top"**, accent
  check on the right, a `--il-muted` **"Floating only"** sub-label while snapped — plus a matching
  tray checkbox. Deliberately does *not* close the dropdown on click. **Ticket 10** should reuse
  this glyph and label for the detached window's pin rather than invent one.
- **Two always-on-top prefs now coexist with different semantics.** Amended ADR-0006: `alwaysTop`
  is inert while snapped, because `applyIslandWindowLevel()` forces `'screen-saver'` so the island
  can paint over the menu bar. Ticket 02 settled the detached window on
  `setAlwaysOnTop(true, 'normal', 1)` — deliberately *below* the island. **Open for ticket 10**:
  is a separate `tasksAlwaysOnTop` still right, or does the detached window read `alwaysTop`?
  They are not interchangeable.
- **`CompleteEvent` gained `reason: 'elapsed' | 'skipped'`** (`electron/timer.ts`), with
  `skip()` passing `'skipped'`. New sub-question folded into **ticket 04**.
- **`MENU_ALLOWANCE` was retuned 200 → 264** for the new row, and `MenuDropdown` now takes
  `snapped` and `accent` props. **Ticket 10** edits this same component to add pop-out/pop-in and
  must retune the constant again. Also new and useful to it: `onPlacementChange()` in
  `electron/windows.ts`, a main-process placement subscription that fires on every
  `broadcastPlacement()` — i.e. once per `dragMove` — so callers watching one field must dedupe.

### Load-bearing facts found while charting

- **`sessionIndex` ≠ task sessions.** The global dots are driven by `TimerState.sessionIndex`
  against `prefs.cSessions` (default 4, user-configurable **2–8** — it is not always four
  dots). Task progress is `Task.completedPomodoros` / `Task.estimatePomodoros`. Two
  independent counters.
- **`'below'` does not mean "below another element".** `IslandSlot` is `off|left|below|right`
  relative to *the notch*; clusters are horizontal flex rows (`src/island/placement.ts:21`).
  There is no vertical stacking primitive.
- **`SessionDots` has five call sites**, only one of which goes through the cluster
  system: `Island.tsx:301` (clusters), plus `938` (L3Card), `1091` (CircleCard), `1323`
  (Peek), `1533` (ExpandedBody). Peek renders it unconditionally, ignoring `dots: 'off'`.
- **Tasks are never auto-completed at estimate** — a deliberate decision with a comment at
  `electron/taskStore.ts:91-96` ("keeps counting, e.g. 8/7"). Pause-at-estimate overturns it.
- **`advance()` goes focus→break→focus** (`electron/timer.ts:174`), and `autoStart` is read
  in exactly two lines there. `recordFocusComplete` fires at `complete()`, i.e. at the
  start of the 2600 ms flourish — so `skip()` also counts as a completed session.
- **`activeTaskId` is not cleared on the done path** (`electron/taskStore.ts:129`), though
  `delete` and `clearCompleted` both clear it. Completing your last task leaves the island
  showing it as active. In scope — click-to-deselect depends on it.
- **`Task` has no `order` field.** Ordering is implicit array position, and the UI
  re-partitions into active/done before rendering (`src/island/TaskList.tsx:56`), so drop
  indices are per-partition, not raw. `TaskList.tsx:3` already says drag-reorder is a
  planned fast-follow.
- **Row hover-reveal unmounts rather than hides** (`TaskList.tsx:342`), so rows reflow on
  hover. Adding a third hover control worsens it.
- **No shared component library.** Every primitive (`ToggleRow`, `ToggleSwitch`, `Chip`,
  `StepButton`) is a local function in `src/settings/sections.tsx`; the segmented control
  is a repeated inline idiom, not a component.
- **Adding a plain pref is cheap**: a field on `Prefs` + a value in `DEFAULT_PREFS`.
  `load()` merges over defaults (`electron/store.ts:155`); no migration helper needed
  unless a key changes shape.
- **Settings General tab is a 2-column grid**; "Behavior" is the entire right column
  (`src/settings/sections.tsx:850`). "Below Behavior" means a sibling block in that column.
- **Primary colour**: `--sp-teal` in Settings (overwritten with the resolved accent in
  `paletteVars`), `--il-teal` / `--il-track` in the island — but the island's *live* accent
  is a JS value, `view.accent`, not a CSS var.

## Decisions so far

<!-- one line per closed ticket: gist + link -->

- [01 — Task vocabulary and the estimated-sessions model](issues/01-task-vocabulary-and-planned-sessions-model.md)
  — **Estimate is the word, everywhere**; "planned" is retired and "pomodoro" leaves the task
  model. `Task.estimatePomodoros`/`completedPomodoros` → **`estimateSessions`/`completedSessions`**
  (suffix-only; `defaultEstimate`, `TaskMutation.add.estimate` and `onAdjustEstimate` are already
  right and don't move). Rename requires a tolerant per-task read in `taskStore.ts` `load()`
  (`?? t.estimatePomodoros ?? 1`) — there is no per-task normalizer today — but **no `version`
  field**. **No `order` field** on `Task`; array position stays the order. The dot grouping is
  now named a **cycle**; the task side is qualified in prose as *estimated sessions* and row copy
  is unchanged. Consequently **`pause-at-planned` → `pause-at-estimate`** across the map.

- [02 — RESEARCH: Electron frameless resizable window on macOS](issues/02-research-electron-frameless-resizable-macos.md)
  — AppKit owns resize on macOS (Electron's hit test is compiled out); the corner grip is a
  hand-drawn, `pointer-events: none` glyph. Pin with `setAlwaysOnTop(true, 'normal', 1)` so
  the window sits above ordinary apps but below the island in all three of its levels; never
  `parent: islandWin`. Persist `getNormalBounds()` debounced, restore with
  validate → intersect-a-display → clamp size → clamp origin. `transparent` must stay
  `false`. Full note: [research/electron-frameless-resize.md](research/electron-frameless-resize.md)

## Not yet specified

- **The spec artifact itself.** Structure and granularity of `spec.md` and the handoff
  implementation issues; sharpens once the decision tickets land.
- **Notification behaviour when pause-at-estimate fires.** `electron/notify.ts` hooks
  completion; whether a pause-at-estimate stop deserves its own notification depends on 04.
- **Tray menu implications** of no-task mode and of a detached window (`electron/tray.ts`).
- **Whether pop-out deserves a global shortcut** (`Shortcuts`, ADR-0007) — depends on 10.
- **Empty-state copy**, and whether "no tasks at all" and "all tasks done" read
  differently — depends on 05.

## Deferred to implementation

**Not out of scope** — these ship. Their questions are written up in full in the ticket
files below and were consciously moved off the decision phase to shorten it. `/to-spec`
must fold each one into the spec as an implementation note, carrying its file:line detail
across, so the `/implement` session answers it with the code in front of it.

Anything here that turns out to be a genuine product call rather than a build call should
be escalated back to a map ticket rather than guessed at.

- [06 — Truncation detection and the title popover](issues/06-truncation-detection-and-title-popover.md)
  — detection strategy, and whether the popover needs `Menu.tsx`'s window-clipping spacer trick.
- [07 — Segmented progress bar design](issues/07-segmented-progress-bar-design.md)
  — segment count at large estimate values, overflow past the estimate, live-accent vs stable colour.
- [09 — Reorder: model and drag interaction](issues/09-reorder-model-and-drag-interaction.md)
  — mutation shape, per-partition vs raw indices, whether drags cross the active/done boundary.
- [10 — Detached window architecture and header controls](issues/10-detached-window-architecture-and-header.md)
  — renderer entry, lifecycle, what ✕ means. The hard Electron facts are already answered
  by ticket 02; what remains is architecture.
- [11 — Task row layout under pressure](issues/11-task-row-layout-under-pressure.md)
  — what fits in 320px, the unmount-vs-opacity reflow fix, which controls are hover-revealed.
- [12 — Tasks settings section](issues/12-tasks-settings-section.md)
  — copy and grid placement; mechanical once 03 and 04 are settled.

[08 — The + and ✓ resume controls](issues/08-plus-and-check-resume-controls.md) is **merged
into 04**, not deferred — its questions are product calls, so they stay on the map as Part B
of that ticket.

## Out of scope

- **`sessionIndex` never wrapping modulo `cSessions`** (`electron/timer.ts:179`) — after
  round one every global dot reads *done* and none reads *current* until reset. A real
  bug, but it is the global dot cycle, not the task bar. Separate effort.
- **Docs rot**: ADR-0002 claims `electron-store` when the store is hand-rolled JSON; two
  files are numbered ADR-0006. Unrelated housekeeping.
- **Motion tuning proper** — neighbour FLIP reordering on drag, and pop-out/pop-in window
  choreography. Deferred to the global motion pass that `AGENTS.md:40` describes.
- **Multi-select and bulk task operations.** Adjacent to drag-reorder, never asked for.
- **Task list in the snap overlay window.** It renders none of this today.
- **Keyboard-accessible reorder** and screen-reader announcements for drag.
