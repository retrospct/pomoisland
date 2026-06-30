import { Menu, Tray } from 'electron'
import { fmtTime } from '../src/shared/format'
import type { TimerState } from '../src/shared/types'
import { SHOW_HIDE_ACCELERATOR } from './shortcuts'
import type { Timer } from './timer'
import { loadTrayIcon } from './tray-icon'
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
  const parts = ['Pomoisland']

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

export function createTray(timer: Timer): Tray {
  tray = new Tray(loadTrayIcon())
  applyTrayState(timer.getState())
  timer.subscribe(applyTrayState)

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
