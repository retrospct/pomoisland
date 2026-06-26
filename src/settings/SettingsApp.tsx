import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import type { Prefs } from '@shared/types'
import { paletteVars } from './palette'
import { AppearanceSection, BehaviorSection, SoundsSection, TimerSection } from './sections'

type Section = 'timer' | 'sounds' | 'appearance' | 'behavior'

const MONO = "'IBM Plex Mono', monospace"
const SANS = "'Inter', sans-serif"
const drag = { WebkitAppRegion: 'drag' } as CSSProperties
const noDrag = { WebkitAppRegion: 'no-drag' } as CSSProperties

const NAV: { k: Section; label: string; icon: ReactNode }[] = [
  {
    k: 'timer',
    label: 'Timer',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    ),
  },
  {
    k: 'sounds',
    label: 'Sounds & Alerts',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 9v6h4l5 4V5L8 9H4z" />
        <path d="M17 8.5a4 4 0 0 1 0 7" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    k: 'appearance',
    label: 'Appearance',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3a9 9 0 0 0 0 18c1.7 0 2-1.3 1-2.3-.8-.8-.3-2.2.8-2.2H17a4 4 0 0 0 4-4c0-5-4-9.5-9-9.5z" />
      </svg>
    ),
  },
  {
    k: 'behavior',
    label: 'Behavior',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M5 7h14M5 12h14M5 17h14" strokeLinecap="round" />
        <circle cx="9" cy="7" r="2.2" fill="var(--s-panel)" />
        <circle cx="15" cy="17" r="2.2" fill="var(--s-panel)" />
      </svg>
    ),
  },
]

export function SettingsApp() {
  const [prefs, setPrefsState] = useState<Prefs | null>(null)
  const [section, setSection] = useState<Section>('timer')

  useEffect(() => {
    let alive = true
    void window.api.prefs.get().then((p) => alive && setPrefsState(p))
    const off = window.api.prefs.onChange(setPrefsState)
    return () => {
      alive = false
      off()
    }
  }, [])

  if (!prefs) return null

  const set = (patch: Partial<Prefs>) => {
    setPrefsState((cur) => (cur ? { ...cur, ...patch } : cur)) // optimistic
    window.api.prefs.set(patch)
  }

  return (
    <div style={{ ...paletteVars(prefs.theme, prefs.accent), ...windowStyle }}>
      {/* title bar */}
      <div style={{ ...titleBar, ...drag }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...noDrag }}>
          <button onClick={() => window.api.windows.settingsControl('close')} title="Close" style={{ ...dot, background: '#ED6A5E' }} />
          <button onClick={() => window.api.windows.settingsControl('minimize')} title="Minimize" style={{ ...dot, background: '#F4BF4F' }} />
          <button onClick={() => window.api.windows.settingsControl('zoom')} title="Zoom" style={{ ...dot, background: '#61C554' }} />
        </div>
        <div style={{ flex: 1, textAlign: 'center', fontFamily: MONO, fontSize: 11, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'var(--s-faint)' }}>
          Pomodoro · Settings
        </div>
        <div style={{ width: 54 }} />
      </div>

      {/* body */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* sidebar */}
        <div style={sidebar}>
          {NAV.map((n) => {
            const active = section === n.k
            return (
              <button key={n.k} onClick={() => setSection(n.k)} style={navBtn}>
                {active && <span style={navActive} />}
                <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 11 }}>
                  {n.icon}
                  <span>{n.label}</span>
                </span>
              </button>
            )
          })}
          <div style={{ flex: 1 }} />
          <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.1em', color: 'var(--s-faint)', padding: '8px 10px' }}>
            v1.0 · {prefs.longEvery} sessions / round
          </div>
        </div>

        {/* content */}
        <div style={{ flex: 1, minWidth: 0, overflow: 'auto', padding: '24px 28px 30px', background: 'var(--s-bg)' }}>
          {section === 'timer' && <TimerSection prefs={prefs} set={set} />}
          {section === 'sounds' && <SoundsSection prefs={prefs} set={set} />}
          {section === 'appearance' && <AppearanceSection prefs={prefs} set={set} />}
          {section === 'behavior' && <BehaviorSection prefs={prefs} set={set} />}
        </div>
      </div>
    </div>
  )
}

const windowStyle: CSSProperties = {
  width: '100vw',
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  boxSizing: 'border-box',
  fontFamily: SANS,
  background: 'var(--s-bg)',
  color: 'var(--s-text)',
}

const titleBar: CSSProperties = {
  flex: '0 0 auto',
  height: 44,
  display: 'flex',
  alignItems: 'center',
  padding: '0 16px',
  gap: 14,
  borderBottom: '1px solid var(--s-line)',
  background: 'var(--s-panel)',
}

const dot: CSSProperties = { width: 12, height: 12, borderRadius: 999, border: 'none', padding: 0, cursor: 'pointer' }

const sidebar: CSSProperties = {
  flex: '0 0 188px',
  background: 'var(--s-panel)',
  borderRight: '1px solid var(--s-line)',
  padding: '14px 12px',
  display: 'flex',
  flexDirection: 'column',
  gap: 3,
}

const navBtn: CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  gap: 11,
  width: '100%',
  textAlign: 'left',
  padding: '9px 11px',
  borderRadius: 9,
  cursor: 'pointer',
  border: 'none',
  background: 'transparent',
  fontFamily: SANS,
  fontSize: 13,
  color: 'var(--s-text)',
}

const navActive: CSSProperties = {
  position: 'absolute',
  inset: 0,
  borderRadius: 9,
  background: 'var(--s-elev)',
  boxShadow: 'inset 2px 0 0 var(--s-accent)',
  zIndex: 0,
}
