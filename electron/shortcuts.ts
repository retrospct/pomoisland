// User-rebindable global keyboard shortcuts (show/hide, play/pause, next). See
// ADR-0007. Bindings live in `Prefs.shortcuts` (main process is the source of
// truth, per ADR-0002); this module owns the actual `globalShortcut` registration
// and the reject-and-revert validation that keeps prefs and live registrations
// in sync — "if it's saved, it's live".

import { globalShortcut } from 'electron'
import {
  DEFAULT_SHORTCUTS,
  findConflict,
  humanizeAccelerator,
  isValidAccelerator,
  SHORTCUT_ACTIONS,
  SHORTCUT_LABELS,
} from '../src/shared/shortcuts'
import type { ShortcutAction, Shortcuts } from '../src/shared/types'
import { getPrefs, setPrefs } from './store'

let handlers: Record<ShortcutAction, () => void> | null = null

/** Wires each action to its live handler. Must be called once before (un)registering. */
export function configureShortcutHandlers(h: Record<ShortcutAction, () => void>): void {
  handlers = h
}

function handlerFor(action: ShortcutAction): () => void {
  if (!handlers) throw new Error('[shortcuts] configureShortcutHandlers() was not called')
  return handlers[action]
}

/** Registers every currently-bound shortcut from prefs. Call once on app ready. */
export function registerGlobalShortcuts(): void {
  const current = getPrefs().shortcuts
  const next = { ...current }
  let driftedFromReality = false

  for (const action of SHORTCUT_ACTIONS) {
    const accelerator = current[action]
    if (!accelerator) continue
    const ok = globalShortcut.register(accelerator, handlerFor(action))
    if (!ok) {
      console.warn(`[shortcuts] Could not register ${accelerator} for ${action} (already in use?)`)
      next[action] = null
      driftedFromReality = true
    }
  }

  // Keep the persisted prefs honest with what's actually registered.
  if (driftedFromReality) setPrefs({ shortcuts: next })
}

export function unregisterGlobalShortcuts(): void {
  globalShortcut.unregisterAll()
}

/**
 * Attempts to bind `action` to `accelerator` (or unbind when `accelerator` is
 * `null`). Reject-and-revert: on failure, the previous binding is left
 * registered and persisted, and an error is returned. Never leaves prefs
 * pointing at an accelerator that isn't actually live.
 */
export function trySetShortcut(
  action: ShortcutAction,
  accelerator: string | null,
): { ok: boolean; error?: string } {
  const current = getPrefs().shortcuts
  const previous = current[action]

  if (accelerator !== null) {
    if (!isValidAccelerator(accelerator)) {
      return { ok: false, error: 'Add ⌘, ⌥, or ⌃ to this shortcut.' }
    }
    const conflict = findConflict(accelerator, action, current)
    if (conflict) {
      return { ok: false, error: `Already used by ${SHORTCUT_LABELS[conflict]}.` }
    }
  }

  // Free up the action's previous binding before trying the new one.
  if (previous) globalShortcut.unregister(previous)

  if (accelerator !== null) {
    const ok = globalShortcut.register(accelerator, handlerFor(action))
    if (!ok) {
      if (previous) globalShortcut.register(previous, handlerFor(action)) // revert
      return { ok: false, error: `${humanizeAccelerator(accelerator)} is in use by the system or another app.` }
    }
  }

  setPrefs({ shortcuts: { ...current, [action]: accelerator } })
  return { ok: true }
}

/**
 * Restores all shortcuts to `DEFAULT_SHORTCUTS`. If a default can't be
 * reclaimed (e.g. another app now holds it), that action is left unbound
 * rather than persisting a binding that isn't actually registered.
 */
export function resetShortcuts(): Shortcuts {
  const current = getPrefs().shortcuts
  for (const action of SHORTCUT_ACTIONS) {
    if (current[action]) globalShortcut.unregister(current[action]!)
  }

  const next: Shortcuts = { ...DEFAULT_SHORTCUTS }
  for (const action of SHORTCUT_ACTIONS) {
    const accelerator = DEFAULT_SHORTCUTS[action]
    if (accelerator && !globalShortcut.register(accelerator, handlerFor(action))) {
      console.warn(`[shortcuts] Could not reclaim default ${accelerator} for ${action}`)
      next[action] = null
    }
  }

  setPrefs({ shortcuts: next })
  return next
}
