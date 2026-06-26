import type { CSSProperties, ReactNode } from 'react'
import type {
  AlarmSound,
  CompletionAnim,
  Layout,
  Prefs,
  Preset,
  ThemeChoice,
  TimerType,
} from '@shared/types'
import { SectionLabel, SegOption, Segmented, SettingRow, Stepper, Toggle } from './controls'

const MONO = "'IBM Plex Mono', monospace"
const SANS = "'Inter', sans-serif"

type Setter = (patch: Partial<Prefs>) => void

const STEP_CFG: Record<string, [min: number, max: number, step: number]> = {
  focusMin: [5, 90, 5],
  shortMin: [1, 30, 1],
  longMin: [5, 60, 5],
  longEvery: [2, 8, 1],
  dailyGoal: [1, 16, 1],
}

function stepValue(field: keyof Prefs, current: number, dir: number): number {
  const [min, max, step] = STEP_CFG[field as string]
  return Math.max(min, Math.min(max, current + dir * step))
}

// ---------- Timer ----------

const PRESET_HINTS: Record<Preset, string> = {
  classic: 'The original Pomodoro rhythm — 25 on, 5 off, a long 15 every four.',
  focus: 'Longer deep-work blocks for flow states — 50 on, 10 off.',
  custom: 'Dial in your own. The fields below stay editable.',
}

function DurationCard({
  label,
  value,
  editable,
  onStep,
}: {
  label: string
  value: number
  editable: boolean
  onStep: (dir: number) => void
}) {
  return (
    <div style={{ flex: 1, background: 'var(--s-elev)', border: '1px solid var(--s-line)', borderRadius: 13, padding: '15px 14px' }}>
      <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--s-sub)', marginBottom: 9 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontFamily: MONO, fontSize: 30, fontWeight: 500, color: 'var(--s-text)', lineHeight: 1 }}>{value}</span>
        <span style={{ fontFamily: SANS, fontSize: 12, color: 'var(--s-faint)' }}>min</span>
      </div>
      {editable && (
        <div style={{ marginTop: 12 }}>
          <Stepper onDec={() => onStep(-1)} onInc={() => onStep(1)} />
        </div>
      )}
    </div>
  )
}

export function TimerSection({ prefs, set }: { prefs: Prefs; set: Setter }) {
  const editable = prefs.preset === 'custom'
  const presetOpts: SegOption<Preset>[] = [
    { value: 'classic', label: 'Classic', detail: ' · 25/5/15' },
    { value: 'focus', label: 'Deep Focus', detail: ' · 50/10/20' },
    { value: 'custom', label: 'Custom' },
  ]
  const pickPreset = (p: Preset) => {
    if (p === 'classic') set({ preset: p, focusMin: 25, shortMin: 5, longMin: 15 })
    else if (p === 'focus') set({ preset: p, focusMin: 50, shortMin: 10, longMin: 20 })
    else set({ preset: 'custom' })
  }
  const stepDuration = (field: 'focusMin' | 'shortMin' | 'longMin', dir: number) =>
    set({ [field]: stepValue(field, prefs[field], dir), preset: 'custom' } as Partial<Prefs>)

  return (
    <div>
      <SectionLabel style={{ marginBottom: 10 }}>Preset</SectionLabel>
      <Segmented options={presetOpts} value={prefs.preset} onChange={pickPreset} />
      <div style={{ fontFamily: SANS, fontSize: 11.5, color: 'var(--s-sub)', margin: '8px 0 18px' }}>{PRESET_HINTS[prefs.preset]}</div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 22 }}>
        <DurationCard label="Focus" value={prefs.focusMin} editable={editable} onStep={(d) => stepDuration('focusMin', d)} />
        <DurationCard label="Short break" value={prefs.shortMin} editable={editable} onStep={(d) => stepDuration('shortMin', d)} />
        <DurationCard label="Long break" value={prefs.longMin} editable={editable} onStep={(d) => stepDuration('longMin', d)} />
      </div>

      <SettingRow title="Long break after" desc="Focus sessions before the longer rest.">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Stepper onDec={() => set({ longEvery: stepValue('longEvery', prefs.longEvery, -1) })} onInc={() => set({ longEvery: stepValue('longEvery', prefs.longEvery, 1) })} />
          <span style={{ fontFamily: MONO, fontSize: 16, color: 'var(--s-text)', minWidth: 48, textAlign: 'center' }}>
            {prefs.longEvery}
            <span style={{ fontSize: 11, color: 'var(--s-faint)' }}> ses</span>
          </span>
        </div>
      </SettingRow>

      <SectionLabel style={{ margin: '18px 0 4px' }}>Automation</SectionLabel>
      <SettingRow title="Auto-start breaks" desc="When focus ends, the break begins on its own.">
        <Toggle on={prefs.autoBreak} onChange={(v) => set({ autoBreak: v })} />
      </SettingRow>
      <SettingRow title="Auto-start next focus" desc="Roll straight into the next session after a break.">
        <Toggle on={prefs.autoFocus} onChange={(v) => set({ autoFocus: v })} />
      </SettingRow>
    </div>
  )
}

