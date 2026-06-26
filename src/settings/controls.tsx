import type { CSSProperties, ReactNode } from 'react'

const MONO = "'IBM Plex Mono', monospace"
const SANS = "'Inter', sans-serif"

export function SettingRow({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 0', borderTop: '1px solid var(--s-line)' }}>
      <div>
        <div style={{ fontFamily: SANS, fontSize: 13.5, fontWeight: 500, color: 'var(--s-text)' }}>{title}</div>
        {desc && <div style={{ fontFamily: SANS, fontSize: 11.5, color: 'var(--s-sub)', marginTop: 2 }}>{desc}</div>}
      </div>
      <div style={{ flex: '0 0 auto' }}>{children}</div>
    </div>
  )
}

export function Toggle({ on, onChange }: { on: boolean; onChange: (next: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{ position: 'relative', width: 42, height: 25, border: 'none', padding: 0, cursor: 'pointer', background: 'transparent', flex: '0 0 auto' }}
      aria-pressed={on}
    >
      <span style={{ position: 'absolute', inset: 0, borderRadius: 999, background: on ? 'var(--s-accent)' : 'var(--s-track)', transition: 'background .16s' }}>
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: 2,
            width: 21,
            height: 21,
            borderRadius: 999,
            background: '#fff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            transform: on ? 'translateX(17px)' : 'translateX(0)',
            transition: 'transform .16s',
          }}
        />
      </span>
    </button>
  )
}

const stepStyle: CSSProperties = {
  width: 30,
  height: 28,
  borderRadius: 8,
  border: '1px solid var(--s-line)',
  background: 'var(--s-elev)',
  color: 'var(--s-text)',
  cursor: 'pointer',
  fontSize: 15,
  lineHeight: 1,
  fontFamily: MONO,
}

export function Stepper({ onDec, onInc }: { onDec: () => void; onInc: () => void }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <button onClick={onDec} style={stepStyle}>
        &minus;
      </button>
      <button onClick={onInc} style={stepStyle}>
        +
      </button>
    </div>
  )
}

export interface SegOption<T extends string> {
  value: T
  label: string
  detail?: string
}

export function Segmented<T extends string>({ options, value, onChange, maxWidth }: { options: SegOption<T>[]; value: T; onChange: (v: T) => void; maxWidth?: number }) {
  return (
    <div style={{ display: 'flex', gap: 3, background: 'var(--s-elev)', padding: 3, borderRadius: 11, maxWidth }}>
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            style={{
              flex: 1,
              textAlign: 'center',
              padding: '8px 6px',
              borderRadius: 8,
              cursor: 'pointer',
              border: 'none',
              whiteSpace: 'nowrap',
              fontFamily: MONO,
              fontSize: 12,
              transition: 'all .15s',
              background: on ? 'var(--s-accent)' : 'transparent',
              color: on ? 'var(--s-accent-ink)' : 'var(--s-sub)',
            }}
          >
            {o.label}
            {o.detail && <span style={{ opacity: 0.6, fontSize: 10 }}>{o.detail}</span>}
          </button>
        )
      })}
    </div>
  )
}

export function SectionLabel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--s-faint)', ...style }}>{children}</div>
  )
}
