# 10 — Detached window architecture and header controls

Type: grilling
Status: open
Blocked by: 02

## Question

Make the task list detachable into its own resizable, geometry-persisting,
always-on-top-capable window — the app's fourth (island, settings, snap overlay). Ticket 02
supplies the Electron facts; this decides the architecture.

Settled already (map Notes): *docked*/*detached* vocabulary with pop out / pop in; *pin*
means always-on-top only; detach is **exclusive** (no inline panel while detached);
geometry persists; `tasksDetached` and `tasksAlwaysOnTop` persist with no Settings UI.

Open:

1. **Renderer entry.** A fourth entry in `electron.vite.config.ts:36` alongside
   `index.html`/`settings.html`/`snap-overlay.html`, or reuse the island entry with a query
   param? `TasksState` already lives in main and broadcasts via `broadcastToAll`
   (`electron/windows.ts:470`), so a detached window gets state for free either way.

2. **Window lifecycle.** Follow the Settings singleton pattern — module-level ref,
   `show()`/`focus()` on re-open (`electron/ipc.ts:74`, `windows.ts:435`)? What does closing
   the window with ✕ mean: pop back in (set `tasksDetached = false`), or stay detached and
   closed so the ⋯ → Tasks item reopens it detached?

3. **Where do the persisted geometry keys live?** These are the first window bounds in
   `prefs.json`. Flat keys on `Prefs` or a nested `tasksWindow` object? Note `Prefs` is a
   flat interface today apart from `shortcuts`/`islandPlacement`.

4. **Island-side consequences of exclusivity.** `Present` includes `'tasks'`
   (`Island.tsx:22`) and `ExpandedWithTasks` stacks the panel below `ExpandedBody`
   (`Island.tsx:1693`). While detached, that presentation must be unreachable, and
   `openTasks` (`IslandApp.tsx:231`) must focus the window instead. Does the island resize
   correctly when the panel disappears mid-session?

5. **Header layout.** Settled: title left, controls right; docked shows pop-out only;
   detached shows pop-in, pin, ✕ in that order with ✕ outermost; the detached header is the
   drag region. `TaskList` has **no header today** — the panel starts straight into rows.
   How does adding one affect the docked panel's vertical budget inside the island?

6. **Pin state feedback.** How does the pin icon read as on vs off, given the app has no
   icon-toggle precedent?