// ---------- Sounds ----------

const ALARMS: { k: AlarmSound; label: string }[] = [
  { k: 'chime', label: 'Chime' },
  { k: 'marimba', label: 'Marimba' },
  { k: 'bell', label: 'Soft bell' },
  { k: 'pebble', label: 'Pebble' },
  { k: 'birdsong', label: 'Birdsong' },
  { k: 'custom', label: 'Custom…' },
]

const ANIMS: { k: CompletionAnim; label: string }[] = [
  { k: 'ripple', label: 'Ripple' },
  { k: 'bloom', label: 'Bloom' },
  { k: 'heartbeat', label: 'Heartbeat' },
  { k: 'confetti', label: 'Confetti' },
  { k: 'none', label: 'None' },
]

export function SoundsSection({ prefs, set }: { prefs: Prefs; set: Setter }) {
  return (
    <div>
      <SectionLabel style={{ marginBottom: 10 }}>Alarm sound</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 20 }}>
        {ALARMS.map((a) => {
          const sel = prefs.alarm === a.k
          return (
            <button
              key={a.k}
              onClick={() => set({ alarm: a.k })}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: 10,
                cursor: 'pointer',
                width: '100%',
                textAlign: 'left',
                transition: 'all .14s',
                border: `1px solid ${sel ? 'var(--s-line)' : 'transparent'}`,
                background: sel ? 'var(--s-elev)' : 'transparent',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <span style={{ width: 15, height: 15, borderRadius: 999, display: 'grid', placeItems: 'center', flex: '0 0 auto', boxSizing: 'border-box', border: `1.5px solid ${sel ? 'var(--s-accent)' : 'var(--s-faint)'}` }}>
                  <span style={{ width: 7, height: 7, borderRadius: 999, display: 'block', background: sel ? 'var(--s-accent)' : 'transparent' }} />
                </span>
                <span style={{ fontFamily: SANS, fontSize: 13, color: 'var(--s-text)' }}>{a.label}</span>
              </span>
              <span style={{ display: 'grid', placeItems: 'center', width: 24, height: 24, borderRadius: 999, background: 'var(--s-elev)' }}>
                <svg width="9" height="10" viewBox="0 0 9 10">
                  <path d="M1 1 L8 5 L1 9 Z" fill="var(--s-sub)" />
                </svg>
              </span>
            </button>
          )
        })}
      </div>

      <SettingRow title="Volume">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: 260 }}>
          <input
            type="range"
            min={0}
            max={100}
            value={prefs.volume}
            onChange={(e) => set({ volume: parseInt(e.target.value, 10) })}
            style={{ flex: 1, accentColor: 'var(--s-accent)', height: 4, cursor: 'pointer' }}
          />
          <span style={{ fontFamily: MONO, fontSize: 12, color: 'var(--s-sub)', minWidth: 34, textAlign: 'right' }}>{prefs.volume}</span>
        </div>
      </SettingRow>
      <SettingRow title="Ticking while focusing" desc="A soft clock tick for presence. Off by default.">
        <Toggle on={prefs.tickOn} onChange={(v) => set({ tickOn: v })} />
      </SettingRow>

      <SectionLabel style={{ margin: '20px 0 10px' }}>Completion animation</SectionLabel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
        {ANIMS.map((an) => {
          const sel = prefs.anim === an.k
          return (
            <button
              key={an.k}
              onClick={() => set({ anim: an.k })}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '8px 13px',
                borderRadius: 999,
                cursor: 'pointer',
                fontFamily: SANS,
                fontSize: 12.5,
                color: 'var(--s-text)',
                transition: 'all .14s',
                border: `1.5px solid ${sel ? 'var(--s-accent)' : 'var(--s-line)'}`,
                background: sel ? 'var(--s-elev)' : 'transparent',
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: 999, display: 'block', background: an.k === 'none' ? 'var(--s-faint)' : 'var(--s-accent)', opacity: an.k === 'none' ? 0.5 : 1 }} />
              {an.label}
            </button>
          )
        })}
      </div>
      <SettingRow title="System notification on finish" desc="Banner in Notification Center when a block ends.">
        <Toggle on={prefs.notify} onChange={(v) => set({ notify: v })} />
      </SettingRow>
    </div>
  )
}

