// Native macOS application menu bar.
//
// This is a menu-bar utility (LSUIElement), so the menu bar only appears while a
// PomoIsland window is focused. We keep it minimal but standard: the app menu hosts
// "Check for Updates…" — the macOS-conventional home for it — plus About/Hide/Quit;
// Edit gives the Settings window native copy/paste/undo shortcuts; Window is the
// usual minimize/zoom/close.

import { app, Menu, type MenuItemConstructorOptions } from 'electron'
import { checkForUpdatesInteractive } from './updater'

export function buildAppMenu(): Menu {
  const template: MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { label: 'Check for Updates…', click: () => checkForUpdatesInteractive() },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    { role: 'editMenu' },
    { role: 'windowMenu' },
  ]
  return Menu.buildFromTemplate(template)
}
