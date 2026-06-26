import { app, BrowserWindow } from 'electron'
import { getPrefs } from './store'
import { Timer } from './timer'
import { registerIpc } from './ipc'
import { createIslandWindow } from './windows'
import { createTray, destroyTray } from './tray'

let timer: Timer | null = null

function bootstrap(): void {
  timer = new Timer(getPrefs)
  registerIpc(timer)
  createIslandWindow()
  createTray()
  timer.start()
}

app.whenReady().then(() => {
  // The island is a menu-bar / always-on-top utility; keep it out of the Dock.
  if (process.platform === 'darwin' && app.dock) app.dock.hide()

  bootstrap()

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
})
