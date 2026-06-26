import { Menu, nativeImage, Tray } from 'electron'
import { createSettingsWindow, getIslandWindow } from './windows'

let tray: Tray | null = null

export function createTray(): Tray {
  // No bundled icon asset this pass; use a text title in the menu bar (macOS).
  tray = new Tray(nativeImage.createEmpty())
  tray.setTitle(' ◷ ')
  tray.setToolTip('Pomisland — Dynamic Island Pomodoro')

  const menu = Menu.buildFromTemplate([
    {
      label: 'Show / Hide Island',
      click: () => {
        const win = getIslandWindow()
        if (!win) return
        if (win.isVisible()) win.hide()
        else win.show()
      },
    },
    { label: 'Settings…', click: () => createSettingsWindow() },
    { type: 'separator' },
    { label: 'Quit Pomisland', role: 'quit' },
  ])
  tray.setContextMenu(menu)
  return tray
}

export function destroyTray(): void {
  tray?.destroy()
  tray = null
}
