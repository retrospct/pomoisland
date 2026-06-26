import type { CSSProperties } from 'react'
import type { CompletionAnim } from '@shared/types'
import type { IslandView } from './derive'
import { Ring } from './Ring'
import { SessionDots } from './SessionDots'
import { Menu } from './Menu'
import {
  PlayPauseLarge,
  PlayPausePeek,
  ResetLarge,
  RingGlyphLarge,
  RingGlyphSmall,
  SkipLarge,
  SkipPeek,
} from './Glyphs'

export type Present = 'collapsed' | 'peek' | 'expanded'

interface Handlers {
  onToggleExpand: () => void
  onPlayPause: () => void
  onReset: () => void
  onSkip: () => void
  onMouseDown?: (e: React.MouseEvent) => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  menuOpen: boolean
  onToggleMenu: (e: React.MouseEvent) => void
  switchLabel: string
  onSwitch: (e: React.MouseEvent) => void
  onSettings: (e: React.MouseEvent) => void
  onQuit: (e: React.MouseEvent) => void
}

interface IslandProps extends Handlers {
  present: Present
  view: IslandView
  notch: boolean
  anim: CompletionAnim
  messagesOn: boolean
}

const MONO = "'IBM Plex Mono', monospace"
const SANS = "'Inter', sans-serif"
const SERIF = "'Fraunces', serif"

function stop(e: React.MouseEvent) {
  e.stopPropagation()
}

export function Island(props: IslandProps) {
  switch (props.present) {
    case 'collapsed':
      return <Collapsed {...props} />
    case 'peek':
      return <Peek {...props} />
    case 'expanded':
      return <Expanded {...props} />
  }
}

function NotchDot({ top }: { top: number }) {
  return (
    <span
      style={{
        position: 'absolute',
        top,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: '#08090A',
        boxShadow: 'inset 0 0 0 1.5px #2A2E33',
        zIndex: 4,
      }}
    />
  )
}

function Collapsed({ view, notch, anim, onToggleExpand, onMouseDown, onMouseEnter, onMouseLeave }: IslandProps) {
  const pill: CSSProperties = {
    position: 'relative',
    zIndex: 2,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 11,
    background: '#17191D',
    color: '#F2F1EC',
    borderRadius: notch ? '0 0 20px 20px' : 999,
    padding: `${notch ? 11 : 7}px 18px 7px 8px`,
    minWidth: notch ? 208 : 0,
    justifyContent: notch ? 'space-between' : 'flex-start',
    boxShadow: '0 14px 38px rgba(0,0,0,.42),0 3px 9px rgba(0,0,0,.3)',
    cursor: 'pointer',
    minHeight: 44,
    boxSizing: 'border-box',
  }
  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      {view.isComplete && <CompletionFx anim={anim} accent={view.accent} accentBright={view.accentBright} />}
      <div
        className="island-pill"
        data-island="1"
        style={pill}
        onClick={onToggleExpand}
        onMouseDown={onMouseDown}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {notch && <NotchDot top={5} />}
        {view.showRing && (
          <Ring size={30} radius={11} strokeWidth={3} trackColor="rgba(242,241,236,0.15)" accent={view.accent} frac={view.frac} running={view.isRunning}>
            <RingGlyphSmall glyph={view.glyph} accent={view.accent} />
          </Ring>
        )}
        {view.showTimeText && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, lineHeight: 1, flex: '0 0 auto' }}>
            <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.16em', color: view.accent, fontWeight: 500, whiteSpace: 'nowrap' }}>
              {view.statusLabel}
            </span>
            <span style={{ fontFamily: MONO, fontSize: 15, fontWeight: 500, letterSpacing: '0.01em', fontVariantNumeric: 'tabular-nums', color: '#F2F1EC', whiteSpace: 'nowrap' }}>
              {view.timeStr}
            </span>
          </div>
        )}
        <SessionDots dots={view.dots} />
      </div>
    </div>
  )
}

