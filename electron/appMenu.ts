// Native macOS application menu bar.
//
// This is a menu-bar utility (LSUIElement), so the menu bar only appears while a
// PomoIsland window is focused. We keep it minimal but standard: the app menu hosts
// "Preferences…" (⌘,, opens Settings — the conventional way to reach it, not a global
// shortcut) and "Check for Updates…" plus About/Hide/Quit; Edit gives the Settings
// window native copy/paste/undo shortcuts; Window is the usual minimize/zoom/close.

import { app, Menu, type MenuItemConstructorOptions } from 'electron'
import { checkForUpdatesInteractive } from './updater'
import { createSettingsWindow } from './windows'

export function buildAppMenu(): Menu {
  const template: MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { label: 'Preferences…', accelerator: 'CmdOrCtrl+,', click: () => createSettingsWindow() },
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
