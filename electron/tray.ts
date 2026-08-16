import { Menu, Tray } from 'electron'
import { fmtTime } from '../src/shared/format'
import type { Placement, Prefs, TimerState } from '../src/shared/types'
import { updateMenuItem } from './appMenu'
import { getPrefs, onPrefsChange, setPrefs } from './store'
import type { Timer } from './timer'
import { loadTrayIcon } from './tray-icon'
import { onUpdateReady } from './updater'
import {
  createSettingsWindow,
  getPlacement,
  onPlacementChange,
  toggleIslandVisibility,
} from './windows'

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

/**
 * Rebuilds the tray's context menu so its accelerator labels reflect
 * `prefs.shortcuts` and the Always on Top item reflects `prefs.alwaysTop` plus
 * the current placement.
 */
function buildMenu(timer: Timer, prefs: Prefs, placement: Placement): Menu {
  return Menu.buildFromTemplate([
    {
      label: 'Show / Hide Island',
      accelerator: prefs.shortcuts.showHide ?? undefined,
      click: () => toggleIslandVisibility(),
    },
    {
      label: 'Play / Pause',
      accelerator: prefs.shortcuts.playPause ?? undefined,
      click: () => timer.action({ type: 'playPause' }),
    },
    {
      label: 'Next',
      accelerator: prefs.shortcuts.next ?? undefined,
      click: () => timer.action({ type: 'skip' }),
    },
    { type: 'separator' },
    {
      // Docked, applyIslandWindowLevel() forces 'screen-saver' level so the island
      // can paint over the menu bar (ADR-0006) — the pref only bites once the
      // island floats. Stay enabled (setting it before undocking is legitimate)
      // but say so in the label rather than silently no-op'ing.
      type: 'checkbox',
      label: placement.snapped ? 'Always on Top (floating only)' : 'Always on Top',
      checked: prefs.alwaysTop,
      // Read through getPrefs() rather than the captured `prefs` so a menu built
      // before an unrelated pref write can't invert a stale value.
      click: () => setPrefs({ alwaysTop: !getPrefs().alwaysTop }),
    },
    { label: 'Settings…', click: () => createSettingsWindow() },
    updateMenuItem(),
    { type: 'separator' },
    { label: 'Quit PomoIsland', role: 'quit' },
  ])
}

export function createTray(timer: Timer): Tray {
  tray = new Tray(loadTrayIcon())
  applyTrayState(timer.getState())
  timer.subscribe(applyTrayState)

  const rebuild = (): void => {
    if (!tray || tray.isDestroyed()) return
    tray.setContextMenu(buildMenu(timer, getPrefs(), getPlacement()))
  }

  rebuild()
  onPrefsChange(rebuild)
  // Rebuild so "Check for Updates…" becomes "Restart to Update" when one is ready.
  onUpdateReady(rebuild)
  // Snap/unsnap flips the Always on Top label to/from "(floating only)". Dedupe on
  // `snapped`: broadcastPlacement fires on every dragMove, and rebuilding the
  // native menu at mouse-move rate would be gratuitous. Same lastApplied shape as
  // electron/launchLogin.ts.
  let lastSnapped = getPlacement().snapped
  onPlacementChange((p) => {
    if (p.snapped === lastSnapped) return
    lastSnapped = p.snapped
    rebuild()
  })

  return tray
}

export function destroyTray(): void {
  tray?.destroy()
  tray = null
}
