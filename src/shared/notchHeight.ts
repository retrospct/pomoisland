// Shared notch-height-mode logic, used by both the island renderer (to compute
// the docked band height) and the settings renderer (to default/clamp the custom
// stepper against the SAME numbers) — see NotchHeightMode in types.ts.

import type { NotchHeightMode } from './types'

/** Standard MacBook notch height, used as the 'realNotch' fallback on non-notch displays. */
export const REAL_NOTCH_STD = 38
/** Ceiling for the custom stepper — comfortably above real-world notch/menu-bar heights. */
export const NOTCH_HEIGHT_CUSTOM_MAX = 60
export const NOTCH_HEIGHT_STEP = 2

/** The height a non-custom preset resolves to for the current display. */
export function presetNotchHeight(
  mode: 'menubar' | 'realNotch',
  menubarHeight: number,
  hasNotch: boolean,
): number {
  return mode === 'realNotch' ? (hasNotch ? menubarHeight : REAL_NOTCH_STD) : menubarHeight
}

/** The effective docked-band height for any mode, including 'custom'. */
export function resolveNotchHeight(opts: {
  mode: NotchHeightMode
  menubarHeight: number
  hasNotch: boolean
  custom: number
}): number {
  if (opts.mode === 'custom') return opts.custom
  return presetNotchHeight(opts.mode, opts.menubarHeight, opts.hasNotch)
}
