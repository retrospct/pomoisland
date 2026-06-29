// Island window token set — neutral surface/text/track/border colors for light and dark mode,
// mirroring src/settings/palette.ts. Applied as CSS custom properties on the island root so
// every descendant can reference `var(--il-*)`.
//
// The island does NOT share the Settings `--sp-*` tokens: it is a different window with
// different visual weight. Accent colors are handled separately by `resolveAccent` in derive.ts.

import type { CSSProperties } from 'react'
import type { ThemeChoice } from '@shared/types'

type Tokens = Record<string, string>

const DARK: Tokens = {
  '--il-bg': '#17191D',
  '--il-bg-menu': '#23262B',
  '--il-text': '#F2F1EC',
  '--il-body': 'rgba(242,241,236,0.85)',
  '--il-muted': 'rgba(242,241,236,0.7)',
  '--il-track': 'rgba(242,241,236,0.13)',
  '--il-border': 'rgba(242,241,236,0.1)',
  '--il-border-btn': 'rgba(242,241,236,0.18)',
  '--il-line': 'rgba(242,241,236,0.09)',
  '--il-teal': '#8FC8C0',
  '--il-icon': '#B8BDC2',
  '--il-hover': 'rgba(242,241,236,0.08)',
}

const LIGHT: Tokens = {
  '--il-bg': '#FAFAF8',
  '--il-bg-menu': '#F0F0EC',
  '--il-text': '#17191D',
  '--il-body': 'rgba(23,25,29,0.78)',
  '--il-muted': 'rgba(23,25,29,0.62)',
  '--il-track': 'rgba(23,25,29,0.1)',
  '--il-border': 'rgba(23,25,29,0.1)',
  '--il-border-btn': 'rgba(23,25,29,0.15)',
  '--il-line': 'rgba(23,25,29,0.08)',
  '--il-teal': '#0F5E57',
  '--il-icon': '#565C63',
  '--il-hover': 'rgba(23,25,29,0.06)',
}

/** Neutral JS-side colors for derive.ts (taskColor + inactive dot) — keyed by resolved theme. */
export const ISLAND_NEUTRAL = {
  dark: {
    taskColor: 'rgba(242,241,236,0.62)',
    taskDim: 'rgba(242,241,236,0.4)',
    dotInactive: 'rgba(242,241,236,0.22)',
  },
  light: {
    taskColor: 'rgba(23,25,29,0.55)',
    taskDim: 'rgba(23,25,29,0.38)',
    dotInactive: 'rgba(23,25,29,0.18)',
  },
}

export function resolveTheme(theme: ThemeChoice): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return theme
}

/** CSS custom properties applied to the island window root. */
export function islandPaletteVars(theme: ThemeChoice): CSSProperties {
  const resolved = resolveTheme(theme)
  return { ...(resolved === 'dark' ? DARK : LIGHT) } as CSSProperties
}
