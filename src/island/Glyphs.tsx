// SVG glyphs ported 1:1 from Island.dc.html.
import type { Glyph } from './derive'

/** Small glyph shown in the collapsed ring center. */
export function RingGlyphSmall({ glyph, accent }: { glyph: Glyph; accent: string }) {
  switch (glyph) {
    case 'play':
      return (
        <svg width="10" height="11" viewBox="0 0 10 11">
          <path d="M1 1 L9 5.5 L1 10 Z" fill={accent} />
        </svg>
      )
    case 'pause':
      return (
        <svg width="9" height="11" viewBox="0 0 9 11">
          <rect x="0.5" width="2.6" height="11" rx="1.1" fill={accent} />
          <rect x="5.9" width="2.6" height="11" rx="1.1" fill={accent} />
        </svg>
      )
    case 'check':
      return (
        <svg width="13" height="11" viewBox="0 0 13 11" style={{ animation: 'islandPop .55s cubic-bezier(.2,1.2,.4,1)' }}>
          <path d="M1 5.5 L4.8 9.5 L12 1.5" fill="none" stroke={accent} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'cup':
      return (
        <svg width="15" height="12" viewBox="0 0 15 12">
          <path d="M2 4 h7.5 v3.2 a3.6 3.6 0 0 1 -7.5 0 z" fill="none" stroke={accent} strokeWidth="1.5" />
          <path d="M9.5 4.4 h1.8 a1.8 1.8 0 0 1 0 3.6 h-1.3" fill="none" stroke={accent} strokeWidth="1.5" />
        </svg>
      )
    case 'none':
      return null
  }
}

/** Large glyph shown in the expanded ring center (check / cup only). */
export function RingGlyphLarge({ glyph, accent }: { glyph: Glyph; accent: string }) {
  if (glyph === 'check')
    return (
      <svg width="18" height="15" viewBox="0 0 18 15">
        <path d="M1.5 7.5 L6.5 13 L16.5 2" fill="none" stroke={accent} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  if (glyph === 'cup')
    return (
      <svg width="20" height="17" viewBox="0 0 20 17">
        <path d="M3 5 h10 v4.4 a5 5 0 0 1 -10 0 z" fill="none" stroke={accent} strokeWidth="1.7" />
        <path d="M13 5.5 h2.6 a2.4 2.4 0 0 1 0 4.8 h-1.8" fill="none" stroke={accent} strokeWidth="1.7" />
      </svg>
    )
  return null
}

export function PlayPausePeek({ isPause }: { isPause: boolean }) {
  return isPause ? (
    <svg width="10" height="12" viewBox="0 0 10 12">
      <rect x="0.8" width="3" height="12" rx="1.2" fill="currentColor" />
      <rect x="6.2" width="3" height="12" rx="1.2" fill="currentColor" />
    </svg>
  ) : (
    <svg width="11" height="12" viewBox="0 0 11 12" style={{ marginLeft: 1 }}>
      <path d="M1 1 L10 6 L1 11 Z" fill="currentColor" />
    </svg>
  )
}

export function PlayPauseLarge({ isPause }: { isPause: boolean }) {
  return isPause ? (
    <svg width="16" height="18" viewBox="0 0 16 18">
      <rect x="1" width="4.4" height="18" rx="1.6" fill="currentColor" />
      <rect x="10.6" width="4.4" height="18" rx="1.6" fill="currentColor" />
    </svg>
  ) : (
    <svg width="16" height="18" viewBox="0 0 16 18" style={{ marginLeft: 2 }}>
      <path d="M1 1 L15 9 L1 17 Z" fill="currentColor" />
    </svg>
  )
}

export function SkipPeek() {
  return (
    <svg width="14" height="12" viewBox="0 0 14 12">
      <path d="M1 1 L9 6 L1 11 Z" fill="currentColor" />
      <rect x="10.4" y="0.8" width="2.5" height="10.4" rx="1" fill="currentColor" />
    </svg>
  )
}

export function SkipLarge() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path d="M2 2 L10 8 L2 14 Z" fill="currentColor" />
      <rect x="11.5" y="2" width="2.4" height="12" rx="1" fill="currentColor" />
    </svg>
  )
}

export function ResetLarge() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path d="M3 8 a5 5 0 1 0 1.5 -3.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M4 2.2 L4.3 5 L7 4.4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
