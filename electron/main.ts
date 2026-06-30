import { app, BrowserWindow } from 'electron'
import { registerIpc } from './ipc'
import { registerGlobalShortcuts, unregisterGlobalShortcuts } from './shortcuts'
import { getPrefs, onPrefsChange } from './store'
import { Timer } from './timer'
import { createTray, destroyTray } from './tray'
import { createIslandWindow, createSnapOverlayWindow } from './windows'

let timer: Timer | null = null

function applyDockVisibility(show: boolean): void {
  if (process.platform !== 'darwin' || !app.dock) return
  if (show) {
    void app.dock.show()
  } else {
    app.dock.hide()
  }
}

function bootstrap(): void {
  timer = new Timer(getPrefs)
  registerIpc(timer)
  createIslandWindow()
  createSnapOverlayWindow()
  createTray(timer)
  timer.start()
}

app.whenReady().then(() => {
  applyDockVisibility(getPrefs().showDockIcon)

  bootstrap()

  // Keep dock visibility in sync with the pref.
  onPrefsChange((p) => applyDockVisibility(p.showDockIcon))
  registerGlobalShortcuts()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createIslandWindow()
  })
})

// Utility app: keep running when all windows are closed (tray stays).
app.on('window-all-closed', () => {
  // Intentionally do not quit on macOS; the tray controls lifecycle.
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  timer?.stop()
  destroyTray()
  unregisterGlobalShortcuts()
})
