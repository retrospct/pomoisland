// Settings tab bodies, ported from SettingsPanel.dc.html. Two tabs:
//   General      → Timer preset / durations / shortcuts+goal + Behavior
//   Preferences  → Colors / dots / timer style / notch layout + Alarm & sound / Done animation
// Every control writes straight through to prefs (optimistic in SettingsApp).

import { ACCENT_HEX, accentHex, hexToRgba, lighten } from '@shared/accent'
import { RIPPLE_DEFS } from '@shared/ripple'
import { SOUND_LABELS, TICK_LABELS, playSound, previewTick } from '@shared/sound'
import type {
  AccentKey,
  IslandElement,
  IslandSlot,
  Layout,
  Prefs,
  Ripple,
  Sound,
  ThemeChoice,
  TickSound,
  TimerStyle,
} from '@shared/types'
import type { CSSProperties, ReactNode } from 'react'

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

function SelectCard({
  selected,
  onClick,
  icon,
  label,
  padTop = 22,
}: {
  selected: boolean
  onClick: () => void
  icon: ReactNode
  label: string
  padTop?: number
}) {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'relative',
        flex: 1,
        border: '1.5px solid var(--sp-border)',
        background: 'var(--sp-surface)',
        borderRadius: 12,
        padding: `${padTop}px 10px 16px`,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        transition: 'all .15s',
      }}
    >
      {selected && (
        <span
          style={{
            position: 'absolute',
            inset: -1.5,
            border: '1.5px solid var(--sp-teal)',
            borderRadius: 12,
            background: 'var(--sp-tint)',
            zIndex: 0,
          }}
        />
      )}
      <span style={{ position: 'relative', zIndex: 1, display: 'grid', placeItems: 'center' }}>
        {icon}
      </span>
      <span
        style={{
          position: 'relative',
          zIndex: 1,
          fontFamily: SANS,
          fontSize: 12,
          fontWeight: 500,
          color: 'var(--sp-body)',
        }}
      >
        {label}
      </span>
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
  ['dnd', 'Do Not Disturb in focus', 'Silence other notifications while the timer runs'],
  ['launchLogin', 'Launch at login', 'Open Pomodoro when your Mac starts up'],
  ['messages', 'Motivational messages', 'Show an encouraging line in the expanded panel'],
  ['hideShare', 'Hide during screen sharing', 'Auto-conceal while presenting or recording.'],
  ['pauseIdle', 'Pause when Mac is idle', 'Stop the clock if you step away or lock the screen.'],
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

          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <SectionLabel>Shortcuts &amp; goal</SectionLabel>
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
                <div style={{ fontFamily: SANS, fontSize: 13.5, color: 'var(--sp-body)' }}>
                  Global shortcut
                </div>
                <div
                  style={{
                    fontFamily: SANS,
                    fontSize: 11.5,
                    color: 'var(--sp-faint)',
                    marginTop: 2,
                  }}
                >
                  Start / pause from anywhere.
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flex: '0 0 auto' }}>
                <Kbd>⌥</Kbd>
                <Kbd>Space</Kbd>
              </div>
            </div>
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

