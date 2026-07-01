// Settings tab bodies, ported from SettingsPanel.dc.html. Two tabs:
//   General      → Timer preset / durations / shortcuts+goal + Behavior
//   Preferences  → Colors / timer style / element placement + Alarm & sound / Done animation
// Every control writes straight through to prefs (optimistic in SettingsApp).

import { ACCENT_HEX, accentHex, hexToRgba, lighten } from '@shared/accent'
import { NotchProgress, TIMER_STYLE_META } from '@shared/NotchProgress'
import {
  NOTCH_HEIGHT_CUSTOM_MAX,
  NOTCH_HEIGHT_STEP,
  REAL_NOTCH_STD,
  presetNotchHeight,
} from '@shared/notchHeight'
import { RIPPLE_DEFS } from '@shared/ripple'
import {
  DEFAULT_SHORTCUTS,
  humanizeAccelerator,
  SHORTCUT_ACTIONS,
  SHORTCUT_LABELS,
} from '@shared/shortcuts'
import { SOUND_LABELS, TICK_LABELS, playSound, previewTick } from '@shared/sound'
import { useReducedMotion } from '@shared/useReducedMotion'
import type {
  AccentKey,
  FloatingLayout,
  IslandElement,
  IslandSlot,
  Placement,
  Prefs,
  Ripple,
  ShortcutAction,
  Sound,
  ThemeChoice,
  TickSound,
} from '@shared/types'
import type { CSSProperties, ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { acceleratorFromEvent } from './keyCapture'

/** Circular arrow — reset to default. */
function ResetIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 13 13"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
    >
      <path d="M1.5 6.5a5 5 0 1 0 1-2.9" />
      <path d="M1.5 1.5v3h3" />
    </svg>
  )
}

const MONO = "'IBM Plex Mono', monospace"
const SANS = "'Inter', sans-serif"

export interface TabProps {
  prefs: Prefs
  set: (patch: Partial<Prefs>) => void
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))
const cssVar = (name: string, value: string | number) => ({ [name]: value }) as CSSProperties

// ---- primitives ----

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontFamily: MONO,
        fontSize: 10.5,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'var(--sp-faint)',
        marginBottom: 11,
        fontWeight: 500,
      }}
    >
      {children}
    </div>
  )
}

function ToggleSwitch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'relative',
        width: 40,
        height: 23,
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        background: 'transparent',
        flex: '0 0 auto',
      }}
    >
      <span
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 999,
          background: on ? 'var(--sp-teal)' : 'var(--sp-border)',
          transition: 'background .18s',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 3,
            left: 3,
            width: 17,
            height: 17,
            borderRadius: '50%',
            background: 'var(--sp-surface)',
            boxShadow: '0 1px 2px rgba(0,0,0,.22)',
            transform: on ? 'translateX(17px)' : 'none',
            transition: 'transform .18s',
            display: 'block',
          }}
        />
      </span>
    </button>
  )
}

function ToggleRow({
  title,
  desc,
  on,
  onClick,
  border = true,
}: {
  title: string
  desc: string
  on: boolean
  onClick: () => void
  border?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        paddingTop: border ? 11 : 0,
        borderTop: border ? '1px solid var(--sp-line)' : 'none',
      }}
    >
      <div>
        <div style={{ fontFamily: SANS, fontSize: 13.5, color: 'var(--sp-body)' }}>{title}</div>
        <div
          style={{
            fontFamily: SANS,
            fontSize: 11.5,
            color: 'var(--sp-faint)',
            marginTop: 2,
            lineHeight: 1.35,
          }}
        >
          {desc}
        </div>
      </div>
      <ToggleSwitch on={on} onClick={onClick} />
    </div>
  )
}

function StepButton({
  children,
  onClick,
  size = 26,
}: {
  children: ReactNode
  onClick: () => void
  size?: number
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: size,
        height: size,
        borderRadius: size >= 28 ? 8 : 7,
        border: '1px solid var(--sp-border)',
        background: size >= 28 ? 'var(--sp-field)' : 'var(--sp-surface)',
        color: 'var(--sp-body)',
        cursor: 'pointer',
        fontSize: 16,
        lineHeight: 1,
        display: 'grid',
        placeItems: 'center',
        padding: 0,
      }}
    >
      {children}
    </button>
  )
}

function Chip({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: `1px solid ${on ? 'var(--sp-teal)' : 'var(--sp-border)'}`,
        background: on ? 'var(--sp-tint)' : 'transparent',
        color: on ? 'var(--sp-teal)' : 'var(--sp-muted)',
        cursor: 'pointer',
        padding: '7px 14px',
        borderRadius: 999,
        fontFamily: SANS,
        fontSize: 12.5,
        fontWeight: on ? 600 : 500,
        transition: 'all .15s',
      }}
    >
      {label}
    </button>
  )
}

