import { BrowserWindow, screen } from 'electron'
import type { Display } from 'electron'
import { join } from 'node:path'
import type { IslandResizeSize, IslandSize, Placement } from '../src/shared/types'
import { IPC } from '../src/shared/types'
import { getNotchMetrics } from './notch'
import { getPrefs } from './store'

const RENDERER_URL = process.env['ELECTRON_RENDERER_URL']
const PRELOAD = join(__dirname, '../preload/preload.js')

// Snap thresholds: how close the window center/top must be to snap.
const SNAP_X_TOLERANCE = 110
const SNAP_Y_TOLERANCE = 56

let islandWin: BrowserWindow | null = null
let settingsWin: BrowserWindow | null = null
let snapOverlayWin: BrowserWindow | null = null

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
  // Floating/dragging: respect the alwaysTop pref ('floating' is below the menu
  // bar, which is fine since the island isn't at the top edge while floating).
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

export function broadcastToAll(channel: string, payload: unknown): void {
  for (const w of BrowserWindow.getAllWindows()) w.webContents.send(channel, payload)
}
