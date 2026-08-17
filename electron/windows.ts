import { app, BrowserWindow, screen } from 'electron'
import type { Display, Rectangle } from 'electron'
import { join } from 'node:path'
import type {
  IslandResizeSize,
  IslandSize,
  Placement,
  Prefs,
  WindowBounds,
} from '../src/shared/types'
import { IPC } from '../src/shared/types'
import { getNotchMetrics } from './notch'
import { getPrefs, setPrefs } from './store'

const RENDERER_URL = process.env['ELECTRON_RENDERER_URL']
const PRELOAD = join(__dirname, '../preload/preload.js')

// Snap thresholds: how close the window center/top must be to snap.
const SNAP_X_TOLERANCE = 110
const SNAP_Y_TOLERANCE = 56

let islandWin: BrowserWindow | null = null
let settingsWin: BrowserWindow | null = null
let snapOverlayWin: BrowserWindow | null = null
let tasksWin: BrowserWindow | null = null

// Closing the detached task window pops the list back in (clears Prefs.tasksDetached)
// — see TasksWindowAction. App shutdown closes every window too, and that must NOT
// be read as a pop-in, or quitting while detached would silently re-dock the list.
let quitting = false
app.on('before-quit', () => {
  quitting = true
})

const placement: Placement = {
  snapped: true,
  dragging: false,
  nearSnap: false,
  hasNotch: false,
  notchHeight: 0,
  notchWidth: 0,
  notchCenterX: 0,
}
let islandSize: IslandSize = { width: 240, height: 60 }
// Footprint of the island when docked (collapsed dock). This is the same shape
// regardless of the floating layout (L1–L4), so the snap drop-zone is sized from
// it — the drop zone shows where the island will LAND, not the current floating card.
let dockedSize: IslandSize = { width: 240, height: 60 }

interface DragCtx {
  startCursorX: number
  startCursorY: number
  startX: number
  startY: number
  lastCursorX: number
  lastCursorY: number
}
let drag: DragCtx | null = null

function loadRoute(win: BrowserWindow, htmlFile: string): void {
  if (RENDERER_URL) void win.loadURL(`${RENDERER_URL}/${htmlFile}`)
  else void win.loadFile(join(__dirname, `../renderer/${htmlFile}`))
}

/** Return the display containing the given screen point (falls back to primary). */
function displayAtPoint(x: number, y: number): Display {
  return screen.getDisplayNearestPoint({ x, y })
}

/**
 * Top-left origin for snapping the island to the top-center of a display.
 * Always anchors at bounds.y (the true screen top) so the island reaches the
 * physical notch. The renderer decides the visual treatment (notch-wrap vs
 * floating dock) based on hasNotch from the placement broadcast.
 */
function snappedTopLeft(width: number, display?: Display): { x: number; y: number } {
  const d = display ?? screen.getPrimaryDisplay()
  return {
    x: Math.round(d.bounds.x + d.bounds.width / 2 - width / 2),
    y: d.bounds.y,
  }
}

export function getPlacement(): Placement {
  return { ...placement }
}

type PlacementListener = (p: Placement) => void
const placementListeners = new Set<PlacementListener>()

/**
 * Subscribe to placement changes in the main process (the main-side equivalent of
 * the IPC.islandPlacement broadcast). Fires on EVERY broadcastPlacement() — i.e.
 * once per dragMove while a drag is in flight, not only when `snapped` flips —
 * so callers that care about a single field must dedupe. See electron/tray.ts.
 */
export function onPlacementChange(cb: PlacementListener): () => void {
  placementListeners.add(cb)
  return () => placementListeners.delete(cb)
}

/** Reposition snap overlay, then broadcast placement to all renderer windows. */
function broadcastPlacement(): void {
  // Refresh notch metrics for the display the island currently sits on.
  if (islandWin) {
    const b = islandWin.getBounds()
    const d = displayAtPoint(b.x + b.width / 2, b.y + b.height / 2)
    const m = getNotchMetrics(d)
    placement.hasNotch = m.hasNotch
    placement.notchHeight = m.notchHeight
    placement.notchWidth = m.notchWidth
    placement.notchCenterX = m.notchCenterX
  }
  updateSnapOverlay()
  const snapshot = getPlacement()
  for (const w of BrowserWindow.getAllWindows()) {
    w.webContents.send(IPC.islandPlacement, snapshot)
  }
  for (const l of placementListeners) l(snapshot)
}

