import { Menu, nativeImage, Tray } from 'electron'
import { SHOW_HIDE_ACCELERATOR } from './shortcuts'
import { createSettingsWindow, toggleIslandVisibility } from './windows'

let tray: Tray | null = null

export function createTray(): Tray {
  // No bundled icon asset this pass; use a text title in the menu bar (macOS).
  tray = new Tray(nativeImage.createEmpty())
  tray.setTitle(' ◷ ')
  tray.setToolTip('Pomoisland — Dynamic Island Pomodoro')

  const menu = Menu.buildFromTemplate([
    {
      label: 'Show / Hide Island',
      accelerator: SHOW_HIDE_ACCELERATOR,
      click: () => toggleIslandVisibility(),
    },
    { label: 'Settings…', click: () => createSettingsWindow() },
    { type: 'separator' },
    { label: 'Quit Pomoisland', role: 'quit' },
  ])
  tray.setContextMenu(menu)
  return tray
}

export function destroyTray(): void {
  tray?.destroy()
  tray = null
}
