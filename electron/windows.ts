import { BrowserWindow, screen } from 'electron'
import type { Display } from 'electron'
import { join } from 'node:path'
import type { IslandSize, Placement } from '../src/shared/types'
import { IPC } from '../src/shared/types'
import { getPrefs } from './store'

const RENDERER_URL = process.env['ELECTRON_RENDERER_URL']
const PRELOAD = join(__dirname, '../preload/preload.js')

// Snap thresholds: how close the window center/top must be to snap.
const SNAP_X_TOLERANCE = 110
const SNAP_Y_TOLERANCE = 56

let islandWin: BrowserWindow | null = null
let settingsWin: BrowserWindow | null = null
let snapOverlayWin: BrowserWindow | null = null

const placement: Placement = { snapped: true, dragging: false, nearSnap: false, hasNotch: false, notchHeight: 0 }
let islandSize: IslandSize = { width: 240, height: 60 }

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
 * Heuristic notch detection: built-in notched displays have a menu bar height
 * of ~32–38px vs ~24px on external monitors. Threshold of 30px catches all
 * current MacBook Pro / Air notch models and rejects external monitors.
 */
function notchMetrics(d: Display): { hasNotch: boolean; notchHeight: number } {
  const notchHeight = d.workArea.y - d.bounds.y
  return { hasNotch: notchHeight >= 30, notchHeight }
}

/**
 * Top-left origin for snapping the island to the top-center of a display.
 * Anchors at bounds.y (true top edge) so the island overlaps the menubar on
 * both notch and external monitors (MO-11).
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

/** Reposition snap overlay, then broadcast placement to all renderer windows. */
function broadcastPlacement(): void {
  // Refresh notch metrics for the display the island currently sits on.
  if (islandWin) {
    const b = islandWin.getBounds()
    const d = displayAtPoint(b.x + b.width / 2, b.y + b.height / 2)
    const { hasNotch, notchHeight } = notchMetrics(d)
    placement.hasNotch = hasNotch
    placement.notchHeight = notchHeight
  }
  updateSnapOverlay()
  for (const w of BrowserWindow.getAllWindows()) {
    w.webContents.send(IPC.islandPlacement, getPlacement())
  }
}

export function createIslandWindow(): BrowserWindow {
  const prefs = getPrefs()
  const { x, y } = snappedTopLeft(islandSize.width)

  // Prime notch metrics for the primary display before the first broadcast.
  {
    const d = screen.getPrimaryDisplay()
    const { hasNotch, notchHeight } = notchMetrics(d)
    placement.hasNotch = hasNotch
    placement.notchHeight = notchHeight
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

  applyIslandWindowLevel()
  // Re-apply bounds after raising the window level.
  // macOS clamps the initial y to workArea.y when the window is constructed at
  // a level below the menu bar. Once applyIslandWindowLevel() raises it to
  // 'status' (above the menu bar) the clamp is lifted, so we explicitly reset
  // the position to the requested y=0 (bounds.y, not workArea.y).
  islandWin.setBounds({ x, y, width: islandSize.width, height: islandSize.height })
  islandWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
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
    islandWin.show()
    islandWin.focus()
  }
}

/** Resize the island window to fit content, keeping its anchor (top-center if snapped). */
export function resizeIsland(size: IslandSize): void {
  if (!islandWin) return
  const width = Math.max(40, Math.ceil(size.width))
  const height = Math.max(28, Math.ceil(size.height))
  islandSize = { width, height }

  let x: number
  let y: number
  if (placement.snapped) {
    const b = islandWin.getBounds()
    const d = displayAtPoint(b.x + b.width / 2, b.y + b.height / 2)
    const tl = snappedTopLeft(width, d)
    x = tl.x
    y = tl.y
  } else {
    // Keep the horizontal center and top fixed as content grows/shrinks.
    const prev = islandWin.getBounds()
    const d = displayAtPoint(prev.x + prev.width / 2, prev.y + prev.height / 2)
    const centerX = prev.x + prev.width / 2
    x = Math.round(centerX - width / 2)
    // Never let a floating resize push the window back behind the menu bar.
    y = Math.max(prev.y, d.workArea.y)
  }
  islandWin.setBounds({ x, y, width, height })
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
  const prefs = getPrefs()
  if (!prefs.alwaysTop) {
    islandWin.setAlwaysOnTop(false)
    return
  }
  const level = placement.snapped ? 'screen-saver' : 'floating'
  islandWin.setAlwaysOnTop(true, level)
  if (placement.snapped) {
    const b = islandWin.getBounds()
    const d = displayAtPoint(b.x + b.width / 2, b.y + b.height / 2)
    const { x, y } = snappedTopLeft(islandSize.width, d)
    islandWin.setPosition(Math.round(x), Math.round(y))
  }
}

export function applyAlwaysOnTop(on: boolean): void {
  if (!islandWin) return
  if (!on) {
    islandWin.setAlwaysOnTop(false)
    return
  }
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

/** Extra pixels around the island footprint for the glow/outline to breathe. */
const OVERLAY_PADDING_X = 40
const OVERLAY_PADDING_Y = 20

export function createSnapOverlayWindow(): BrowserWindow {
  if (snapOverlayWin) return snapOverlayWin

  const { x, y } = snappedTopLeft(islandSize.width)

  snapOverlayWin = new BrowserWindow({
    width: islandSize.width + OVERLAY_PADDING_X * 2,
    // No top padding: window sits flush at y=0 (the screen top). Extra height
    // below lets the glow bleed without being clipped — see SnapOverlayApp.tsx.
    height: islandSize.height + OVERLAY_PADDING_Y,
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
  const snap = snappedTopLeft(islandSize.width, d)

  const w = islandSize.width + OVERLAY_PADDING_X * 2
  const h = islandSize.height + OVERLAY_PADDING_Y
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

export function broadcastToAll(channel: string, payload: unknown): void {
  for (const w of BrowserWindow.getAllWindows()) w.webContents.send(channel, payload)
}
