// Auto-update wrapper around electron-updater (Squirrel.Mac via GitHub Releases).
//
// Behavior: a silent check on launch (and every 6h) auto-downloads a newer signed
// build. Once ready, instead of a disruptive dialog we flip a passive "update ready"
// state — a dot on the island's 3-dot button and a "Restart to Update" action in the
// three menus (MO-57). It still installs on next quit regardless (autoInstallOnAppQuit).
// A separate *interactive* path, invoked from the menus, always gives clear feedback
// ("up to date", "downloading…", errors) so a manual "Check for Updates…" never fails
// silently.
//
// macOS auto-update only works on a *signed* build, and only from the `.zip` artifact
// — see electron-builder.yml (mac.target includes zip) and the `publish` block.

import { app, BrowserWindow, dialog } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { UpdateStatus } from '../src/shared/types'

const SIX_HOURS = 6 * 60 * 60 * 1000

// True only while an interactive (user-triggered) check is in flight, so the silent
// background check never surfaces "up to date" / transient-error popups.
let interactive = false
// Guards against stacking checks (double-clicks, overlapping timer + manual check).
let checking = false

// Passive "update downloaded and ready to install" state, exposed to the renderer
// (dot) and the native menus ("Restart to Update"). Sticky until the app restarts.
let updateReady = false
let updateVersion: string | undefined
const updateReadyListeners = new Set<() => void>()

/** Current update-ready state for the renderer/menus. */
export function getUpdateStatus(): UpdateStatus {
  return { ready: updateReady, version: updateVersion }
}

/** Subscribe to the moment an update becomes ready (fires once, when it flips true). */
export function onUpdateReady(cb: () => void): void {
  updateReadyListeners.add(cb)
}

/** Install the downloaded update and relaunch (the "Restart to Update" action). */
export function installAndRestart(): void {
  if (updateReady) autoUpdater.quitAndInstall()
}

function focusedWindow(): BrowserWindow | undefined {
  return BrowserWindow.getFocusedWindow() ?? undefined
}

function info(message: string, detail?: string): void {
  void dialog.showMessageBox(focusedWindow() ?? (undefined as never), {
    type: 'info',
    title: 'PomoIsland',
    message,
    detail,
    buttons: ['OK'],
    defaultId: 0,
  })
}

/** Register update listeners and kick off the silent startup + interval checks. */
export function initAutoUpdater(): void {
  if (!app.isPackaged) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-not-available', () => {
    if (interactive) info("You're up to date", `PomoIsland ${app.getVersion()} is the latest version.`)
    interactive = false
    checking = false
  })

  autoUpdater.on('update-available', (i) => {
    // autoDownload is on, so the download starts automatically; just acknowledge.
    if (interactive) {
      info('Downloading update…', `PomoIsland ${i?.version ?? ''} is downloading. You'll be prompted to restart when it's ready.`)
      interactive = false
    }
  })

  autoUpdater.on('update-downloaded', (i) => {
    checking = false
    interactive = false
    // No disruptive dialog — flip the passive "ready" state so the island shows a
    // dot and the menus offer "Restart to Update" (MO-57).
    updateReady = true
    updateVersion = i?.version
    for (const cb of updateReadyListeners) cb()
  })

  autoUpdater.on('error', (err) => {
    console.error('[updater] error:', err)
    if (interactive) info('Update check failed', err?.message ?? String(err))
    interactive = false
    checking = false
  })

  // Silent startup check + periodic re-check.
  void autoUpdater.checkForUpdates().catch(() => {
    /* surfaced via the 'error' event */
  })
  setInterval(() => {
    if (checking) return
    void autoUpdater.checkForUpdates().catch(() => {})
  }, SIX_HOURS)
}

/** User-triggered check (menu / tray). Always gives clear feedback. */
export function checkForUpdatesInteractive(): void {
  if (!app.isPackaged) {
    info('Updates unavailable in development', 'Check for updates works in the packaged, signed app.')
    return
  }
  if (checking) return
  interactive = true
  checking = true
  void autoUpdater.checkForUpdates().catch(() => {
    /* surfaced via the 'error' event */
  })
}
