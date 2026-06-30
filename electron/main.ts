import { app, BrowserWindow } from 'electron'
import { registerIpc } from './ipc'
import { registerGlobalShortcuts, unregisterGlobalShortcuts } from './shortcuts'
import { getPrefs } from './store'
import { Timer } from './timer'
import { createTray, destroyTray } from './tray'
import { createIslandWindow, createSnapOverlayWindow } from './windows'

let timer: Timer | null = null

function bootstrap(): void {
  timer = new Timer(getPrefs)
  registerIpc(timer)
  createIslandWindow()
  createSnapOverlayWindow()
  createTray(timer)
  timer.start()
}

app.whenReady().then(() => {
  // The island is a menu-bar / always-on-top utility; keep it out of the Dock.
  if (process.platform === 'darwin' && app.dock) app.dock.hide()

  bootstrap()
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