// ---------- Appearance ----------

const ACCENTS: { k: string; c: string }[] = [
  { k: 'teal', c: '#8FC8C0' },
  { k: 'clay', c: '#E2A24A' },
  { k: 'blue', c: '#6F9CEB' },
  { k: 'violet', c: '#A88BE0' },
  { k: 'rose', c: '#E08AA6' },
  { k: 'green', c: '#84B26A' },
]

function SelectCard({ selected, onClick, icon, label }: { selected: boolean; onClick: () => void; icon: ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'relative',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: '13px 8px',
        borderRadius: 11,
        cursor: 'pointer',
        border: `1.5px solid ${selected ? 'var(--s-accent)' : 'var(--s-line)'}`,
        background: selected ? 'var(--s-elev)' : 'transparent',
      }}
    >
      <span style={{ position: 'relative', zIndex: 1 }}>{icon}</span>
      <span style={{ position: 'relative', zIndex: 1, fontFamily: SANS, fontSize: 12, color: 'var(--s-text)' }}>{label}</span>
    </button>
  )
}

const TIMER_TYPE_ICONS: Record<TimerType, ReactNode> = {
  circular: (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
      <circle cx="15" cy="15" r="11" stroke="var(--s-sub)" strokeWidth="2.4" opacity="0.3" />
      <path d="M15 4 a11 11 0 0 1 9.5 16.5" stroke="var(--s-accent)" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  ),
  outline: (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
      <path d="M3 15 h4 a3 3 0 0 0 3-3 a3 3 0 0 1 3-3 h4 a3 3 0 0 1 3 3 a3 3 0 0 0 3 3 h4" stroke="var(--s-accent)" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  ),
  bar: (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
      <rect x="4" y="12.5" width="22" height="5" rx="2.5" stroke="var(--s-sub)" strokeWidth="2" opacity="0.3" />
      <rect x="4" y="12.5" width="13" height="5" rx="2.5" fill="var(--s-accent)" />
    </svg>
  ),
}

const LAYOUT_ICONS: Record<Layout, ReactNode> = {
  split: (
    <svg width="34" height="20" viewBox="0 0 34 20" fill="none">
      <rect x="11" y="0" width="12" height="7" rx="2" fill="var(--s-sub)" opacity="0.4" />
      <circle cx="5" cy="12" r="2.4" fill="var(--s-accent)" />
      <rect x="24" y="10" width="7" height="4" rx="2" fill="var(--s-accent)" />
    </svg>
  ),
  minimal: (
    <svg width="34" height="20" viewBox="0 0 34 20" fill="none">
      <rect x="11" y="0" width="12" height="7" rx="2" fill="var(--s-sub)" opacity="0.4" />
      <rect x="6" y="10" width="9" height="4" rx="2" fill="var(--s-accent)" />
    </svg>
  ),
  compact: (
    <svg width="34" height="20" viewBox="0 0 34 20" fill="none">
      <rect x="11" y="0" width="12" height="7" rx="2" fill="var(--s-sub)" opacity="0.4" />
      <circle cx="6" cy="12" r="2.4" fill="var(--s-accent)" />
      <circle cx="26" cy="12" r="2.4" fill="var(--s-accent)" />
    </svg>
  ),
}