export function createIslandWindow(): BrowserWindow {
  const prefs = getPrefs()
  const { x, y } = snappedTopLeft(islandSize.width)

  // Prime notch metrics for the primary display before the first broadcast.
  {
    const d = screen.getPrimaryDisplay()
    const m = getNotchMetrics(d)
    placement.hasNotch = m.hasNotch
    placement.notchHeight = m.notchHeight
    placement.notchWidth = m.notchWidth
    placement.notchCenterX = m.notchCenterX
  }

  islandWin = new BrowserWindow({
    width: islandSize.width,
    height: islandSize.height,
    x,
    y,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: false,
    movable: false, // we drive movement ourselves via IPC for snap control
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: prefs.alwaysTop,
    // macOS forcibly clamps window frames below the menu bar via
    // -[NSWindow constrainFrameRect:toScreen:] — that's why setBounds(y:0) kept
    // snapping back to workArea.y. Electron overrides that constraint when this is
    // true, which is exactly what native notch apps (SuperIsland) do by hand. It
    // lets the snapped island actually sit at y=0 over the menu bar / notch.
    enableLargerThanScreen: true,
    // NSPanel: floats without becoming the key window, so docking to the notch
    // never steals focus from the app the user is working in.
    type: 'panel',
    webPreferences: {
      preload: PRELOAD,
      contextIsolation: true,
      nodeIntegration: false,
      // The island is a passive always-on-top widget that is almost never the
      // focused window. With Chromium's default background throttling, its CSS
      // keyframe animations (the notch progress treatments — comet/glow/front/
      // underlight) freeze whenever another app is focused, so progress appears
      // not to animate at all. Disable throttling so the trace keeps animating
      // while the user works in other apps.
      backgroundThrottling: false,
    },
  })

  islandWin.setBounds({ x, y, width: islandSize.width, height: islandSize.height })
  islandWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  // Raise to screen-saver level and drive the position to y=0 LAST. macOS clamps
  // setBounds to workArea.y (below the menu bar); only setPosition at the raised
  // level reaches the true screen top, so it must be the final positioning op.
  applyIslandWindowLevel()
  loadRoute(islandWin, 'index.html')
  islandWin.on('closed', () => {
    islandWin = null
  })
  return islandWin
}

export function getIslandWindow(): BrowserWindow | null {
  return islandWin
}

/** Toggle the island between shown and hidden (used by the tray and the global shortcut). */
export function toggleIslandVisibility(): void {
  if (!islandWin) return
  if (islandWin.isVisible()) {
    islandWin.hide()
  } else {
    revealIsland()
  }
}

/** Shows and focuses the island unconditionally (used by e.g. a clicked notification). */
export function revealIsland(): void {
  if (!islandWin) return
  islandWin.show()
  islandWin.focus()
}

/**
 * Show (if hidden) and lift the island to the front WITHOUT taking focus —
 * the "bring timer to front when time ends" behavior (Prefs.raiseOnComplete).
 *
 * Deliberately NOT revealIsland(): that calls focus(), which on macOS activates
 * the application and pulls the menu bar away from whatever the user is in.
 * showInactive() maps to [NSWindow orderFrontRegardless], the only reliable raise
 * for a background app — plain moveTop()/orderFront: can be deferred while
 * another app is active, and PomoIsland is almost never the active app. Safe on
 * an already-visible window (it re-orders rather than re-shows).
 *
 * applyIslandWindowLevel() runs LAST: show/orderFront can re-clamp a snapped
 * island back under the menu bar, and that routine is what re-asserts the level
 * and then drives the position to y = display.bounds.y (ADR-0006).
 */
export function raiseIsland(): void {
  if (!islandWin) return
  islandWin.showInactive()
  applyIslandWindowLevel()
}

