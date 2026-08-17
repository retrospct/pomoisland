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
// — see electron-builder.js (mac.target includes zip) and the `publish` block.

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

/**
 * Turn an electron-updater failure into something worth showing a person.
 *
 * Its errors arrive as raw transport dumps — an `HttpError: 404` followed by the
 * full response-header block and a stack through `main.js`. That is the right
 * thing to log and the wrong thing to put in a dialog, so translate the two cases
 * a user can actually act on and keep the raw text only as a last resort.
 */
function explainUpdateError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err)

  // A release exists but its artifacts aren't reachable — the feed file is missing
  // or the release is still private. Nothing the user can fix; say so plainly
  // rather than implying their machine is at fault.
  if (/Cannot find .*\.ya?ml|HttpError: 4\d\d/i.test(raw)) {
    return "The latest release is missing its update files, so there's nothing to download yet. This is a problem on our end — please try again later."
  }

  if (/ENOTFOUND|EAI_AGAIN|ETIMEDOUT|ECONNRESET|ECONNREFUSED|ENETUNREACH|net::ERR_/i.test(raw)) {
    return 'Could not reach GitHub to check for updates. Check your internet connection and try again.'
  }

  // Unrecognized: the first line carries the message, the rest is header noise.
  return raw.split('\n')[0]
}

/** Register update listeners and kick off the silent startup + interval checks. */
export function initAutoUpdater(): void {
  if (!app.isPackaged) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-not-available', () => {
    if (interactive)
      info("You're up to date", `PomoIsland ${app.getVersion()} is the latest version.`)
    interactive = false
    checking = false
  })

  autoUpdater.on('update-available', (i) => {
    // The *check* is over here — what follows is a download, tracked separately by
    // `updateReady`. Clearing `checking` matters because a download that neither
    // completes nor errors (a stalled connection, a suspended machine) fires no
    // further event: leaving the flag set would make every later check, background
    // and manual alike, return early at the guards below — the menu item would just
    // do nothing, forever, with no way back short of a relaunch.
    checking = false
    // autoDownload is on, so the download starts automatically; just acknowledge.
    if (interactive) {
      info(
        'Downloading update…',
        `PomoIsland ${i?.version ?? ''} is downloading. You'll be prompted to restart when it's ready.`,
      )
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
    if (interactive) info('Update check failed', explainUpdateError(err))
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
    info(
      'Updates unavailable in development',
      'Check for updates works in the packaged, signed app.',
    )
    return
  }
  if (checking) return
  interactive = true
  checking = true
  void autoUpdater.checkForUpdates().catch(() => {
    /* surfaced via the 'error' event */
  })
}
