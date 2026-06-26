// Settings window palette, ported from Settings.dc.html palette()/lum().
import type { ThemeChoice } from '@shared/types'
import { luminance } from '@shared/accent'

export interface SPalette {
  bg: string
  panel: string
  elev: string
  text: string
  sub: string
  faint: string
  line: string
  track: string
}

const LIGHT: SPalette = {
  bg: '#FBFAF5',
  panel: '#F1EFE7',
  elev: '#FFFFFF',
  text: '#1F2124',
  sub: '#63635A',
  faint: '#9A9A8E',
  line: 'rgba(23,25,29,0.10)',
  track: 'rgba(23,25,29,0.14)',
}

const DARK: SPalette = {
  bg: '#191B1F',
  panel: '#212429',
  elev: '#2A2E34',
  text: '#F2F1EC',
  sub: 'rgba(242,241,236,0.62)',
  faint: 'rgba(242,241,236,0.4)',
  line: 'rgba(242,241,236,0.10)',
  track: 'rgba(242,241,236,0.16)',
}

export function resolveTheme(theme: ThemeChoice): 'light' | 'dark' {
  if (theme === 'auto') {
    return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  }
  return theme
}

export function palette(theme: ThemeChoice): SPalette {
  return resolveTheme(theme) === 'light' ? LIGHT : DARK
}

export function accentInk(accent: string): string {
  return luminance(accent) > 0.6 ? '#17191D' : '#FFFFFF'
}

/** CSS custom properties applied to the Settings window root. */
export function paletteVars(theme: ThemeChoice, accent: string): React.CSSProperties {
  const p = palette(theme)
  return {
    ['--s-bg' as string]: p.bg,
    ['--s-panel' as string]: p.panel,
    ['--s-elev' as string]: p.elev,
    ['--s-text' as string]: p.text,
    ['--s-sub' as string]: p.sub,
    ['--s-faint' as string]: p.faint,
    ['--s-line' as string]: p.line,
    ['--s-track' as string]: p.track,
    ['--s-accent' as string]: accent,
    ['--s-accent-ink' as string]: accentInk(accent),
  }
}
