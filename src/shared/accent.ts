// Accent resolution, ported and generalized from Island.dc.html renderVals.
// Focus uses the user's chosen accent; break uses a warm clay; the final
// minute of a running focus block shifts to urgent amber (see ADR / CONTEXT.md).

import type { Mode, Status } from './types'

const BREAK = '#e2a24a'
const URGENT = '#ecb24e'
const BREAK_BRIGHT = '#f4d7a4'
const URGENT_BRIGHT = '#f7dfa8'

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)))
}

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ]
}

export function hexToRgba(hex: string, alpha: number): string {
  const [r, g, b] = parseHex(hex)
  return `rgba(${r},${g},${b},${alpha})`
}

/** Mix a hex color toward white by `amount` in [0,1]. */
export function lighten(hex: string, amount: number): string {
  const [r, g, b] = parseHex(hex)
  const mix = (c: number) => clampByte(c + (255 - c) * amount)
  const toHex = (c: number) => mix(c).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/** Relative luminance in [0,1]. */
export function luminance(hex: string): number {
  const [r, g, b] = parseHex(hex)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

export interface AccentSet {
  accent: string
  accentBright: string
  accentSoft: string
}

export function resolveAccent(args: {
  base: string
  mode: Mode
  status: Status
  remaining: number
}): AccentSet {
  const { base, mode, status, remaining } = args
  const isBreak = mode === 'break'
  const isFocus = mode === 'focus'
  const isRunning = status === 'running'

  let accent = isBreak ? BREAK : base
  if (isFocus && isRunning && remaining <= 60) accent = URGENT

  let accentBright: string
  if (accent === URGENT) accentBright = URGENT_BRIGHT
  else if (isBreak) accentBright = BREAK_BRIGHT
  else accentBright = lighten(base, 0.4)

  return { accent, accentBright, accentSoft: hexToRgba(accent, 0.4) }
}
