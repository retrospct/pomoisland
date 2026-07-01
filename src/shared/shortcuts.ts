// Defaults, labels, and Electron-accelerator helpers for the user-rebindable global
// shortcuts (show/hide, play/pause, next). See ADR-0007. Pure string logic only — no
// Electron or DOM APIs — so it's safely importable from both the main process and
// the Settings renderer.

import type { ShortcutAction, Shortcuts } from './types'

export const SHORTCUT_ACTIONS: ShortcutAction[] = ['showHide', 'playPause', 'next']

export const SHORTCUT_LABELS: Record<ShortcutAction, string> = {
  showHide: 'Show/hide island',
  playPause: 'Play/pause',
  next: 'Next',
}

/** The ⌘⌥-arrow family. ⌘⌥← is reserved for a future prev/reset action. */
export const DEFAULT_SHORTCUTS: Shortcuts = {
  showHide: 'CommandOrControl+Alt+Up',
  playPause: 'CommandOrControl+Alt+Down',
  next: 'CommandOrControl+Alt+Right',
}

const STRONG_MODIFIER_TOKENS = new Set([
  'CommandOrControl',
  'Cmd',
  'Command',
  'Control',
  'Ctrl',
  'Alt',
  'Option',
])

/** A captured accelerator must include at least one of ⌘/⌃/⌥ (Shift alone doesn't count). */
export function isValidAccelerator(accelerator: string): boolean {
  return accelerator.split('+').some((part) => STRONG_MODIFIER_TOKENS.has(part))
}

/** The other action (if any) already bound to `accelerator`. */
export function findConflict(
  accelerator: string,
  action: ShortcutAction,
  shortcuts: Shortcuts,
): ShortcutAction | null {
  const other = SHORTCUT_ACTIONS.find((a) => a !== action && shortcuts[a] === accelerator)
  return other ?? null
}

const GLYPHS: Record<string, string> = {
  CommandOrControl: '⌘',
  Cmd: '⌘',
  Command: '⌘',
  Control: '⌃',
  Ctrl: '⌃',
  Alt: '⌥',
  Option: '⌥',
  Shift: '⇧',
  Up: '↑',
  Down: '↓',
  Left: '←',
  Right: '→',
  Return: '⏎',
  Escape: 'Esc',
}

/** Renders an Electron accelerator string as compact glyphs, e.g. "⌘⌥↑". */
export function humanizeAccelerator(accelerator: string): string {
  return accelerator
    .split('+')
    .map((part) => GLYPHS[part] ?? part)
    .join('')
}