function RetractControl({
  label,
  desc,
  value,
  defaultValue,
  min,
  max,
  onChange,
}: {
  label: string
  desc: string
  value: number
  defaultValue: number
  min: number
  max: number
  onChange: (v: number) => void
}) {
  const fmt = (ms: number) => (ms / 1000).toFixed(1) + 's'
  const isDefault = value === defaultValue
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}
    >
      <div>
        <div style={{ fontFamily: SANS, fontSize: 13.5, color: 'var(--sp-body)' }}>{label}</div>
        <div style={{ fontFamily: SANS, fontSize: 11.5, color: 'var(--sp-faint)', marginTop: 2 }}>
          {desc}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: '0 0 auto' }}>
        <button
          title={`Reset to default (${fmt(defaultValue)})`}
          onClick={() => onChange(defaultValue)}
          style={{
            width: 26,
            height: 26,
            borderRadius: 7,
            border: '1px solid var(--sp-border)',
            background: 'var(--sp-surface)',
            color: 'var(--sp-muted)',
            cursor: isDefault ? 'default' : 'pointer',
            display: 'grid',
            placeItems: 'center',
            padding: 0,
            opacity: isDefault ? 0.35 : 1,
            transition: 'opacity .15s',
          }}
        >
          <ResetIcon />
        </button>
        <StepButton onClick={() => onChange(Math.max(min, value - 100))}>&minus;</StepButton>
        <span
          style={{
            fontFamily: MONO,
            fontSize: 13,
            color: 'var(--sp-teal)',
            minWidth: 38,
            textAlign: 'center',
          }}
        >
          {fmt(value)}
        </span>
        <StepButton onClick={() => onChange(Math.min(max, value + 100))}>+</StepButton>
      </div>
    </div>
  )
}

/**
 * "Docked height" mode picker + custom-height stepper. Fetches live placement
 * (via the same IPC the island window uses) so the custom bounds and the
 * default-on-switch value track the actual current display, not a guess.
 */