/** Resize the island window to fit content, keeping its anchor (top-center if snapped). */
export function resizeIsland(size: IslandResizeSize): void {
  if (!islandWin) return
  const width = Math.max(40, Math.ceil(size.width))
  const height = Math.max(28, Math.ceil(size.height))
  islandSize = { width, height }

  if (placement.snapped) {
    if (size.collapsed) {
      // Remember the docked footprint so the snap drop-zone stays consistent across
      // floating layouts (it reflects the landing shape, not the current float card).
      // Only the collapsed pill's resize reflects that shape — peek/expanded/tasks
      // resizes while snapped must not overwrite it with a larger transient size.
      dockedSize = { width, height }
    }
    const b = islandWin.getBounds()
    const d = displayAtPoint(b.x + b.width / 2, b.y + b.height / 2)
    const tl = snappedTopLeft(width, d)
    // Size via setBounds, then re-assert level + y=0 via setPosition (setBounds
    // re-clamps below the menu bar; applyIslandWindowLevel's setPosition reaches y=0).
    islandWin.setBounds({ x: tl.x, y: tl.y, width, height })
    applyIslandWindowLevel()
  } else {
    // Keep the horizontal center and top fixed as content grows/shrinks.
    const prev = islandWin.getBounds()
    const d = displayAtPoint(prev.x + prev.width / 2, prev.y + prev.height / 2)
    const centerX = prev.x + prev.width / 2
    const x = Math.round(centerX - width / 2)
    // Never let a floating resize push the window back behind the menu bar.
    const y = Math.max(prev.y, d.workArea.y)
    islandWin.setBounds({ x, y, width, height })
  }
}

/**
 * Set the island window level based on the current snapped state.
 *
 * When snapped we use 'screen-saver' (NSScreenSaverWindowLevel ≈ 1000) — the
 * same level the snap overlay uses — because it is the only confirmed level that
 * lets Electron actually position the window at y = display.bounds.y (the true
 * screen top, above the menu bar).  NSStatusWindowLevel (≈ 25, just above the
 * menu bar) was tried first but macOS Sequoia still clamps windows at that level
 * to workArea.y in practice.  'screen-saver' is more aggressive but is the same
 * approach used for the drop-ghost overlay; the island is a thin, transparent
 * utility widget so covering system alerts is acceptable — see ADR-0006.
 *
 * When floating/dragging, 'floating' is sufficient (above normal windows, below
 * the menu bar — island is not at the top edge during a drag anyway).
 *
 * After lifting to 'screen-saver' we explicitly re-snap the position on every
 * call: macOS may hold the window at workArea.y while at a lower level; setting
 * the level first unlocks that constraint, then setPosition drives it to y = 0.
 */
function applyIslandWindowLevel(): void {
  if (!islandWin) return
  // Snapped: the window must clear the menu bar to reach y=0 at the notch, which
  // requires a high window level — do this regardless of the alwaysTop pref. Then
  // drive the position with setPosition: macOS clamps setBounds to workArea.y, but
  // setPosition at this level reaches the true screen top. This must run AFTER any
  // setBounds (which re-clamps), so callers invoke it as the final positioning op.
  if (placement.snapped) {
    islandWin.setAlwaysOnTop(true, 'screen-saver')
    const b = islandWin.getBounds()
    const d = displayAtPoint(b.x + b.width / 2, b.y + b.height / 2)
    const { x, y } = snappedTopLeft(islandSize.width, d)
    islandWin.setPosition(Math.round(x), Math.round(y))
    return
  }
  // Dragging: sit one level above the snap-overlay (also 'screen-saver') so the
  // dragged card renders ON TOP of the drop-zone ghost, not behind it. Regardless
  // of the alwaysTop pref — the user is actively manipulating the card.
  if (placement.dragging) {
    islandWin.setAlwaysOnTop(true, 'screen-saver', 1)
    return
  }
  // Floating (not dragging): respect the alwaysTop pref ('floating' is below the
  // menu bar, which is fine since the island isn't at the top edge while floating).
  if (getPrefs().alwaysTop) {
    islandWin.setAlwaysOnTop(true, 'floating')
  } else {
    islandWin.setAlwaysOnTop(false)
  }
}

export function applyAlwaysOnTop(_on: boolean): void {
  if (!islandWin) return
  // Delegate to applyIslandWindowLevel so a snapped island stays above the menu
  // bar even when alwaysTop is off (snapping to the notch requires the high level).
  applyIslandWindowLevel()
}