function Peek({ view, notch, onToggleExpand, onPlayPause, onSkip }: IslandProps) {
  return (
    <div
      style={{
        width: 266,
        boxSizing: 'border-box',
        background: '#17191D',
        color: '#F2F1EC',
        borderRadius: notch ? '0 0 22px 22px' : 22,
        padding: `${notch ? 21 : 15}px 18px 15px`,
        boxShadow: '0 22px 56px rgba(0,0,0,.46),0 4px 12px rgba(0,0,0,.3)',
        fontFamily: SANS,
        position: 'relative',
        cursor: 'pointer',
      }}
      onClick={onToggleExpand}
    >
      {notch && <NotchDot top={8} />}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 11 }}>
        <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.16em', color: view.accent, fontWeight: 500 }}>{view.statusLabel}</span>
        <SessionDots dots={view.dots} />
      </div>
      <div style={{ fontSize: 12.5, color: view.taskColor, fontStyle: view.taskItalic ? 'italic' : 'normal', letterSpacing: '-0.005em', marginBottom: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {view.displayTask}
      </div>
      <div style={{ height: 4, borderRadius: 999, background: 'rgba(242,241,236,0.13)', overflow: 'hidden', marginBottom: 13 }}>
        <div style={{ height: '100%', width: `${Math.round(view.frac * 100)}%`, background: view.accent, borderRadius: 999, transition: 'width .35s' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ fontFamily: MONO, fontSize: 28, fontWeight: 500, lineHeight: 0.92, letterSpacing: '0.01em', fontVariantNumeric: 'tabular-nums', color: '#F2F1EC' }}>
          {view.timeStr}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '0 0 auto' }}>
          <button
            aria-label="Play / pause"
            onClick={(e) => { stop(e); onPlayPause() }}
            style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: view.accent, color: '#17191D', display: 'grid', placeItems: 'center', cursor: 'pointer', flex: '0 0 auto', padding: 0 }}
          >
            <PlayPausePeek isPause={view.isRunning} />
          </button>
          <button
            aria-label="Next"
            onClick={(e) => { stop(e); onSkip() }}
            style={{ width: 28, height: 32, borderRadius: '50%', border: 'none', background: 'transparent', color: 'rgba(242,241,236,0.85)', display: 'grid', placeItems: 'center', cursor: 'pointer', flex: '0 0 auto', padding: 0 }}
          >
            <SkipPeek />
          </button>
        </div>
      </div>
    </div>
  )
}

function Expanded(props: IslandProps) {
  const { view, notch, messagesOn, onToggleExpand, onPlayPause, onReset, onSkip } = props
  return (
    <div
      style={{
        width: 320,
        boxSizing: 'border-box',
        background: '#17191D',
        color: '#F2F1EC',
        borderRadius: notch ? '0 0 26px 26px' : 26,
        padding: `${notch ? 24 : 20}px 22px 18px`,
        boxShadow: '0 24px 64px rgba(0,0,0,.48),0 5px 14px rgba(0,0,0,.32)',
        fontFamily: SANS,
        position: 'relative',
        cursor: 'pointer',
      }}
      onClick={onToggleExpand}
    >
      {notch && <NotchDot top={9} />}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 }}>
        <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.16em', color: view.accent, fontWeight: 500, whiteSpace: 'nowrap' }}>{view.statusLabel}</span>
        <SessionDots dots={view.dots} gap={6} />
      </div>
      <div style={{ fontSize: 13.5, color: view.taskColor, fontStyle: view.taskItalic ? 'italic' : 'normal', marginBottom: 15, letterSpacing: '-0.005em' }}>
        {view.displayTask}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 18 }}>
        <Ring size={64} radius={27} strokeWidth={4} trackColor="rgba(242,241,236,0.13)" accent={view.accent} frac={view.frac} running={view.isRunning}>
          <RingGlyphLarge glyph={view.glyph} accent={view.accent} />
        </Ring>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={{ fontFamily: MONO, fontSize: 38, fontWeight: 500, lineHeight: 0.95, letterSpacing: '0.005em', fontVariantNumeric: 'tabular-nums' }}>{view.timeStr}</span>
          {messagesOn && (
            <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 14, lineHeight: 1.25, color: view.accent, letterSpacing: '-0.01em' }}>{view.micro}</span>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <button className="island-icon-btn" onClick={(e) => { stop(e); onReset() }} aria-label="Reset" style={outlineBtn}>
          <ResetLarge />
        </button>
        <button className="island-primary-btn" onClick={(e) => { stop(e); onPlayPause() }} aria-label="Play / pause" style={{ width: 54, height: 54, borderRadius: '50%', border: 'none', background: view.accent, color: '#17191D', display: 'grid', placeItems: 'center', cursor: 'pointer', boxShadow: `0 6px 18px ${view.accentSoft}` }}>
          <PlayPauseLarge isPause={view.isRunning} />
        </button>
        <button className="island-icon-btn" onClick={(e) => { stop(e); onSkip() }} aria-label="Skip" style={outlineBtn}>
          <SkipLarge />
        </button>
        <div style={{ flex: 1 }} />
        <Menu
          open={props.menuOpen}
          onToggleMenu={props.onToggleMenu}
          switchLabel={props.switchLabel}
          onSwitch={props.onSwitch}
          onSettings={props.onSettings}
          onQuit={props.onQuit}
        />
      </div>
    </div>
  )
}

