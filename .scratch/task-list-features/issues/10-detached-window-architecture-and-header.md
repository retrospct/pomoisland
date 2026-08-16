# 10 — Detached window architecture and header controls

Type: grilling
Status: deferred — decided during implementation, not on the map
Blocked by: 02 (resolved)

## Question

Make the task list detachable into its own resizable, geometry-persisting,
always-on-top-capable window — the app's fourth (island, settings, snap overlay). Ticket 02
supplies the Electron facts; this decides the architecture.

Settled already (map Notes): *docked*/*detached* vocabulary with pop out / pop in; *pin*
means always-on-top only; detach is **exclusive** (no inline panel while detached);
geometry persists; `tasksDetached` and `tasksAlwaysOnTop` persist with no Settings UI.

**Changed under this ticket by PR #47 (`2aabf28`, merged 2026-08-16)** — see the map's
*Landed since charting*. Three things this ticket must now account for:

- **The pin has a shipped visual language.** `alwaysTop` gained a `role="menuitemcheckbox"`
  row at the top of the ⋯ dropdown: thumbtack glyph, label "Always on Top", accent check,
  `--il-muted` "Floating only" sub-label while snapped, and it does *not* close the dropdown
  on click. There's a matching tray checkbox. Reuse this, don't invent a second pin idiom.
- **New sub-decision — one always-on-top pref or two?** They are not interchangeable:
  amended ADR-0006 makes `alwaysTop` inert while snapped (`applyIslandWindowLevel()` forces
  `'screen-saver'`), whereas ticket 02 settled the detached window on
  `setAlwaysOnTop(true, 'normal', 1)`, deliberately *below* the island. So does
  `tasksAlwaysOnTop` still earn its own key, or does the detached window follow `alwaysTop`?
  Also: "no Settings UI" is still right, but the *reason* changed — `alwaysTop` is now
  user-toggleable outside Settings, so the `dnd` precedent no longer applies.
- **`MenuDropdown` moved.** It now takes `snapped` and `accent` props, and `MENU_ALLOWANCE`
  in `Island.tsx` was retuned 200 → 264 to fit the new row (worst case is snapped, where the
  "Floating only" line makes the popover 226px). Adding pop out / pop in to ⋯ means retuning
  it a third time — the constant is measured, not guessed.

Also newly available: **`onPlacementChange()`** in `electron/windows.ts`, a main-process
placement subscription. It fires on *every* `broadcastPlacement()`, i.e. once per `dragMove`,
so anything watching a single field must dedupe on that field (`electron/tray.ts` shows the
`lastApplied` shape).

Open:

1. **Renderer entry.** A fourth entry in `electron.vite.config.ts:36` alongside
   `index.html`/`settings.html`/`snap-overlay.html`, or reuse the island entry with a query
   param? `TasksState` already lives in main and broadcasts via `broadcastToAll`
   (`electron/windows.ts:507`), so a detached window gets state for free either way.

2. **Window lifecycle.** Follow the Settings singleton pattern — module-level ref,
   `show()`/`focus()` on re-open (`electron/ipc.ts:74`, `windows.ts:472`)? What does closing
   the window with ✕ mean: pop back in (set `tasksDetached = false`), or stay detached and
   closed so the ⋯ → Tasks item reopens it detached?

3. **Where do the persisted geometry keys live?** These are the first window bounds in
   `prefs.json`. Flat keys on `Prefs` or a nested `tasksWindow` object? Note `Prefs` is a
   flat interface today apart from `shortcuts`/`islandPlacement`.

4. **Island-side consequences of exclusivity.** `Present` includes `'tasks'`
   (`Island.tsx:22`) and `ExpandedWithTasks` stacks the panel below `ExpandedBody`
   (`Island.tsx:1705`). While detached, that presentation must be unreachable, and
   `openTasks` (`IslandApp.tsx:231`) must focus the window instead. Does the island resize
   correctly when the panel disappears mid-session?

5. **Header layout.** Settled: title left, controls right; docked shows pop-out only;
   detached shows pop-in, pin, ✕ in that order with ✕ outermost; the detached header is the
   drag region. `TaskList` has **no header today** — the panel starts straight into rows.
   How does adding one affect the docked panel's vertical budget inside the island?

6. **Pin state feedback.** How does the pin icon read as on vs off, given the app has no
   icon-toggle precedent?
