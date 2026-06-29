import type { Prefs } from '@shared/types'
import { useEffect, useState, type CSSProperties } from 'react'
import { paletteVars } from './palette'
import { GeneralTab, PreferencesTab } from './sections'

type Tab = 'general' | 'preferences'

const SANS = "'Inter', sans-serif"
const SERIF = "'Fraunces', serif"
const drag = { WebkitAppRegion: 'drag' } as CSSProperties
const noDrag = { WebkitAppRegion: 'no-drag' } as CSSProperties

const TABS: { k: Tab; label: string }[] = [
  { k: 'general', label: 'General' },
  { k: 'preferences', label: 'Preferences' },
]

export function SettingsApp() {
  const [prefs, setPrefsState] = useState<Prefs | null>(null)
  const [tab, setTab] = useState<Tab>('general')

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
    <div style={{ ...paletteVars(prefs.theme, prefs.accent), ...root }}>
      {/* header + tabs share the --sp-bg band and act as the drag region */}
      <div style={{ ...drag }}>
        <div style={header}>
          <div
            style={{
              fontFamily: SERIF,
              fontSize: 22,
              fontWeight: 500,
              letterSpacing: '-0.015em',
              color: 'var(--sp-text)',
              lineHeight: 1,
            }}
          >
            Settings
          </div>
          <button
            onClick={() => window.api.windows.settingsControl('close')}
            style={{ ...closeBtn, ...noDrag }}
            aria-label="Close"
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 11 11"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <line x1="1" y1="1" x2="10" y2="10" />
              <line x1="10" y1="1" x2="1" y2="10" />
            </svg>
          </button>
        </div>

        <div style={tabBar}>
          <div style={{ display: 'flex', gap: 0, width: 'fit-content', ...noDrag }}>
            {TABS.map((t) => {
              const active = tab === t.k
              return (
                <button
                  key={t.k}
                  onClick={() => setTab(t.k)}
                  style={{
                    position: 'relative',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0 20px 12px 0',
                    fontFamily: SANS,
                    fontSize: 14,
                    fontWeight: 500,
                    color: active ? 'var(--sp-text)' : 'var(--sp-muted)',
                    transition: 'color .15s',
                  }}
                >
                  {t.label}
                  {active && (
                    <span
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 20,
                        bottom: -1,
                        height: 2,
                        background: 'var(--sp-teal)',
                        borderRadius: 999,
                      }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* scrollable content */}
      <div className="sp-scroll" style={content}>
        {tab === 'general' ? (
          <GeneralTab prefs={prefs} set={set} />
        ) : (
          <PreferencesTab prefs={prefs} set={set} />
        )}
      </div>
    </div>
  )
}

const root: CSSProperties = {
  width: '100%',
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  boxSizing: 'border-box',
  fontFamily: SANS,
  background: 'var(--sp-surface)',
  color: 'var(--sp-text)',
}

const header: CSSProperties = {
  flex: '0 0 auto',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '18px 28px 0',
  background: 'var(--sp-bg)',
}

const closeBtn: CSSProperties = {
  border: '1px solid var(--sp-border)',
  cursor: 'pointer',
  background: 'transparent',
  color: 'var(--sp-muted)',
  width: 30,
  height: 30,
  padding: 0,
  borderRadius: 8,
  display: 'grid',
  placeItems: 'center',
}

const tabBar: CSSProperties = {
  flex: '0 0 auto',
  padding: '14px 28px 0',
  background: 'var(--sp-bg)',
  borderBottom: '1px solid var(--sp-line)',
}

const content: CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '24px 28px 28px',
  background: 'var(--sp-surface)',
}