export function dragStart(cursorX: number, cursorY: number): void {
  if (!islandWin) return
  const b = islandWin.getBounds()
  placement.dragging = true
  placement.snapped = false
  applyIslandWindowLevel() // floating while dragging

  // The window may be at y=0 (snapped to the notch at 'screen-saver' level).
  // After dropping to 'floating' level the floating card renders into that same
  // y=0 position — hidden behind the menu bar. Nudge the window to workArea.y
  // (the first pixel below the menu bar) immediately, and update the drag origin
  // so dragMove's position math stays consistent from the new start point.
  const d = displayAtPoint(cursorX, cursorY)
  const startY = Math.max(b.y, d.workArea.y)
  if (startY !== b.y) islandWin.setPosition(b.x, startY)

  drag = {
    startCursorX: cursorX,
    startCursorY: cursorY,
    startX: b.x,
    startY,
    lastCursorX: cursorX,
    lastCursorY: cursorY,
  }
  broadcastPlacement()
}

export function dragMove(cursorX: number, cursorY: number): void {
  if (!islandWin || !drag) return
  // Use the display containing the cursor for bounds clamping and snap math (MO-11).
  const d = displayAtPoint(cursorX, cursorY)
  const b = islandWin.getBounds()
  let x = drag.startX + (cursorX - drag.startCursorX)
  let y = drag.startY + (cursorY - drag.startCursorY)
  // Clamp x within full display bounds; clamp y to workArea so the floating
  // card can never slide behind the menu bar.  The snap zone (y < SNAP_Y_TOLERANCE)
  // still triggers because workArea.y (~38) is always < SNAP_Y_TOLERANCE (56),
  // so dragging back toward the notch correctly shows the snap overlay and
  // re-snaps on release.
  x = Math.max(d.bounds.x, Math.min(d.bounds.x + d.bounds.width - b.width, x))
  y = Math.max(d.workArea.y, Math.min(d.bounds.y + d.bounds.height - b.height, y))
  islandWin.setPosition(Math.round(x), Math.round(y))

  drag.lastCursorX = cursorX
  drag.lastCursorY = cursorY

  const centerX = x + b.width / 2
  const displayCenterX = d.bounds.x + d.bounds.width / 2
  const magnetic = getPrefs().magnetic
  placement.nearSnap =
    magnetic &&
    Math.abs(centerX - displayCenterX) < SNAP_X_TOLERANCE &&
    y - d.bounds.y < SNAP_Y_TOLERANCE
  broadcastPlacement()
}

export function dragEnd(): void {
  if (!islandWin || !drag) return
  const lastCursorX = drag.lastCursorX
  const lastCursorY = drag.lastCursorY
  drag = null
  placement.dragging = false
  if (placement.nearSnap) {
    placement.snapped = true
    const d = displayAtPoint(lastCursorX, lastCursorY)
    const tl = snappedTopLeft(islandSize.width, d)
    islandWin.setBounds({ x: tl.x, y: tl.y, width: islandSize.width, height: islandSize.height })
  }
  placement.nearSnap = false
  applyIslandWindowLevel() // back to 'status' if snapped, 'floating' if not
  broadcastPlacement()
}

// ---------------------------------------------------------------------------
// Snap-zone overlay window (MO-8)
// ---------------------------------------------------------------------------

/** Extra pixels around the island footprint for the glow/outline to breathe.
 * Generous so the near-snap bloom + a drop zone wider than the dock aren't clipped
 * (the SnapOverlayApp insets the ghost less than this, leaving the difference as
 * blur room). */
const OVERLAY_PADDING_X = 70
const OVERLAY_PADDING_Y = 52

