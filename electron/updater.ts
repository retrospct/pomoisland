// Auto-update wrapper around electron-updater (Squirrel.Mac via GitHub Releases).
//
// Behavior: a silent check on launch (and every 6h) auto-downloads a newer signed
// build and, once ready, prompts "Restart now / Later" (and installs on next quit
// regardless — autoInstallOnAppQuit). A separate *interactive* path, invoked from the
// three-dots menu / tray / app menu, always gives clear feedback ("up to date",
// "downloading…", errors) so a manual "Check for Updates…" never fails silently.
//
// macOS auto-update only works on a *signed* build, and only from the `.zip` artifact
// — see electron-builder.yml (mac.target includes zip) and the `publish` block.

import { app, BrowserWindow, dialog } from 'electron'
import { autoUpdater } from 'electron-updater'

const SIX_HOURS = 6 * 60 * 60 * 1000

// True only while an interactive (user-triggered) check is in flight, so the silent
// background check never surfaces "up to date" / transient-error popups.
let interactive = false
// Guards against stacking checks (double-clicks, overlapping timer + manual check).
let checking = false

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
    void dialog
      .showMessageBox(focusedWindow() ?? (undefined as never), {
        type: 'info',
        title: 'PomoIsland',
        message: 'Update ready to install',
        detail: `PomoIsland ${i?.version ?? ''} has been downloaded. Restart now to update, or it will install the next time you quit.`,
        buttons: ['Restart now', 'Later'],
        defaultId: 0,
        cancelId: 1,
      })
      .then(({ response }) => {
        if (response === 0) autoUpdater.quitAndInstall()
      })
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