const STYLE_OPTIONS: { k: TimerStyle; label: string; icon: ReactNode }[] = [
  {
    k: 'circular',
    label: 'Circular',
    icon: (
      <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
        <circle cx="15" cy="15" r="11" stroke="var(--sp-border)" strokeWidth="2.4" opacity="0.3" />
        <path
          d="M15 4 a11 11 0 0 1 9.5 16.5"
          stroke="var(--sp-teal)"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    k: 'outline',
    label: 'Notch-outline',
    icon: (
      <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
        <path
          d="M3 15 h4 a3 3 0 0 0 3-3 a3 3 0 0 1 3-3 h4 a3 3 0 0 1 3 3 a3 3 0 0 0 3 3 h4"
          stroke="var(--sp-teal)"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    k: 'bar',
    label: 'Progress bar',
    icon: (
      <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
        <rect
          x="4"
          y="12.5"
          width="22"
          height="5"
          rx="2.5"
          stroke="var(--sp-border)"
          strokeWidth="2"
          opacity="0.3"
        />
        <rect x="4" y="12.5" width="13" height="5" rx="2.5" fill="var(--sp-teal)" />
      </svg>
    ),
  },
]

const LAYOUT_OPTIONS: { k: Layout; label: string; icon: ReactNode }[] = [
  {
    k: 'split',
    label: 'Split',
    icon: (
      <svg width="42" height="22" viewBox="0 0 42 22" fill="none">
        <rect x="14" y="0" width="14" height="7" rx="2" fill="var(--sp-border)" opacity="0.5" />
        <circle cx="5" cy="14" r="3" fill="var(--sp-teal)" />
        <rect x="28" y="11" width="10" height="4" rx="2" fill="var(--sp-teal)" />
      </svg>
    ),
  },
  {
    k: 'minimal',
    label: 'Minimal',
    icon: (
      <svg width="42" height="22" viewBox="0 0 42 22" fill="none">
        <rect x="14" y="0" width="14" height="7" rx="2" fill="var(--sp-border)" opacity="0.5" />
        <rect x="6" y="12" width="10" height="4" rx="2" fill="var(--sp-teal)" />
      </svg>
    ),
  },
  {
    k: 'compact',
    label: 'Compact',
    icon: (
      <svg width="42" height="22" viewBox="0 0 42 22" fill="none">
        <rect x="14" y="0" width="14" height="7" rx="2" fill="var(--sp-border)" opacity="0.5" />
        <circle cx="5" cy="14" r="3" fill="var(--sp-teal)" />
        <circle cx="35" cy="14" r="3" fill="var(--sp-teal)" />
      </svg>
    ),
  },
]

// MO-22: per-element placement around the notch. Labels use product vocabulary.
const PLACEMENT_ELEMENTS: { k: IslandElement; label: string }[] = [
  { k: 'ring', label: 'Progressive timer' },
  { k: 'time', label: 'Timer numbers' },
  { k: 'dots', label: 'Session dots' },
]
const SLOT_OPTIONS: { k: IslandSlot; label: string }[] = [
  { k: 'left', label: 'Left' },
  { k: 'below', label: 'Below' },
  { k: 'right', label: 'Right' },
]

export function PreferencesTab({ prefs, set }: TabProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
      {/* Left: colors / dots / timer style / layout */}
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
        </div>

        <div
          style={{ marginBottom: 18, paddingBottom: 16, borderBottom: '1px solid var(--sp-line)' }}
        >
          <ToggleRow
            title="Show session dots"
            desc="The little round-progress markers."
            on={prefs.showDots}
            onClick={() => set({ showDots: !prefs.showDots })}
            border={false}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <SectionLabel>Timer style</SectionLabel>
          <div style={{ display: 'flex', gap: 10 }}>
            {STYLE_OPTIONS.map((o) => (
              <SelectCard
                key={o.k}
                selected={prefs.timerStyle === o.k}
                onClick={() => set({ timerStyle: o.k })}
                icon={o.icon}
                label={o.label}
              />
            ))}
          </div>
        </div>

        <div>
          <SectionLabel>Notch layout</SectionLabel>
          <div style={{ display: 'flex', gap: 10 }}>
            {LAYOUT_OPTIONS.map((o) => (
              <SelectCard
                key={o.k}
                selected={prefs.layout === o.k}
                onClick={() => set({ layout: o.k })}
                icon={o.icon}
                label={o.label}
                padTop={20}
              />
            ))}
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          <SectionLabel>Element placement</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {PLACEMENT_ELEMENTS.map(({ k, label }) => (
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
          animation: 'rcGlow 2.6s ease-in-out infinite',
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
            animation: `rcExpand ${r.dur}s cubic-bezier(.16,.6,.3,1) ${r.delay}s infinite`,
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