export function createSnapOverlayWindow(): BrowserWindow {
  if (snapOverlayWin) return snapOverlayWin

  const { x, y } = snappedTopLeft(dockedSize.width)

  snapOverlayWin = new BrowserWindow({
    width: dockedSize.width + OVERLAY_PADDING_X * 2,
    // No top padding: window sits flush at y=0 (the screen top). Extra height
    // below lets the glow bleed without being clipped — see SnapOverlayApp.tsx.
    height: dockedSize.height + OVERLAY_PADDING_Y,
    x: x - OVERLAY_PADDING_X,
    y,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: false,
    movable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    webPreferences: {
      preload: PRELOAD,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Always pass all mouse events through — the overlay is purely visual.
  snapOverlayWin.setIgnoreMouseEvents(true, { forward: true })
  snapOverlayWin.setAlwaysOnTop(true, 'screen-saver')
  snapOverlayWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  loadRoute(snapOverlayWin, 'snap-overlay.html')
  snapOverlayWin.on('closed', () => {
    snapOverlayWin = null
  })
  return snapOverlayWin
}

export function getSnapOverlayWindow(): BrowserWindow | null {
  return snapOverlayWin
}

/**
 * Reposition and show/hide the snap overlay based on current placement state.
 * Called internally by broadcastPlacement.
 */
function updateSnapOverlay(): void {
  if (!snapOverlayWin) return

  if (!placement.dragging) {
    if (snapOverlayWin.isVisible()) snapOverlayWin.hide()
    return
  }

  // Derive snap target for the display where the cursor currently is.
  const cursorX = drag?.lastCursorX ?? (islandWin?.getBounds().x ?? 0)
  const cursorY = drag?.lastCursorY ?? (islandWin?.getBounds().y ?? 0)
  const d = displayAtPoint(cursorX, cursorY)
  // Size + center the drop-zone from the docked footprint so it's identical for
  // every floating layout (L1–L4) and matches where the island will land.
  const snap = snappedTopLeft(dockedSize.width, d)

  const w = dockedSize.width + OVERLAY_PADDING_X * 2
  const h = dockedSize.height + OVERLAY_PADDING_Y
  snapOverlayWin.setBounds({
    x: snap.x - OVERLAY_PADDING_X,
    y: snap.y, // flush at the screen top — no negative-y offset
    width: w,
    height: h,
  })

  if (!snapOverlayWin.isVisible()) {
    snapOverlayWin.showInactive()
  }
}

// ---------------------------------------------------------------------------
// Settings window
// ---------------------------------------------------------------------------

export function createSettingsWindow(): BrowserWindow {
  if (settingsWin) {
    settingsWin.show()
    settingsWin.focus()
    return settingsWin
  }
  settingsWin = new BrowserWindow({
    width: 880,
    height: 720,
    frame: false,
    resizable: true,
    minWidth: 720,
    minHeight: 540,
    maxWidth: 1100,
    show: false,
    title: 'Settings',
    backgroundColor: '#191b1f',
    webPreferences: {
      preload: PRELOAD,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  loadRoute(settingsWin, 'settings.html')
  settingsWin.once('ready-to-show', () => settingsWin?.show())
  settingsWin.on('closed', () => {
    settingsWin = null
  })
  return settingsWin
}

export function getSettingsWindow(): BrowserWindow | null {
  return settingsWin
}

// ---------------------------------------------------------------------------
// Detached task window (ticket 23)
// ---------------------------------------------------------------------------

/**
 * Floor size for the detached list. Used twice, and it has to be the same value
 * both times: as the window's minWidth/minHeight, and as the floor
 * sanitizeTasksBounds clamps a restored size to. If they diverged, Electron's own
 * minimum enforcement would fight the restored origin.
 */
const TASKS_MIN = { width: 300, height: 320 }

/**
 * Size the window opens at when prefs hold no usable geometry — a first pop-out,
 * or a saved rect that no longer survives sanitizeTasksBounds. The width matches
 * the docked panel's 320px so the list doesn't reflow when it moves out of the
 * island.
 */
const TASKS_DEFAULT = { width: 340, height: 460 }

// ---- Geometry persistence (ticket 24) ------------------------------------
//
// Saved bounds outlive the display that produced them, so nothing read out of
// prefs reaches a constructor unchecked. On the way in: validate, intersect
// against a live display, clamp size, clamp origin — in that order. On the way
// out: getNormalBounds(), debounced, because setPrefs writes the whole
// prefs.json synchronously and 'move'/'resize' fire per frame of a drag (on
// macOS 'moved' is documented as an alias of 'move', so there is no "once"
// event to lean on).

/** How long a drag or resize has to settle before its rect is written. */
const TASKS_BOUNDS_SAVE_MS = 400

let tasksBoundsTimer: NodeJS.Timeout | null = null

/**
 * Clamp with the MINIMUM winning a degenerate range.
 *
 * `min > max` happens for real: a display whose workArea is smaller than
 * TASKS_MIN, or an origin range for a window wider than its host. Ordering
 * Math.max last means we'd hand back a sub-minimum size that Electron/AppKit
 * would silently grow anyway — leaving an origin computed against the wrong
 * size. Minimum-wins overflows the work area instead, which the user can drag
 * out of; and for the origin clamp it pins the top-left on screen, keeping the
 * header (the only drag handle this frameless window has) reachable.
 */
function clampMinWins(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max))
}

/** Do two screen rects overlap at all? Deliberately not containment. */
function rectsIntersect(a: Rectangle, b: Rectangle): boolean {
  return (
    a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
  )
}

function centeredOn(display: Display, size: { width: number; height: number }): Rectangle {
  const wa = display.workArea
  return {
    x: Math.round(wa.x + (wa.width - size.width) / 2),
    y: Math.round(wa.y + (wa.height - size.height) / 2),
    width: size.width,
    height: size.height,
  }
}

/**
 * Turn whatever is in prefs into a rect that is definitely on a display that
 * definitely exists. The four steps are ordered, and the order is the point:
 *
 * (a) **Validate.** prefs.json is a plain file — it can be hand-edited, or a
 *     partial write can leave NaN/undefined in the rect.
 * (b) **Intersect a live display.** Overlap, not containment: a window
 *     straddling two monitors is legal and must survive. Overlapping *nothing*
 *     means the display it lived on is gone — an unplugged monitor, or a
 *     rearranged desktop — which is exactly the stranded-offscreen case.
 * (c) **Clamp size**, to the host's workArea and never below TASKS_MIN (the same
 *     constants passed as minWidth/minHeight, or Electron's own minimum
 *     enforcement fights the origin we compute next). Saved on a 6K, reopened on
 *     a laptop.
 * (d) **Clamp origin, after (c).** Doing it before the size clamp can push the
 *     bottom-right back off the screen. workArea rather than bounds also keeps
 *     the window clear of the menu bar and Dock, sidestepping the documented
 *     macOS setBounds y-clamp near the tray.
 */
function sanitizeTasksBounds(saved: WindowBounds | null): Rectangle {
  const primary = screen.getPrimaryDisplay()

  // (a)
  const valid =
    saved != null &&
    [saved.x, saved.y, saved.width, saved.height].every(
      (n) => typeof n === 'number' && Number.isFinite(n),
    ) &&
    saved.width > 0 &&
    saved.height > 0
  if (!valid) return centeredOn(primary, TASKS_DEFAULT)

  // (b)
  const host = screen.getAllDisplays().find((d) => rectsIntersect(d.workArea, saved))
  if (!host) return centeredOn(primary, TASKS_DEFAULT)
  const wa = host.workArea

  // (c)
  const width = clampMinWins(Math.round(saved.width), TASKS_MIN.width, wa.width)
  const height = clampMinWins(Math.round(saved.height), TASKS_MIN.height, wa.height)

  // (d)
  const x = clampMinWins(Math.round(saved.x), wa.x, wa.x + wa.width - width)
  const y = clampMinWins(Math.round(saved.y), wa.y, wa.y + wa.height - height)

  return { x, y, width, height }
}

/**
 * Cancel any pending debounce and read the rect worth persisting, or null when
 * there is no live window to read.
 *
 * Reads the window's NORMAL bounds, not getBounds(). The window is
 * `maximizable: false` and `fullscreenable: false`, but it is still minimizable,
 * and getBounds() on a minimized window does not describe where the user put it.
 */
function takeTasksBounds(): WindowBounds | null {
  if (tasksBoundsTimer) {
    clearTimeout(tasksBoundsTimer)
    tasksBoundsTimer = null
  }
  if (!tasksWin || tasksWin.isDestroyed()) return null
  const b = tasksWin.getNormalBounds()
  return { x: b.x, y: b.y, width: b.width, height: b.height }
}

function queueTasksBoundsSave(): void {
  if (tasksBoundsTimer) clearTimeout(tasksBoundsTimer)
  tasksBoundsTimer = setTimeout(() => {
    const bounds = takeTasksBounds()
    if (bounds) setPrefs({ tasksWindowBounds: bounds })
  }, TASKS_BOUNDS_SAVE_MS)
}

/**
 * Re-sanitize the LIVE window after a display change. Without this, unplugging
 * the monitor the window was on strands it until the next launch — restore-time
 * validation only helps at restore time.
 */
function reflowTasksWindow(): void {
  if (!tasksWin || tasksWin.isDestroyed()) return
  const b = tasksWin.getNormalBounds()
  const next = sanitizeTasksBounds({ x: b.x, y: b.y, width: b.width, height: b.height })
  if (next.x === b.x && next.y === b.y && next.width === b.width && next.height === b.height) return
  // setBounds fires 'move'/'resize', so the corrected rect gets persisted by the
  // usual debounce — no explicit save here.
  tasksWin.setBounds(next)
}

/** Registered once, for the app's lifetime, on the first pop-out. */
let watchingDisplays = false
function watchDisplaysForTasksWindow(): void {
  if (watchingDisplays) return
  watchingDisplays = true
  // Both handlers no-op while the window is closed. 'display-metrics-changed'
  // covers a resolution/scale/rotation change, which can shrink the work area
  // under a window that was legally placed.
  screen.on('display-removed', reflowTasksWindow)
  screen.on('display-metrics-changed', reflowTasksWindow)
}

// ---- Pin (ticket 24) -----------------------------------------------------

/**
 * Last pin value pushed to the current window; `null` = nothing pushed yet, or
 * no window. Prefs changes are broadcast on every setPrefs — including the
 * debounced bounds writes above — so dedupe rather than re-asserting a window
 * level a few times a second mid-drag.
 */
let appliedTasksPin: boolean | null = null

/**
 * Apply the pin: `setAlwaysOnTop(true, 'normal', 1)` — NSNormalWindowLevel (0)
 * plus one.
 *
 * Level 1 is above every ordinary application window (level 0) and strictly
 * below `'floating'` (3). macOS orders windows by level before focus — "even the
 * bottom window in a level will obscure the top window of the next level down" —
 * so this is a guarantee rather than a tendency: the pinned list can never come
 * out above the island in any of the island's three RAISED levels, which are
 * `'floating'` (3) when floating with alwaysTop, `'screen-saver'` (1000) when
 * snapped, and 1001 while dragging. `'floating'` for the list would instead have
 * *tied* the island's floating state, where ordering falls back to focus and a
 * click could reorder them.
 *
 * The island's fourth state is deliberately not covered: floating with alwaysTop
 * off makes it an ordinary level-0 window, and a pinned list then sits above it.
 * That is the correct reading of two independent bits — the user asked for the
 * island not to float and for the list to stay on top.
 *
 * Cost of the +1: getAlwaysOnTopLevel() compares against the exact NSWindow
 * constants, so any non-zero offset reads back as `'normal'`. The pin's state
 * comes from the `tasksAlwaysOnTop` pref, never from the getter.
 */
export function applyTasksWindowLevel(): void {
  if (!tasksWin || tasksWin.isDestroyed()) {
    appliedTasksPin = null
    return
  }
  const on = getPrefs().tasksAlwaysOnTop
  if (on === appliedTasksPin) return
  appliedTasksPin = on
  if (on) tasksWin.setAlwaysOnTop(true, 'normal', 1)
  else tasksWin.setAlwaysOnTop(false)
}

/**
 * Create (or re-show) the detached task list window.
 *
 * Follows the Settings singleton pattern — module-level ref, show/focus an
 * existing window on re-open — plus the ticket-02 research recipe: frameless
 * with a custom header, opaque `backgroundColor` so there's no white flash,
 * `show: false` + `ready-to-show`, the shared hardened preload.
 *
 * Deliberately NOT set, each for a researched reason:
 * - `transparent` stays false — transparent windows are not resizable.
 * - no `parent: islandWin` — attaching a child NSWindow resets the child's
 *   window level on every show (electron#44150).
 * - no `type: 'panel'` — that's the island's non-activating trick; this window
 *   holds a text field and *should* take focus.
 * - no `setVisibleOnAllWorkspaces` (triggers `app.dock.hide()`), no
 *   `enableLargerThanScreen` (island-only menu-bar hack).
 *
 * `resizable: true` is the whole resize story on macOS: it becomes
 * NSWindowStyleMaskResizable, and AppKit owns the edge/corner drag from there.
 * Electron's own frameless resize hit-testing is compiled out of macOS builds,
 * so there is nothing to configure and no way to widen the band — the renderer's
 * corner grip is decoration over a native region (`pointer-events: none`), not a
 * handle. `transparent` staying false is load-bearing for this: transparent
 * windows are not resizable.
 *
 * State needs no wiring: TasksState already lives in the main process and
 * broadcasts to every window (`broadcastToAll`), so this window is fed for free.
 */
export function createTasksWindow(): BrowserWindow {
  if (tasksWin) {
    tasksWin.show()
    tasksWin.focus()
    return tasksWin
  }

  // Never pass prefs geometry straight through — see sanitizeTasksBounds.
  const bounds = sanitizeTasksBounds(getPrefs().tasksWindowBounds)

  tasksWin = new BrowserWindow({
    ...bounds,
    // The same constants sanitizeTasksBounds clamps the size to. If these two
    // disagreed, AppKit would enforce its minimum and hand back a window bigger
    // than the rect we asked for, whose origin we had computed for the smaller one.
    minWidth: TASKS_MIN.width,
    minHeight: TASKS_MIN.height,
    frame: false,
    resizable: true,
    transparent: false,
    backgroundColor: '#191b1f',
    show: false,
    title: 'Tasks',
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: PRELOAD,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  loadRoute(tasksWin, 'tasks.html')
  tasksWin.once('ready-to-show', () => tasksWin?.show())
  // Fresh window: forget whatever level the last one was at, then apply the pin.
  appliedTasksPin = null
  applyTasksWindowLevel()
  tasksWin.on('resize', queueTasksBoundsSave)
  tasksWin.on('move', queueTasksBoundsSave)
  watchDisplaysForTasksWindow()
  // Every close path — the header's ✕, ⌘W from the Window menu — pops the list
  // back in, so the pref never points at a window that isn't there. App shutdown
  // is exempt (see `quitting`), leaving the list detached for the next launch.
  //
  // The geometry flush is NOT exempt: where you left the window is worth keeping
  // whether you popped it in or quit. It has to happen on 'close' rather than
  // 'closed' because the window is already gone by then — this is the last
  // moment getNormalBounds() means anything.
  //
  // Both land in ONE setPrefs: each one writes the whole prefs.json and
  // broadcasts to every window, and there is no reason to do that twice on the
  // way out.
  tasksWin.on('close', () => {
    const patch: Partial<Prefs> = {}
    const bounds = takeTasksBounds()
    if (bounds) patch.tasksWindowBounds = bounds
    if (!quitting) patch.tasksDetached = false
    if (Object.keys(patch).length > 0) setPrefs(patch)
  })
  tasksWin.on('closed', () => {
    tasksWin = null
    appliedTasksPin = null
  })
  return tasksWin
}

export function getTasksWindow(): BrowserWindow | null {
  return tasksWin
}

/** Pop the list out of the island: set the pref, then open/raise the window. */
export function popOutTasks(): void {
  setPrefs({ tasksDetached: true })
  createTasksWindow()
}

/**
 * Pop the list back into the island: close the window. The window's own `close`
 * handler clears the pref, so both routes (this and a bare ⌘W) agree.
 */
export function popInTasks(): void {
  if (tasksWin) {
    tasksWin.close()
    return
  }
  // No window to close (shouldn't happen) — clear the pref anyway so the island
  // can't be left refusing to render the docked panel.
  setPrefs({ tasksDetached: false })
}

/**
 * Show + focus the detached window. This is what the island's ⋯ → Tasks item and
 * its clickable task label do while detached — the inline panel is unreachable,
 * so those routes point at the window instead of opening a second copy.
 */
export function focusTasksWindow(): void {
  if (!tasksWin) {
    // Detached but somehow window-less: re-open rather than dead-ending.
    createTasksWindow()
    return
  }
  tasksWin.show()
  tasksWin.focus()
}

export function broadcastToAll(channel: string, payload: unknown): void {
  for (const w of BrowserWindow.getAllWindows()) w.webContents.send(channel, payload)
}