export function AppearanceSection({ prefs, set }: { prefs: Prefs; set: Setter }) {
  const themeOpts: SegOption<ThemeChoice>[] = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'auto', label: 'Auto' },
  ]
  return (
    <div>
      <SectionLabel style={{ marginBottom: 10 }}>Theme</SectionLabel>
      <div style={{ marginBottom: 20 }}>
        <Segmented options={themeOpts} value={prefs.theme} onChange={(v) => set({ theme: v })} maxWidth={320} />
      </div>

      <SectionLabel style={{ marginBottom: 12 }}>Accent</SectionLabel>
      <div style={{ display: 'flex', gap: 13, marginBottom: 22 }}>
        {ACCENTS.map((ac) => {
          const sel = prefs.accent === ac.c
          return (
            <button
              key={ac.k}
              title={ac.k}
              onClick={() => set({ accent: ac.c })}
              style={{
                width: 30,
                height: 30,
                borderRadius: 999,
                cursor: 'pointer',
                border: 'none',
                flex: '0 0 auto',
                transition: 'all .15s',
                background: ac.c,
                boxShadow: sel ? `0 0 0 2px var(--s-bg), 0 0 0 4px ${ac.c}` : '0 0 0 1px rgba(0,0,0,0.15)',
              }}
            />
          )
        })}
      </div>

      <SectionLabel style={{ marginBottom: 11 }}>Timer style</SectionLabel>
      <div style={{ display: 'flex', gap: 9, marginBottom: 22 }}>
        {(['circular', 'outline', 'bar'] as TimerType[]).map((t) => (
          <SelectCard key={t} selected={prefs.timerType === t} onClick={() => set({ timerType: t })} icon={TIMER_TYPE_ICONS[t]} label={t === 'circular' ? 'Circular' : t === 'outline' ? 'Notch outline' : 'Progress bar'} />
        ))}
      </div>

      <SectionLabel style={{ marginBottom: 11 }}>Collapsed notch layout</SectionLabel>
      <div style={{ display: 'flex', gap: 9, marginBottom: 14 }}>
        {(['split', 'minimal', 'compact'] as Layout[]).map((l) => (
          <SelectCard key={l} selected={prefs.layout === l} onClick={() => set({ layout: l })} icon={LAYOUT_ICONS[l]} label={l[0].toUpperCase() + l.slice(1)} />
        ))}
      </div>

      <SettingRow title="Show session dots" desc="The little round-progress markers.">
        <Toggle on={prefs.showDots} onChange={(v) => set({ showDots: v })} />
      </SettingRow>
      <SettingRow title="Micro-messages" desc="Playful nudges like “Breathe…” and “In the pocket.”">
        <Toggle on={prefs.showMessages} onChange={(v) => set({ showMessages: v })} />
      </SettingRow>
    </div>
  )
}

// ---------- Behavior ----------

const kbd: CSSProperties = {
  fontFamily: MONO,
  fontSize: 13,
  color: 'var(--s-text)',
  background: 'var(--s-elev)',
  border: '1px solid var(--s-line)',
  borderRadius: 7,
  padding: '5px 10px',
}

export function BehaviorSection({ prefs, set }: { prefs: Prefs; set: Setter }) {
  return (
    <div>
      <SectionLabel style={{ marginBottom: 4 }}>System</SectionLabel>
      <SettingRow title="Launch at login" desc="Open Pomodoro when you sign in.">
        <Toggle on={prefs.launchLogin} onChange={(v) => set({ launchLogin: v })} />
      </SettingRow>
      <SettingRow title="Always on top" desc="Keep the island above other windows.">
        <Toggle on={prefs.alwaysTop} onChange={(v) => set({ alwaysTop: v })} />
      </SettingRow>
      <SettingRow title="Magnetic snap to notch" desc="Drag near the camera and it locks into place.">
        <Toggle on={prefs.magnetic} onChange={(v) => set({ magnetic: v })} />
      </SettingRow>
      <SettingRow title="Hide during screen sharing" desc="Auto-conceal while presenting or recording.">
        <Toggle on={prefs.hideShare} onChange={(v) => set({ hideShare: v })} />
      </SettingRow>
      <SettingRow title="Pause when Mac is idle" desc="Stop the clock if you step away or lock the screen.">
        <Toggle on={prefs.pauseIdle} onChange={(v) => set({ pauseIdle: v })} />
      </SettingRow>

      <SectionLabel style={{ margin: '20px 0 4px' }}>Shortcuts &amp; goal</SectionLabel>
      <SettingRow title="Global shortcut" desc="Start / pause from anywhere.">
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <kbd style={kbd}>&#8997;</kbd>
          <kbd style={{ ...kbd, fontSize: 12 }}>Space</kbd>
        </div>
      </SettingRow>
      <SettingRow title="Daily goal" desc="Focus blocks to aim for each day.">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Stepper onDec={() => set({ dailyGoal: stepValue('dailyGoal', prefs.dailyGoal, -1) })} onInc={() => set({ dailyGoal: stepValue('dailyGoal', prefs.dailyGoal, 1) })} />
          <span style={{ fontFamily: MONO, fontSize: 16, color: 'var(--s-text)', minWidth: 54, textAlign: 'center' }}>
            {prefs.dailyGoal}
            <span style={{ fontSize: 11, color: 'var(--s-faint)' }}> pom</span>
          </span>
        </div>
      </SettingRow>
    </div>
  )
}
