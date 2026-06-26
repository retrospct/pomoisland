// System-wide keyboard shortcuts. Registered once the app is ready and torn down
// on quit. Currently just the show/hide toggle for the island; the start/pause
// "⌥ Space" shortcut shown in Settings is still deferred (see ADR-0004).

import { globalShortcut } from 'electron'
import { toggleIslandVisibility } from './windows'

/**
 * Global show/hide accelerator. Hard-coded for now; making it user-configurable
 * (with capture + persistence) is a follow-up — see HANDOFF.md.
 */
export const SHOW_HIDE_ACCELERATOR = 'CommandOrControl+Alt+P'

export function registerGlobalShortcuts(): void {
  try {
    const ok = globalShortcut.register(SHOW_HIDE_ACCELERATOR, toggleIslandVisibility)
    if (!ok) {
      console.warn(
        `[shortcuts] Could not register ${SHOW_HIDE_ACCELERATOR} (already in use by another app?)`,
      )
    }
  } catch (err) {
    console.warn('[shortcuts] Failed to register global shortcuts:', err)
  }
}

export function unregisterGlobalShortcuts(): void {
  globalShortcut.unregisterAll()
}