const outlineBtn: CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: '50%',
  border: '1px solid rgba(242,241,236,0.18)',
  background: 'transparent',
  color: 'rgba(242,241,236,0.78)',
  display: 'grid',
  placeItems: 'center',
  cursor: 'pointer',
  transition: 'all .16s',
}

// ---- Completion effects ----

interface RippleDef {
  op: number
  sc: number
  dur: number
  delay: number
  w: number
  bright: boolean
}

const RIPPLE_DEFS: Record<Exclude<CompletionAnim, 'confetti' | 'none'>, RippleDef[]> = {
  ripple: [
    { op: 0.92, sc: 2.0, dur: 2.6, delay: 0, w: 2.5, bright: true },
    { op: 0.62, sc: 2.12, dur: 2.6, delay: 0.34, w: 2, bright: false },
    { op: 0.4, sc: 2.22, dur: 2.6, delay: 0.68, w: 1.5, bright: false },
  ],
  bloom: [{ op: 0.85, sc: 2.45, dur: 2.8, delay: 0, w: 3, bright: true }],
  heartbeat: [
    { op: 0.98, sc: 1.95, dur: 3.0, delay: 0, w: 2.5, bright: true },
    { op: 0.7, sc: 2.05, dur: 3.0, delay: 0.2, w: 2, bright: false },
  ],
}

function CompletionFx({ anim, accent, accentBright }: { anim: CompletionAnim; accent: string; accentBright: string }) {
  if (anim === 'none') return null
  if (anim === 'confetti') return <Confetti accent={accent} accentBright={accentBright} />
  const defs = RIPPLE_DEFS[anim]
  return (
    <>
      <span
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 999,
          boxShadow: `0 0 34px 6px ${accentBright}`,
          animation: 'islandGlow 2.6s ease-in-out infinite',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      {defs.map((d, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            inset: -1,
            borderRadius: 999,
            border: `${d.w}px solid ${d.bright ? accentBright : accent}`,
            pointerEvents: 'none',
            zIndex: 3,
            // CSS custom props consumed by the islandRipple keyframe.
            ['--op' as string]: d.op,
            ['--sc' as string]: d.sc,
            animation: `islandRipple ${d.dur}s cubic-bezier(.16,.6,.3,1) ${d.delay}s infinite`,
          }}
        />
      ))}
    </>
  )
}

function Confetti({ accent, accentBright }: { accent: string; accentBright: string }) {
  const cols = ['#8FC8C0', '#E2A24A', '#F2F1EC', accent, accentBright]
  const pieces = Array.from({ length: 14 }, (_, i) => {
    const ang = (i / 14) * Math.PI * 2 + (i % 2 ? 0.3 : -0.2)
    const dist = 44 + (i % 3) * 16
    const dx = Math.cos(ang) * dist
    const dy = Math.sin(ang) * dist - 12
    return (
      <span
        key={i}
        style={{
          position: 'absolute',
          left: '50%',
          top: '45%',
          zIndex: 1,
          width: i % 3 === 0 ? 5 : 4,
          height: i % 4 === 0 ? 10 : 4,
          background: cols[i % cols.length],
          borderRadius: i % 2 ? 999 : 1,
          ['--dx' as string]: `${dx}px`,
          ['--dy' as string]: `${dy}px`,
          transform: 'translate(-50%,-50%)',
          animation: 'islandConfetti 1.15s cubic-bezier(.18,.7,.3,1) forwards',
          animationDelay: `${i * 0.012}s`,
          opacity: 0,
          pointerEvents: 'none',
        }}
      />
    )
  })
  return <>{pieces}</>
}