function NotchHeightSection({ prefs, set }: TabProps) {
  const [placement, setPlacement] = useState<Placement | null>(null)

  useEffect(() => {
    let alive = true
    void window.api.island.getPlacement().then((p) => alive && setPlacement(p))
    const off = window.api.island.onPlacement((p) => alive && setPlacement(p))
    return () => {
      alive = false
      off()
    }
  }, [])

  // Fall back to the standard notch height until placement arrives, so the
  // control isn't unusable (NaN) on first paint.
  const menubarHeight = placement?.notchHeight ?? REAL_NOTCH_STD
  const hasNotch = placement?.hasNotch ?? false
  const min = menubarHeight
  const max = NOTCH_HEIGHT_CUSTOM_MAX
  const custom = Math.min(max, Math.max(min, prefs.notchHeightCustom ?? min))

  return (
    <div style={{ marginTop: 22 }}>
      <SectionLabel>Notch height</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <span style={{ fontFamily: SANS, fontSize: 13, color: 'var(--sp-body)' }}>Docked height</span>
          <div style={{ display: 'flex', gap: 3, background: 'var(--sp-field)', border: '1px solid var(--sp-border)', borderRadius: 11, padding: 3 }}>
            {(
              [
                { k: 'menubar', label: 'Menu bar' },
                { k: 'realNotch', label: 'Real notch' },
                { k: 'custom', label: 'Custom' },
              ] as const
            ).map((m) => {
              const on = prefs.notchHeightMode === m.k
              return (
                <button
                  key={m.k}
                  onClick={() => {
                    if (m.k === 'custom' && prefs.notchHeightMode !== 'custom') {
                      // Default the custom value to whatever the outgoing preset
                      // was showing, so switching to Custom doesn't jump the height.
                      const seed = presetNotchHeight(prefs.notchHeightMode, menubarHeight, hasNotch)
                      set({ notchHeightMode: 'custom', notchHeightCustom: seed })
                    } else {
                      set({ notchHeightMode: m.k })
                    }
                  }}
                  style={{
                    height: 30, minWidth: 34, padding: '0 12px', border: 'none', cursor: 'pointer',
                    borderRadius: 8, background: on ? 'var(--sp-seg-on-bg)' : 'transparent',
                    color: on ? 'var(--sp-seg-on-text)' : 'var(--sp-faint)', fontFamily: SANS, fontSize: 12.5, fontWeight: 500,
                  }}
                >
                  {m.label}
                </button>
              )
            })}
          </div>
        </div>
        {prefs.notchHeightMode === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <div style={{ fontFamily: SANS, fontSize: 13.5, color: 'var(--sp-body)' }}>Custom height</div>
              <div style={{ fontFamily: SANS, fontSize: 11.5, color: 'var(--sp-faint)', marginTop: 2 }}>
                Snapped island band height, {min}–{max}px (min is the menu bar)
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: '0 0 auto' }}>
              <StepButton onClick={() => set({ notchHeightCustom: Math.max(min, custom - NOTCH_HEIGHT_STEP) })}>
                &minus;
              </StepButton>
              <span style={{ fontFamily: MONO, fontSize: 13, color: 'var(--sp-teal)', minWidth: 44, textAlign: 'center' }}>
                {custom}px
              </span>
              <StepButton onClick={() => set({ notchHeightCustom: Math.min(max, custom + NOTCH_HEIGHT_STEP) })}>
                +
              </StepButton>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ---- Keyboard shortcuts (ADR-0007) ----

const SHORTCUT_DESCRIPTIONS: Record<ShortcutAction, string> = {
  showHide: 'Toggle the island’s visibility.',
  playPause: 'Start or pause the current block.',
  next: 'Skip to the next block.',
}

/**
 * One rebindable shortcut row. Click the chip to capture the next chord; Esc
 * cancels. Validity and conflict checks happen in the main process (reject-and-
 * revert, see ADR-0007) — this component just displays whatever error comes back.
 */
function ShortcutRow({
  action,
  value,
  border,
}: {
  action: ShortcutAction
  value: string | null
  border: boolean
}) {
  const [recording, setRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!recording) return
    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (e.key === 'Escape') {
        setRecording(false)
        return
      }
      const accelerator = acceleratorFromEvent(e)
      if (!accelerator) return // bare modifier — keep waiting for the real key
      setRecording(false)
      void window.api.shortcuts.set(action, accelerator).then((res) => {
        if (!res.ok) {
          setError(res.error ?? 'Could not set shortcut.')
          window.setTimeout(() => setError(null), 2600)
        }
      })
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [recording, action])

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        paddingTop: border ? 11 : 0,
        borderTop: border ? '1px solid var(--sp-line)' : 'none',
      }}
    >
      <div>
        <div style={{ fontFamily: SANS, fontSize: 13.5, color: 'var(--sp-body)' }}>
          {SHORTCUT_LABELS[action]}
        </div>
        <div
          style={{
            fontFamily: SANS,
            fontSize: 11.5,
            color: error ? '#e5484d' : 'var(--sp-faint)',
            marginTop: 2,
          }}
        >
          {error ?? SHORTCUT_DESCRIPTIONS[action]}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '0 0 auto' }}>
        <button
          onClick={() => {
            setError(null)
            setRecording(true)
          }}
          style={{
            fontFamily: MONO,
            fontSize: 12,
            minWidth: 90,
            textAlign: 'center',
            color: recording ? 'var(--sp-teal)' : value ? 'var(--sp-body)' : 'var(--sp-faint)',
            background: recording ? 'var(--sp-tint)' : 'var(--sp-field)',
            border: `1px solid ${recording ? 'var(--sp-teal)' : 'var(--sp-border)'}`,
            borderRadius: 7,
            padding: '5px 10px',
            cursor: 'pointer',
          }}
        >
          {recording ? 'Press keys…' : value ? humanizeAccelerator(value) : 'Add shortcut'}
        </button>
        {value && !recording && (
          <button
            title="Unbind"
            onClick={() => void window.api.shortcuts.set(action, null)}
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              border: 'none',
              background: 'transparent',
              color: 'var(--sp-faint)',
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center',
              padding: 0,
              fontSize: 12,
            }}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}

function ReadOnlyShortcutRow({ label, desc, keys }: { label: string; desc: string; keys: string[] }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        paddingTop: 11,
        borderTop: '1px solid var(--sp-line)',
      }}
    >
      <div>
        <div style={{ fontFamily: SANS, fontSize: 13.5, color: 'var(--sp-body)' }}>{label}</div>
        <div style={{ fontFamily: SANS, fontSize: 11.5, color: 'var(--sp-faint)', marginTop: 2 }}>
          {desc}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flex: '0 0 auto' }}>
        {keys.map((k) => (
          <Kbd key={k}>{k}</Kbd>
        ))}
      </div>
    </div>
  )
}

function KeyboardShortcutsSection({ prefs }: { prefs: Prefs }) {
  const [resetting, setResetting] = useState(false)
  const isDefault = SHORTCUT_ACTIONS.every((a) => prefs.shortcuts[a] === DEFAULT_SHORTCUTS[a])

  const reset = async () => {
    setResetting(true)
    try {
      await window.api.shortcuts.reset()
    } finally {
      setResetting(false)
    }
  }

  return (
    <div style={{ marginTop: 20 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 11,
        }}
      >
        <SectionLabel>Keyboard shortcuts</SectionLabel>
        <button
          title="Reset to defaults"
          onClick={() => void reset()}
          disabled={resetting || isDefault}
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            border: 'none',
            background: 'transparent',
            color: 'var(--sp-faint)',
            cursor: isDefault ? 'default' : 'pointer',
            display: 'grid',
            placeItems: 'center',
            padding: 0,
            opacity: isDefault ? 0.35 : 1,
          }}
        >
          <ResetIcon />
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
        {SHORTCUT_ACTIONS.map((action, i) => (
          <ShortcutRow key={action} action={action} value={prefs.shortcuts[action]} border={i > 0} />
        ))}
        <ReadOnlyShortcutRow label="Open Settings" desc="From the app menu." keys={['⌘', ',']} />
      </div>
    </div>
  )
}

