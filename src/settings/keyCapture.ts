// Turns a captured browser KeyboardEvent into an Electron accelerator string, for
// the shortcut-rebinding chips in Settings (see ADR-0007). This app is macOS-only,
// so only the Mac modifier set is handled. Validity (must include a strong
// modifier) and conflict checks are NOT done here — they're the main process's
// job (single source of truth), reached via window.api.shortcuts.set.

const SPECIAL_KEYS: Record<string, string> = {
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  ' ': 'Space',
  Enter: 'Return',
  Tab: 'Tab',
  Backspace: 'Backspace',
  Delete: 'Delete',
}

const BARE_MODIFIER_KEYS = new Set(['Meta', 'Alt', 'Control', 'Shift'])

/** True while only a modifier key itself is held — the capture should keep waiting. */
export function isBareModifierKey(e: KeyboardEvent): boolean {
  return BARE_MODIFIER_KEYS.has(e.key)
}

/**
 * Builds an Electron accelerator string (e.g. "CommandOrControl+Alt+Up") from a
 * captured keydown. Returns `null` for bare-modifier keydowns (still recording)
 * or keys with no accelerator representation.
 */
export function acceleratorFromEvent(e: KeyboardEvent): string | null {
  if (isBareModifierKey(e)) return null

  const parts: string[] = []
  if (e.metaKey) parts.push('CommandOrControl')
  if (e.altKey) parts.push('Alt')
  if (e.ctrlKey) parts.push('Control')
  if (e.shiftKey) parts.push('Shift')

  let key = SPECIAL_KEYS[e.key]
  if (!key) {
    if (/^[a-zA-Z]$/.test(e.key)) key = e.key.toUpperCase()
    else if (/^[0-9]$/.test(e.key)) key = e.key
    else if (/^F([1-9]|1[0-9]|2[0-4])$/.test(e.key)) key = e.key
    else if (e.key.length === 1) key = e.key // punctuation — best effort
    else return null
  }

  parts.push(key)
  return parts.join('+')
}
