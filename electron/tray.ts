import { Menu, Tray } from 'electron'
import { fmtTime } from '../src/shared/format'
import type { Shortcuts, TimerState } from '../src/shared/types'
import { getPrefs, onPrefsChange } from './store'
import type { Timer } from './timer'
import { loadTrayIcon } from './tray-icon'
import { checkForUpdatesInteractive } from './updater'
import { createSettingsWindow, toggleIslandVisibility } from './windows'

let tray: Tray | null = null

function trayTitle(state: TimerState): string {
  switch (state.status) {
    case 'running':
    case 'paused':
      return fmtTime(state.remaining)
    case 'complete':
      return '✓'
    default:
      return ''
  }
}

function trayTooltip(state: TimerState): string {
  const mode = state.mode === 'focus' ? 'Focus' : 'Break'
  const parts = ['PomoIsland']

  switch (state.status) {
    case 'running':
      parts.push(`${mode} — ${fmtTime(state.remaining)}`)
      break
    case 'paused':
      parts.push(`${mode} paused — ${fmtTime(state.remaining)}`)
      break
    case 'complete':
      parts.push(`${mode} complete`)
      break
    default:
      parts.push('Ready')
      break
  }

  if (state.task.trim()) parts.push(state.task.trim())
  return parts.join(' · ')
}

function applyTrayState(state: TimerState): void {
  if (!tray || tray.isDestroyed()) return
  tray.setImage(loadTrayIcon())
  tray.setTitle(trayTitle(state))
  tray.setToolTip(trayTooltip(state))
}

/** Rebuilds the tray's context menu so its accelerator labels reflect `shortcuts`. */
function buildMenu(timer: Timer, shortcuts: Shortcuts): Menu {
  return Menu.buildFromTemplate([
    {
      label: 'Show / Hide Island',
      accelerator: shortcuts.showHide ?? undefined,
      click: () => toggleIslandVisibility(),
    },
    {
      label: 'Play / Pause',
      accelerator: shortcuts.playPause ?? undefined,
      click: () => timer.action({ type: 'playPause' }),
    },
    {
      label: 'Next',
      accelerator: shortcuts.next ?? undefined,
      click: () => timer.action({ type: 'skip' }),
    },
    { type: 'separator' },
    { label: 'Settings…', click: () => createSettingsWindow() },
    { label: 'Check for Updates…', click: () => checkForUpdatesInteractive() },
    { type: 'separator' },
    { label: 'Quit PomoIsland', role: 'quit' },
  ])
}

export function createTray(timer: Timer): Tray {
  tray = new Tray(loadTrayIcon())
  applyTrayState(timer.getState())
  timer.subscribe(applyTrayState)

  tray.setContextMenu(buildMenu(timer, getPrefs().shortcuts))
  onPrefsChange((p) => {
    if (!tray || tray.isDestroyed()) return
    tray.setContextMenu(buildMenu(timer, p.shortcuts))
  })

  return tray
}

export function destroyTray(): void {
  tray?.destroy()
  tray = null
}