// ---- General tab ----

const PRESETS: [Prefs['preset'], string][] = [
  ['classic', 'Classic'],
  ['focus', 'Focus'],
  ['custom', 'Custom'],
]
const PRESET_VALS: Partial<Record<Prefs['preset'], Partial<Prefs>>> = {
  classic: { cFocus: 25, cShort: 5, cLong: 15 },
  focus: { cFocus: 50, cShort: 10, cLong: 20 },
}

const BEHAVIORS: [keyof Prefs, string, string][] = [
  ['autoStart', 'Auto-start next session', 'Begin the next focus or break automatically'],
  ['launchLogin', 'Launch at login', 'Open Pomodoro when your Mac starts up'],
  ['messages', 'Motivational messages', 'Show an encouraging line in the expanded panel'],
  ['hideShare', 'Hide during screen sharing', 'Auto-conceal while presenting or recording.'],
  ['pauseIdle', 'Pause when Mac is idle', 'Stop the clock if you step away or lock the screen.'],
  ['showDockIcon', 'Show app in Dock', 'Display the PomoIsland icon in the macOS Dock.'],
]

export function GeneralTab({ prefs, set }: TabProps) {
  const onPreset = (k: Prefs['preset']) =>
    set(PRESET_VALS[k] ? { preset: k, ...PRESET_VALS[k] } : { preset: k })

  const steppers: { label: string; value: string; dec: () => void; inc: () => void }[] = [
    {
      label: 'Focus',
      value: `${prefs.cFocus} min`,
      dec: () => set({ cFocus: clamp(prefs.cFocus - 5, 5, 180), preset: 'custom' }),
      inc: () => set({ cFocus: clamp(prefs.cFocus + 5, 5, 180), preset: 'custom' }),
    },
    {
      label: 'Short break',
      value: `${prefs.cShort} min`,
      dec: () => set({ cShort: clamp(prefs.cShort - 1, 1, 60), preset: 'custom' }),
      inc: () => set({ cShort: clamp(prefs.cShort + 1, 1, 60), preset: 'custom' }),
    },
    {
      label: 'Long break',
      value: `${prefs.cLong} min`,
      dec: () => set({ cLong: clamp(prefs.cLong - 5, 5, 60), preset: 'custom' }),
      inc: () => set({ cLong: clamp(prefs.cLong + 5, 5, 60), preset: 'custom' }),
    },
    {
      label: 'Sessions until long break',
      value: `${prefs.cSessions}`,
      dec: () => set({ cSessions: clamp(prefs.cSessions - 1, 2, 8), preset: 'custom' }),
      inc: () => set({ cSessions: clamp(prefs.cSessions + 1, 2, 8), preset: 'custom' }),
    },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
      {/* Left: preset + durations + shortcuts/goal */}
      <div>
        <div style={{ marginBottom: 24 }}>
          <SectionLabel>Timer preset</SectionLabel>
          <div
            style={{
              display: 'flex',
              gap: 3,
              background: 'var(--sp-field)',
              border: '1px solid var(--sp-border)',
              borderRadius: 11,
              padding: 3,
              marginBottom: 12,
            }}
          >
            {PRESETS.map(([k, label]) => {
              const on = prefs.preset === k
              return (
                <button
                  key={k}
                  onClick={() => onPreset(k)}
                  style={{
                    flex: 1,
                    height: 30,
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontFamily: MONO,
                    fontSize: 11.5,
                    letterSpacing: '0.03em',
                    background: on ? 'var(--sp-seg-on-bg)' : 'transparent',
                    color: on ? 'var(--sp-seg-on-text)' : 'var(--sp-faint)',
                    transition: 'all .15s',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 11,
              border: '1px solid var(--sp-line)',
              borderRadius: 11,
              padding: '14px 15px',
            }}
          >
            {steppers.map((st) => (
              <div
                key={st.label}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <span style={{ fontFamily: SANS, fontSize: 13, color: 'var(--sp-body)' }}>
                  {st.label}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <StepButton onClick={st.dec}>&minus;</StepButton>
                  <span
                    style={{
                      fontFamily: MONO,
                      fontSize: 14,
                      color: 'var(--sp-teal)',
                      minWidth: 54,
                      textAlign: 'center',
                    }}
                  >
                    {st.value}
                  </span>
                  <StepButton onClick={st.inc}>+</StepButton>
                </div>
              </div>
            ))}
          </div>

          <KeyboardShortcutsSection prefs={prefs} />

          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <SectionLabel>Daily goal</SectionLabel>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
              }}
            >
              <div>
                <div style={{ fontFamily: SANS, fontSize: 13.5, color: 'var(--sp-body)' }}>
                  Daily goal
                </div>
                <div
                  style={{
                    fontFamily: SANS,
                    fontSize: 11.5,
                    color: 'var(--sp-faint)',
                    marginTop: 2,
                  }}
                >
                  Focus blocks to aim for each day.
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, flex: '0 0 auto' }}>
                <StepButton
                  size={28}
                  onClick={() => set({ dailyGoal: clamp(prefs.dailyGoal - 1, 1, 20) })}
                >
                  &minus;
                </StepButton>
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: 15,
                    color: 'var(--sp-teal)',
                    minWidth: 52,
                    textAlign: 'center',
                  }}
                >
                  {prefs.dailyGoal}
                  <span style={{ fontSize: 10, color: 'var(--sp-faint)', marginLeft: 3 }}>pom</span>
                </span>
                <StepButton
                  size={28}
                  onClick={() => set({ dailyGoal: clamp(prefs.dailyGoal + 1, 1, 20) })}
                >
                  +
                </StepButton>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: behavior */}
      <div>
        <SectionLabel>Behavior</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          {BEHAVIORS.map(([k, label, desc]) => (
            <ToggleRow
              key={k}
              title={label}
              desc={desc}
              on={Boolean(prefs[k])}
              onClick={() => set({ [k]: !prefs[k] } as Partial<Prefs>)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd
      style={{
        fontFamily: MONO,
        fontSize: 12,
        color: 'var(--sp-teal)',
        background: 'var(--sp-field)',
        border: '1px solid var(--sp-border)',
        borderRadius: 7,
        padding: '5px 9px',
      }}
    >
      {children}
    </kbd>
  )
}

// ---- Preferences tab ----

const THEME_OPTIONS: { k: ThemeChoice; tip: string; icon: ReactNode }[] = [
  {
    k: 'system',
    tip: 'System',
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    k: 'light',
    tip: 'Light',
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <circle cx="12" cy="12" r="4" />
        <path
          d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    k: 'dark',
    tip: 'Dark',
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path
          d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
]

const SOUNDS: Sound[] = [
  'chime',
  'bell',
  'marimba',
  'digital',
  'halcyon',
  'spice',
  'pocket',
  'koto',
  'aurora',
]
const RIPPLES: [Ripple, string][] = [
  ['burst', 'Burst'],
  ['echo', 'Echo'],
  ['heartbeat', 'Heartbeat'],
  ['bloom', 'Bloom'],
]
const TICK_OPTIONS: { k: TickSound; label: string }[] = [
  { k: 'off', label: TICK_LABELS.off },
  { k: 'soft', label: TICK_LABELS.soft },
  { k: 'crisp', label: TICK_LABELS.crisp },
]

// Demo progress fraction for the live notch-style previews (a representative
// mid-session point). No time/label/dots readout — the swatch shows only the
// animated trace so it stays small and reads as a style sample, not a mock clock.
const STYLE_PREVIEW_PROGRESS = 0.62

/** One selectable notch-style card with a live, scaled NotchProgress preview. */
function NotchStyleCard({
  meta,
  selected,
  accent,
  accentBright,
  onClick,
}: {
  meta: (typeof TIMER_STYLE_META)[number]
  selected: boolean
  accent: string
  accentBright: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'relative',
        width: '100%',
        minWidth: 0,
        border: `1.5px solid ${selected ? 'var(--sp-teal)' : 'var(--sp-border)'}`,
        background: selected ? 'var(--sp-tint)' : 'var(--sp-surface)',
        borderRadius: 12,
        padding: '12px 12px 11px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 9,
        transition: 'all .15s',
      }}
    >
      <NotchProgress
        variant={meta.key}
        progress={STYLE_PREVIEW_PROGRESS}
        accent={accent}
        accentBright={accentBright}
        readout={false}
        frame
        scale={0.32}
      />
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontFamily: SANS,
            fontSize: 12,
            fontWeight: 500,
            color: selected ? 'var(--sp-teal)' : 'var(--sp-body)',
          }}
        >
          {meta.label}
        </div>
        <div style={{ fontFamily: SANS, fontSize: 10.5, color: 'var(--sp-faint)', marginTop: 1 }}>
          {meta.desc}
        </div>
      </div>
    </button>
  )
}

