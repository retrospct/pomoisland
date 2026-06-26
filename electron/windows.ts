import { BrowserWindow, screen } from 'electron'
import { join } from 'node:path'
import type { IslandSize, Placement } from '../src/shared/types'
import { IPC } from '../src/shared/types'
import { getPrefs } from './store'

const RENDERER_URL = process.env['ELECTRON_RENDERER_URL']
const PRELOAD = join(__dirname, '../preload/preload.js')

// Snap thresholds: how close the window center/top must be to the notch to snap.
const SNAP_X_TOLERANCE = 110
const SNAP_Y_TOLERANCE = 56

let islandWin: BrowserWindow | null = null
let settingsWin: BrowserWindow | null = null

const placement: Placement = { snapped: true, dragging: false, nearSnap: false }
let islandSize: IslandSize = { width: 240, height: 60 }

interface DragCtx {
  startCursorX: number
  startCursorY: number
  startX: number
  startY: number
}
let drag: DragCtx | null = null

function loadRoute(win: BrowserWindow, htmlFile: string): void {
  if (RENDERER_URL) void win.loadURL(`${RENDERER_URL}/${htmlFile}`)
  else void win.loadFile(join(__dirname, `../renderer/${htmlFile}`))
}

function primaryWorkArea() {
  return screen.getPrimaryDisplay().workArea
}

function snappedTopLeft(width: number): { x: number; y: number } {
  const wa = primaryWorkArea()
  return { x: Math.round(wa.x + wa.width / 2 - width / 2), y: wa.y }
}

export function getPlacement(): Placement {
  return { ...placement }
}

function broadcastPlacement(): void {
  islandWin?.webContents.send(IPC.islandPlacement, getPlacement())
}

export function createIslandWindow(): BrowserWindow {
  const prefs = getPrefs()
  const { x, y } = snappedTopLeft(islandSize.width)

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
    },
  })

  if (prefs.alwaysTop) islandWin.setAlwaysOnTop(true, 'floating')
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

/** Resize the island window to fit content, keeping its anchor (top-center if snapped). */
export function resizeIsland(size: IslandSize): void {
  if (!islandWin) return
  const width = Math.max(40, Math.ceil(size.width))
  const height = Math.max(28, Math.ceil(size.height))
  islandSize = { width, height }

  let x: number
  let y: number
  if (placement.snapped) {
    const tl = snappedTopLeft(width)
    x = tl.x
    y = tl.y
  } else {
    // Keep the horizontal center and top fixed as content grows/shrinks.
    const prev = islandWin.getBounds()
    const centerX = prev.x + prev.width / 2
    x = Math.round(centerX - width / 2)
    y = prev.y
  }
  islandWin.setBounds({ x, y, width, height })
}

export function applyAlwaysOnTop(on: boolean): void {
  if (!islandWin) return
  islandWin.setAlwaysOnTop(on, on ? 'floating' : 'normal')
}

export function dragStart(cursorX: number, cursorY: number): void {
  if (!islandWin) return
  const b = islandWin.getBounds()
  drag = { startCursorX: cursorX, startCursorY: cursorY, startX: b.x, startY: b.y }
  placement.dragging = true
  placement.snapped = false
  broadcastPlacement()
}

export function dragMove(cursorX: number, cursorY: number): void {
  if (!islandWin || !drag) return
  const wa = primaryWorkArea()
  const b = islandWin.getBounds()
  let x = drag.startX + (cursorX - drag.startCursorX)
  let y = drag.startY + (cursorY - drag.startCursorY)
  x = Math.max(wa.x, Math.min(wa.x + wa.width - b.width, x))
  y = Math.max(wa.y, Math.min(wa.y + wa.height - b.height, y))
  islandWin.setPosition(Math.round(x), Math.round(y))

  const centerX = x + b.width / 2
  const displayCenterX = wa.x + wa.width / 2
  const magnetic = getPrefs().magnetic
  placement.nearSnap =
    magnetic && Math.abs(centerX - displayCenterX) < SNAP_X_TOLERANCE && y - wa.y < SNAP_Y_TOLERANCE
  broadcastPlacement()
}

export function dragEnd(): void {
  if (!islandWin || !drag) return
  drag = null
  placement.dragging = false
  if (placement.nearSnap) {
    placement.snapped = true
    const tl = snappedTopLeft(islandSize.width)
    islandWin.setBounds({ x: tl.x, y: tl.y, width: islandSize.width, height: islandSize.height })
  }
  placement.nearSnap = false
  broadcastPlacement()
}

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
