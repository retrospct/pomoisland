// Settings panel palette, ported from SettingsPanel.dc.html tokens(). The neutral
// surfaces come from the theme; the user's chosen accent drives the panel's primary
// (segmented fill, toggles, links, tint) — the pastel accent directly on dark, and a
// darkened version on light so it stays legible.

import { accentHex, darken, hexToRgba, luminance } from '@shared/accent'
import type { AccentKey, ThemeChoice } from '@shared/types'
import type { CSSProperties } from 'react'

type Tokens = Record<string, string>

const DARK: Tokens = {
  '--sp-bg': '#212429',
  '--sp-surface': '#191B1F',
  '--sp-field': '#2A2E34',
  '--sp-text': '#F2F1EC',
  '--sp-body': 'rgba(242,241,236,0.9)',
  '--sp-muted': 'rgba(242,241,236,0.62)',
  '--sp-faint': 'rgba(242,241,236,0.42)',
  '--sp-line': 'rgba(242,241,236,0.08)',
  '--sp-border': 'rgba(242,241,236,0.14)',
  '--sp-teal': '#8FC8C0',
  '--sp-tint': 'rgba(143,200,192,0.14)',
  '--sp-seg-on-bg': '#8FC8C0',
  '--sp-seg-on-text': '#17191D',
}

const LIGHT: Tokens = {
  '--sp-bg': '#F5F5F1',
  '--sp-surface': '#FCFCFA',
  '--sp-field': '#F5F5F1',
  '--sp-text': '#17191D',
  '--sp-body': '#23262B',
  '--sp-muted': '#565C63',
  '--sp-faint': '#878D93',
  '--sp-line': '#E3E1D9',
  '--sp-border': '#CFCDC4',
  '--sp-teal': '#0F5E57',
  '--sp-tint': '#E4EEEC',
  '--sp-seg-on-bg': '#0F5E57',
  '--sp-seg-on-text': '#F2F1EC',
}

export function resolveTheme(theme: ThemeChoice): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return theme
}

/** CSS custom properties applied to the Settings window root. */
export function paletteVars(theme: ThemeChoice, accent: AccentKey): CSSProperties {
  const resolved = resolveTheme(theme)
  const tok = { ...(resolved === 'dark' ? DARK : LIGHT) }
  const base = accentHex(accent)
  const primary = resolved === 'dark' ? base : darken(base, 0.55)
  tok['--sp-teal'] = primary
  tok['--sp-seg-on-bg'] = primary
  tok['--sp-seg-on-text'] = luminance(primary) > 0.55 ? '#17191D' : '#F2F1EC'
  tok['--sp-tint'] = hexToRgba(primary, resolved === 'dark' ? 0.16 : 0.12)
  return { ...tok } as CSSProperties
}