// Per-element placement around the notch. Labels use product vocabulary.
const PLACEMENT_ELEMENTS: { k: IslandElement; label: string }[] = [
  { k: 'ring', label: 'Progressive timer' },
  { k: 'status', label: 'Focus mode' },
  { k: 'time', label: 'Timer countdown' },
  { k: 'dots', label: 'Session dots' },
]
const SLOT_OPTIONS: { k: IslandSlot; label: string }[] = [
  { k: 'off', label: 'Off' },
  { k: 'left', label: 'Left' },
  { k: 'below', label: 'Below' },
  { k: 'right', label: 'Right' },
]
const FLOATING_LAYOUTS: { k: FloatingLayout; label: string }[] = [
  { k: 'L1', label: 'Focus + Timer + Dots' },
  { k: 'L2', label: '+ Task name' },
  { k: 'L3', label: 'Companion' },
  { k: 'L4', label: 'Badge' },
]
export function PreferencesTab({ prefs, set }: TabProps) {
  // Notch-style previews sit on a dark mini-screen, so use the pastel accent
  // as-is (the island's dark-mode treatment) rather than the light-deepened one.
  const styleAccent = accentHex(prefs.accent)
  const styleAccentBright = lighten(styleAccent, 0.4)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
      {/* Timer style spans both columns — 4 cards per row (A–H). */}
      <div style={{ gridColumn: '1 / -1', marginBottom: 8 }}>
        <SectionLabel>Timer style</SectionLabel>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: 8,
          }}
        >
          {TIMER_STYLE_META.map((meta) => (
            <NotchStyleCard
              key={meta.key}
              meta={meta}
              selected={prefs.timerStyle === meta.key}
              accent={styleAccent}
              accentBright={styleAccentBright}
              onClick={() => set({ timerStyle: meta.key })}
            />
          ))}
        </div>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--sp-faint)', lineHeight: 1.4 }}>
          Controls progress animation in both the snapped notch body and floating card.
        </p>
      </div>

      {/* Left: colors / element placement */}
      <div>
        <div style={{ marginBottom: 22 }}>
          <SectionLabel>Colors</SectionLabel>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 13,
            }}
          >
            <span style={{ fontFamily: SANS, fontSize: 13.5, color: 'var(--sp-body)' }}>
              Accent
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {(Object.keys(ACCENT_HEX) as AccentKey[]).map((k) => {
                const on = prefs.accent === k
                const c = ACCENT_HEX[k]
                return (
                  <button
                    key={k}
                    title={k}
                    onClick={() => set({ accent: k })}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      background: c,
                      cursor: 'pointer',
                      border: 'none',
                      padding: 0,
                      boxShadow: on
                        ? `0 0 0 2px var(--sp-surface), 0 0 0 3.5px ${c}`
                        : 'inset 0 0 0 1px rgba(0,0,0,0.12)',
                      transition: 'box-shadow .15s',
                    }}
                  />
                )
              })}
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: 11,
              borderTop: '1px solid var(--sp-line)',
            }}
          >
            <span style={{ fontFamily: SANS, fontSize: 13.5, color: 'var(--sp-body)' }}>Theme</span>
            <div
              style={{
                display: 'flex',
                gap: 3,
                background: 'var(--sp-field)',
                border: '1px solid var(--sp-border)',
                borderRadius: 11,
                padding: 3,
              }}
            >
              {THEME_OPTIONS.map((t) => {
                const on = prefs.theme === t.k
                return (
                  <button
                    key={t.k}
                    title={t.tip}
                    onClick={() => set({ theme: t.k })}
                    style={{
                      width: 34,
                      height: 30,
                      border: 'none',
                      cursor: 'pointer',
                      borderRadius: 8,
                      background: on ? 'var(--sp-seg-on-bg)' : 'transparent',
                      display: 'grid',
                      placeItems: 'center',
                      color: on ? 'var(--sp-seg-on-text)' : 'var(--sp-faint)',
                    }}
                  >
                    {t.icon}
                  </button>
                )
              })}
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: 11,
              borderTop: '1px solid var(--sp-line)',
            }}
          >
            <div>
              <div style={{ fontFamily: SANS, fontSize: 13.5, color: 'var(--sp-body)' }}>
                Notch background
              </div>
              <div style={{ fontFamily: SANS, fontSize: 11.5, color: 'var(--sp-faint)', marginTop: 2 }}>
                Snapped island surface — pure black or the theme color
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                gap: 3,
                background: 'var(--sp-field)',
                border: '1px solid var(--sp-border)',
                borderRadius: 11,
                padding: 3,
                flex: '0 0 auto',
              }}
            >
              {(
                [
                  { k: 'black', label: 'Black' },
                  { k: 'theme', label: 'Theme' },
                ] as const
              ).map((o) => {
                const on = prefs.notchBackground === o.k
                return (
                  <button
                    key={o.k}
                    onClick={() => set({ notchBackground: o.k })}
                    style={{
                      height: 30, minWidth: 34, padding: '0 12px', border: 'none', cursor: 'pointer',
                      borderRadius: 8, background: on ? 'var(--sp-seg-on-bg)' : 'transparent',
                      color: on ? 'var(--sp-seg-on-text)' : 'var(--sp-faint)', fontFamily: SANS, fontSize: 12.5, fontWeight: 500,
                    }}
                  >
                    {o.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div>
          <SectionLabel>Element placement</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {PLACEMENT_ELEMENTS
              .filter(({ k }) => k !== 'ring' || prefs.timerStyle === 'below')
              .map(({ k, label }) => (
                <div
                  key={k}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                  }}
                >
                  <span style={{ fontFamily: SANS, fontSize: 13, color: 'var(--sp-body)' }}>
                    {label}
                  </span>
                  <div
                    style={{
                      display: 'flex',
                      gap: 3,
                      background: 'var(--sp-field)',
                      border: '1px solid var(--sp-border)',
                      borderRadius: 11,
                      padding: 3,
                      flex: '0 0 auto',
                    }}
                  >
                    {SLOT_OPTIONS.map((s) => {
                      const on = prefs.islandPlacement[k] === s.k
                      return (
                        <button
                          key={s.k}
                          onClick={() =>
                            set({ islandPlacement: { ...prefs.islandPlacement, [k]: s.k } })
                          }
                          style={{
                            height: 30,
                            minWidth: 34,
                            padding: '0 12px',
                            border: 'none',
                            cursor: 'pointer',
                            borderRadius: 8,
                            background: on ? 'var(--sp-seg-on-bg)' : 'transparent',
                            color: on ? 'var(--sp-seg-on-text)' : 'var(--sp-faint)',
                            fontFamily: SANS,
                            fontSize: 12.5,
                            fontWeight: 500,
                          }}
                        >
                          {s.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div style={{ marginTop: 22 }}>
          <SectionLabel>Floating card</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <span style={{ fontFamily: SANS, fontSize: 13, color: 'var(--sp-body)' }}>Layout</span>
              <div style={{ display: 'flex', gap: 3, background: 'var(--sp-field)', border: '1px solid var(--sp-border)', borderRadius: 11, padding: 3 }}>
                {FLOATING_LAYOUTS.map((l) => {
                  const on = prefs.floatingLayout === l.k
                  return (
                    <button
                      key={l.k}
                      title={l.label}
                      onClick={() => set({ floatingLayout: l.k })}
                      style={{
                        height: 30, minWidth: 34, padding: '0 10px', border: 'none', cursor: 'pointer',
                        borderRadius: 8, background: on ? 'var(--sp-seg-on-bg)' : 'transparent',
                        color: on ? 'var(--sp-seg-on-text)' : 'var(--sp-faint)', fontFamily: SANS, fontSize: 12.5, fontWeight: 500,
                      }}
                    >
                      {l.k}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        <NotchHeightSection prefs={prefs} set={set} />

        <div style={{ marginTop: 24 }}>
          <SectionLabel>Auto-retract</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            <RetractControl
              label="On hover"
              desc="Collapse delay when cursor leaves the peek view"
              value={prefs.hoverRetractMs}
              defaultValue={200}
              min={100}
              max={2000}
              onChange={(v) => set({ hoverRetractMs: v })}
            />
            <RetractControl
              label="When expanded"
              desc="Collapse delay when cursor leaves the expanded view"
              value={prefs.expandRetractMs}
              defaultValue={800}
              min={300}
              max={5000}
              onChange={(v) => set({ expandRetractMs: v })}
            />
          </div>
        </div>
      </div>

      {/* Right: alarm & sound / done animation */}
      <div>
        <div style={{ marginBottom: 22 }}>
          <SectionLabel>Alarm &amp; sound</SectionLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 13 }}>
            {SOUNDS.map((k) => (
              <Chip
                key={k}
                label={SOUND_LABELS[k]}
                on={prefs.sound === k}
                onClick={() => {
                  set({ sound: k })
                  // Audition on select; fall back to an audible level if muted.
                  playSound(k, prefs.volume > 0 ? prefs.volume : 60)
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <svg width="17" height="15" viewBox="0 0 17 15" style={{ flex: '0 0 auto' }}>
              <path d="M1 5 H4 L8 1.5 V13.5 L4 10 H1 Z" fill="var(--sp-muted)" />
              <path
                d="M11 4 a4 4 0 0 1 0 7 M13 2 a7 7 0 0 1 0 11"
                fill="none"
                stroke="var(--sp-faint)"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </svg>
            <input
              type="range"
              min={0}
              max={100}
              value={prefs.volume}
              onChange={(e) => set({ volume: parseInt(e.target.value, 10) })}
              className="sp-range"
              style={{ flex: 1 }}
            />
            <span
              style={{
                fontFamily: MONO,
                fontSize: 12,
                color: 'var(--sp-muted)',
                minWidth: 34,
                textAlign: 'right',
              }}
            >
              {prefs.volume}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              marginBottom: 11,
              paddingTop: 11,
              borderTop: '1px solid var(--sp-line)',
            }}
          >
            <div>
              <div style={{ fontFamily: SANS, fontSize: 13.5, color: 'var(--sp-body)' }}>
                Ticking sound
              </div>
              <div
                style={{
                  fontFamily: SANS,
                  fontSize: 11.5,
                  color: 'var(--sp-faint)',
                  marginTop: 2,
                  lineHeight: 1.35,
                }}
              >
                A tick each second while focusing.
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                gap: 3,
                background: 'var(--sp-field)',
                border: '1px solid var(--sp-border)',
                borderRadius: 11,
                padding: 3,
                flex: '0 0 auto',
              }}
            >
              {TICK_OPTIONS.map((t) => {
                const on = prefs.tick === t.k
                return (
                  <button
                    key={t.k}
                    onClick={() => {
                      set({ tick: t.k })
                      // Audition a short burst on select (stops any prior burst first); fall
                      // back to an audible level if muted. Selecting "Off" just stops it.
                      previewTick(t.k, prefs.volume > 0 ? prefs.volume : 60)
                    }}
                    style={{
                      height: 30,
                      minWidth: 34,
                      padding: '0 11px',
                      border: 'none',
                      cursor: 'pointer',
                      borderRadius: 8,
                      background: on ? 'var(--sp-seg-on-bg)' : 'transparent',
                      color: on ? 'var(--sp-seg-on-text)' : 'var(--sp-faint)',
                      fontFamily: SANS,
                      fontSize: 12.5,
                      fontWeight: 500,
                    }}
                  >
                    {t.label}
                  </button>
                )
              })}
            </div>
          </div>
          <ToggleRow
            title="System notification on finish"
            desc="Banner in Notification Center when a block ends."
            on={prefs.notify}
            onClick={() => set({ notify: !prefs.notify })}
          />
        </div>

        <div style={{ marginBottom: 22 }}>
          <SectionLabel>
            Done&nbsp;
            <span style={{ color: 'var(--sp-faint)', letterSpacing: '0.14em' }}>ANIMATION</span>
          </SectionLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 11 }}>
            {RIPPLES.map(([k, label]) => (
              <Chip
                key={k}
                label={label}
                on={prefs.ripple === k}
                onClick={() => set({ ripple: k })}
              />
            ))}
          </div>
          <div
            style={{
              height: 64,
              background: 'var(--sp-field)',
              borderRadius: 10,
              display: 'grid',
              placeItems: 'center',
              overflow: 'hidden',
            }}
          >
            <RipplePreview variant={prefs.ripple} accent={prefs.accent} />
          </div>
        </div>
      </div>
    </div>
  )
}

function RipplePreview({ variant, accent }: { variant: Ripple; accent: AccentKey }) {
  const rm = useReducedMotion()
  const base = accentHex(accent)
  const bright = lighten(base, 0.35)
  return (
    <div style={{ position: 'relative', display: 'inline-flex', transform: 'scale(0.9)' }}>
      <span
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 999,
          boxShadow: `0 0 32px 6px ${hexToRgba(base, 0.5)}`,
          // With reduced-motion: hold glow at peak opacity, no pulse.
          animation: rm ? undefined : 'rcGlow 2.6s ease-in-out infinite',
          opacity: rm ? 0.6 : undefined,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      {RIPPLE_DEFS[variant].map((r, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            inset: -1,
            borderRadius: 999,
            border: `${r.w}px solid ${r.bright ? bright : base}`,
            pointerEvents: 'none',
            zIndex: 3,
            ...cssVar('--op', r.op),
            ...cssVar('--sc', r.sc),
            // With reduced-motion: show only the first ring at resting opacity; hide the rest.
            opacity: rm ? (i === 0 ? r.op : 0) : undefined,
            animation: rm ? undefined : `rcExpand ${r.dur}s cubic-bezier(.16,.6,.3,1) ${r.delay}s infinite`,
          }}
        />
      ))}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          background: 'var(--sp-surface)',
          color: 'var(--sp-text)',
          borderRadius: 999,
          padding: '7px 17px 7px 8px',
          boxShadow: '0 14px 36px rgba(0,0,0,.42)',
          minHeight: 42,
          boxSizing: 'border-box',
        }}
      >
        <div style={{ position: 'relative', width: 28, height: 28, flex: '0 0 auto' }}>
          <svg width="28" height="28" viewBox="0 0 28 28" style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx="14"
              cy="14"
              r="10.5"
              fill="none"
              stroke="var(--sp-border)"
              strokeWidth="3"
            />
            <circle
              cx="14"
              cy="14"
              r="10.5"
              fill="none"
              stroke={base}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="66"
              strokeDashoffset="0"
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
            <svg width="13" height="11" viewBox="0 0 13 11">
              <path
                d="M1 5.5 L4.8 9.5 L12 1.5"
                fill="none"
                stroke={base}
                strokeWidth="2.1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, lineHeight: 1 }}>
          <span
            style={{
              fontFamily: MONO,
              fontSize: 9,
              letterSpacing: '0.16em',
              color: base,
              fontWeight: 500,
              whiteSpace: 'nowrap',
            }}
          >
            FOCUS DONE
          </span>
          <span
            style={{ fontFamily: MONO, fontSize: 15, fontWeight: 500, color: 'var(--sp-text)' }}
          >
            00:00
          </span>
        </div>
      </div>
    </div>
  )
}
