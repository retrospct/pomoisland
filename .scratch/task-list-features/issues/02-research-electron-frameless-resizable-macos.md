# 02 — RESEARCH: Electron frameless resizable window on macOS

Type: research
Status: resolved

## Question

What does Electron actually give us for the detached task-list window, and what must be
hand-built? Ticket 10 depends on the answer.

Specifically:

1. **Resize grip.** The brief asks for "the standard fold/grip icon in the bottom right
   hand corner". macOS removed the classic grow box; `resizable: true` on a frameless
   window gives invisible edge/corner hit zones and no glyph. Is there any native affordance
   left, or is the grip purely decorative and hand-drawn? If hand-drawn, does it need its
   own drag handling or does it sit inside the OS corner hit zone?

2. **Edge resize on a frameless window.** How wide is the draggable edge region by default,
   can it be widened, and does `-webkit-app-region: drag` on the header conflict with edge
   resize or with the corner?

3. **Always-on-top levels.** `setAlwaysOnTop(flag, level)` levels available on macOS, and
   which one a task-list window should use so it floats over normal apps *without* fighting
   the island's own level (the island deliberately floats above the menu bar, ADR-0006, via
   `applyIslandWindowLevel()` in `electron/windows.ts:267`). Does a `'floating'`-level task
   window sit above or below the island, and can that be controlled?

4. **Geometry persistence.** Standard pattern for save/restore of bounds, and the failure
   modes worth guarding: window restored offscreen after a display change, restored larger
   than the current display, restore vs. `minWidth`/`minHeight` conflicts.

5. **Minimum viable window config** to match the Settings precedent (`electron/windows.ts:472`)
   while being frameless with a custom header.

Capture findings on a throwaway `research/electron-frameless-resize` branch or as a note
under `.scratch/task-list-features/`, and link it from this ticket's Answer.

## Answer

Full note with citations: [`../research/electron-frameless-resize.md`](../research/electron-frameless-resize.md)

- **The grip is hand-drawn and must be inert — it needs no pointer handling of its own.**
  `NSWindow.showsResizeIndicator` is deprecated with the message *"This property does not
  do anything"*; macOS draws no grow box for any window, and Electron 42.5.1 exposes no
  resize-drag API at all (the whole surface is `resizable` / `setResizable` /
  `isResizable` / min-max size / the resize events). The glyph just sits inside AppKit's
  corner zone: on macOS Electron compiles its resize-border hit test out entirely
  (`native_window.cc` is `#if !BUILDFLAG(IS_MAC)`) and AppKit owns resize via
  `NSWindowStyleMaskResizable`. Draw an SVG, `pointer-events: none`, no handlers.
- **`app-region: drag` does not shadow edge resize on macOS.** Electron's
  `cr_mouseDownOnFrameView:` checks the resize direction *before* starting a window
  drag. The known macOS bug is the reverse (window drifts while resizing) and is MAS-only
  — we ship dmg/zip. Still inset the header ~6px from the edges as cheap insurance.
- **Hit-region width is not configurable and not knowable on our build.** The 5pt/16pt
  constants people quote are Electron's Windows/Linux `FramelessView` values (plus its
  MAS approximation); non-MAS macOS uses AppKit's private, undocumented API. Keep ~8px
  clearance around all edges.
- **`app-region` gotchas that bind ticket 10:** drag rects swallow *all* pointer events
  geometrically (not by inheritance), so pop-in/pin/✕ each need `no-drag`; add
  `user-select: none`; never put a custom context menu on the drag region. `Settings`
  already models the `no-drag` part (`SettingsApp.tsx:10-11`) but not `user-select`.
- **Pin the task window with `setAlwaysOnTop(true, 'normal', 1)`, not `'floating'`.**
  `relativeLevel` is plain integer addition, so that is NSWindow level **1**: above every
  ordinary app (0), strictly below the island in all three of its states — `'floating'`
  (3), snapped `'screen-saver'` (1000), dragging 1001. Plain `'floating'` would *tie* the
  island whenever it is floating with `alwaysTop`, and ties resolve by focus.
  Trade-off: `getAlwaysOnTopLevel()` won't round-trip level 1, so drive pin state from
  the `tasksAlwaysOnTop` pref, never from the getter.
- **Make it a top-level sibling, never `parent: islandWin`.** Attaching a child NSWindow
  resets the child's level, and `Show()`/`Hide()` re-trigger it — open bug #44150.
- **Geometry: persist `getNormalBounds()`, not `getBounds()`, debounced ~400ms** (on
  macOS `'moved'` is an alias of `'move'`, so it fires continuously, and `setPrefs`
  rewrites the whole `prefs.json` and notifies every listener). Flush on `'close'`.
- **Restore guards, in this order:** validate the JSON → find a display whose `workArea`
  *intersects* the rect (none ⇒ reset to defaults; handles the unplugged-monitor case) →
  clamp size to that `workArea` → *then* clamp the origin. Size before origin, and the
  size clamp must use the same `TASKS_MIN` constants passed as `minWidth`/`minHeight`, or
  Electron's own minimum enforcement fights the restored origin. Also re-run it on
  `screen`'s `display-removed` / `display-metrics-changed`.
- **Window config:** copy the Settings recipe (`frame: false`, `show: false` +
  `ready-to-show`, opaque `backgroundColor`, shared `PRELOAD`, singleton ref) plus
  `resizable: true`, `minWidth`/`minHeight`, restored bounds. **`transparent` must stay
  `false`** — the docs state transparent windows are not resizable. Skip `type: 'panel'`,
  `parent`, `setVisibleOnAllWorkspaces` (it triggers `app.dock.hide()`), and
  `enableLargerThanScreen`. Full snippet in §5 of the note.
- **Still unverified:** the actual macOS hit-region width, and Apple's blessing of level
  1 specifically — worth one smoke test that a pinned task window sits under a floating
  island and over Safari.
