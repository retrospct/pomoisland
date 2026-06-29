import { RIPPLE_DEFS } from '@shared/ripple'
import type { Ripple, TasksState } from '@shared/types'
import type { CSSProperties } from 'react'
import { useEffect, useRef, useState } from 'react'
import type { IslandView } from './derive'
import {
  PlayPauseLarge,
  PlayPausePeek,
  ResetLarge,
  RingGlyphLarge,
  RingGlyphSmall,
  SkipLarge,
  SkipPeek,
} from './Glyphs'
import { Menu, MenuDropdown } from './Menu'
import { Ring } from './Ring'
import { SessionDots } from './SessionDots'
import { TaskList } from './TaskList'

export type Present = 'collapsed' | 'peek' | 'expanded' | 'tasks'

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
  onOpenTasks: (e: React.MouseEvent) => void
  onCloseTasks: () => void
  onSettings: (e: React.MouseEvent) => void
  onQuit: (e: React.MouseEvent) => void
}

interface IslandProps extends Handlers {
  present: Present
  view: IslandView
  notch: boolean
  ripple: Ripple
  messagesOn: boolean
  tasks: TasksState | null
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
    case 'tasks':
      return <ExpandedWithTasks {...props} />
    default: {
      const _exhaustive: never = props.present
      return _exhaustive
    }
  }
}

// Simulates the physical notch camera — always black regardless of theme.
function NotchDot({ top, size = 7 }: { top: number; size?: number }) {
  return (
    <span
      style={{
        position: 'absolute',
        top,
        left: '50%',
        transform: 'translateX(-50%)',
        width: size,
        height: size,
        borderRadius: '50%',
        background: '#08090A',
        boxShadow: 'inset 0 0 0 1.5px #2A2E33',
        zIndex: 4,
      }}
    />
  )
}

// MO-20: completion fx tracks enter/exit phase to animate in and out.
function Collapsed({
  view,
  notch,
  ripple,
  onToggleExpand,
  onMouseDown,
  onMouseEnter,
  onMouseLeave,
}: IslandProps) {
  const pillRadius: CSSProperties['borderRadius'] = notch ? '0 0 20px 20px' : 999

  const [fxPhase, setFxPhase] = useState<'enter' | 'exit' | 'none'>('none')
  const fxActiveRef = useRef(false)

  useEffect(() => {
    if (view.isComplete) {
      fxActiveRef.current = true
      setFxPhase('enter')
      return
    }
    if (fxActiveRef.current) {
      fxActiveRef.current = false
      setFxPhase('exit')
      const t = setTimeout(() => setFxPhase('none'), 550)
      return () => clearTimeout(t)
    }
  }, [view.isComplete])

  const pill: CSSProperties = {
    position: 'relative',
    zIndex: 2,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 13,
    background: 'var(--il-bg)',
    color: 'var(--il-text)',
    borderRadius: pillRadius,
    padding: `${notch ? 13 : 8}px 20px 9px 10px`,
    minWidth: notch ? 210 : 0,
    justifyContent: notch ? 'space-between' : 'flex-start',
    boxShadow: '0 14px 38px rgba(0,0,0,.42),0 3px 9px rgba(0,0,0,.3)',
    cursor: 'pointer',
    minHeight: 44,
    boxSizing: 'border-box',
  }

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      {fxPhase !== 'none' && (
        <CompletionFx
          ripple={ripple}
          accent={view.accent}
          accentBright={view.accentBright}
          borderRadius={pillRadius}
          exiting={fxPhase === 'exit'}
        />
      )}
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
          <Ring
            size={30}
            radius={11}
            strokeWidth={3}
            trackColor="var(--il-track)"
            accent={view.accent}
            frac={view.frac}
            running={view.isRunning}
          >
            <RingGlyphSmall glyph={view.glyph} accent={view.accent} />
          </Ring>
        )}
        {view.showTimeText && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
              lineHeight: 1,
              flex: '0 0 auto',
            }}
          >
            <span
              style={{
                fontFamily: MONO,
                fontSize: 10,
                letterSpacing: '0.16em',
                color: view.accent,
                fontWeight: 500,
                whiteSpace: 'nowrap',
              }}
            >
              {view.statusLabel}
            </span>
            <span
              style={{
                fontFamily: MONO,
                fontSize: 15,
                fontWeight: 500,
                letterSpacing: '0.01em',
                fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap',
              }}
            >
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
        width: 272,
        boxSizing: 'border-box',
        background: 'var(--il-bg)',
        color: 'var(--il-text)',
        borderRadius: notch ? '0 0 22px 22px' : 22,
        padding: `${notch ? 22 : 16}px 20px 17px`,
        boxShadow: '0 22px 56px rgba(0,0,0,.46),0 4px 12px rgba(0,0,0,.3)',
        fontFamily: SANS,
        position: 'relative',
        cursor: 'pointer',
      }}
      onClick={onToggleExpand}
    >
      {notch && <NotchDot top={8} size={8} />}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          marginBottom: 13,
        }}
      >
        <span
          style={{
            fontFamily: MONO,
            fontSize: 10.5,
            letterSpacing: '0.16em',
            color: view.accent,
            fontWeight: 500,
          }}
        >
          {view.statusLabel}
        </span>
        <SessionDots dots={view.dots} />
      </div>
      <div
        style={{
          fontSize: 12.5,
          color: view.taskColor,
          fontStyle: 'normal',
          letterSpacing: '-0.005em',
          marginBottom: 13,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {view.displayTask}
      </div>
      <div
        style={{
          height: 4,
          borderRadius: 999,
          background: 'var(--il-track)',
          overflow: 'hidden',
          marginBottom: 14,
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${Math.round(view.frac * 100)}%`,
            background: view.accent,
            borderRadius: 999,
            transition: 'width .35s',
          }}
        />
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div
          style={{
            fontFamily: MONO,
            fontSize: 28,
            fontWeight: 500,
            lineHeight: 0.92,
            letterSpacing: '0.01em',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {view.timeStr}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '0 0 auto' }}>
          <button
            aria-label="Play / pause"
            onClick={(e) => {
              stop(e)
              onPlayPause()
            }}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              border: 'none',
              background: view.accent,
              color: 'var(--il-bg)',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              flex: '0 0 auto',
              padding: 0,
            }}
          >
            <PlayPausePeek isPause={view.isRunning} />
          </button>
          <button
            aria-label="Next"
            onClick={(e) => {
              stop(e)
              onSkip()
            }}
            style={{
              width: 28,
              height: 32,
              borderRadius: '50%',
              border: 'none',
              background: 'transparent',
              color: 'var(--il-body)',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              flex: '0 0 auto',
              padding: 0,
            }}
          >
            <SkipPeek />
          </button>
        </div>
      </div>
    </div>
  )
}

/** Shared body used by both Expanded and ExpandedWithTasks. */
function ExpandedBody(props: IslandProps & { bottomRadius?: string | number; noShadow?: boolean }) {
  const { view, notch, messagesOn, onToggleExpand, onPlayPause, onReset, onSkip, bottomRadius, noShadow } =
    props
  const br = bottomRadius ?? 26
  return (
    <div
      style={{
        width: 320,
        boxSizing: 'border-box',
        background: 'var(--il-bg)',
        color: 'var(--il-text)',
        borderRadius: `${notch ? '0 0' : '26px 26px'} ${br}px ${br}px`,
        padding: `${notch ? 26 : 22}px 24px 20px`,
        boxShadow: noShadow ? 'none' : '0 24px 64px rgba(0,0,0,.48),0 5px 14px rgba(0,0,0,.32)',
        fontFamily: SANS,
        position: 'relative',
        cursor: 'pointer',
      }}
      onClick={onToggleExpand}
    >
      {notch && <NotchDot top={9} size={8} />}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 15,
        }}
      >
        <span
          style={{
            fontFamily: MONO,
            fontSize: 11,
            letterSpacing: '0.16em',
            color: view.accent,
            fontWeight: 500,
            whiteSpace: 'nowrap',
          }}
        >
          {view.statusLabel}
        </span>
        <SessionDots dots={view.dots} gap={6} completedToday={view.completedToday} />
      </div>

      {/* Task text — clicking opens the task list (non-drag hotspot per MO-6) */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Open task list"
        onClick={(e) => { stop(e); props.onOpenTasks(e) }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') props.onOpenTasks(e as unknown as React.MouseEvent)
        }}
        style={{
          fontSize: 13.5,
          color: view.taskColor,
          fontStyle: 'normal',
          marginBottom: 17,
          letterSpacing: '-0.005em',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        {view.displayTask}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 20 }}>
        <Ring
          size={64}
          radius={27}
          strokeWidth={4}
          trackColor="var(--il-track)"
          accent={view.accent}
          frac={view.frac}
          running={view.isRunning}
        >
          <RingGlyphLarge glyph={view.glyph} accent={view.accent} />
        </Ring>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span
            style={{
              fontFamily: MONO,
              fontSize: 38,
              fontWeight: 500,
              lineHeight: 0.95,
              letterSpacing: '0.005em',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {view.timeStr}
          </span>
          {messagesOn && (
            <span
              style={{
                fontFamily: SERIF,
                fontStyle: 'italic',
                fontSize: 14,
                lineHeight: 1.25,
                color: view.accent,
                letterSpacing: '-0.01em',
              }}
            >
              {view.micro}
            </span>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
        <button
          className="island-icon-btn"
          onClick={(e) => { stop(e); onReset() }}
          aria-label="Reset"
          style={iconBtn}
        >
          <ResetLarge />
        </button>
        <button
          className="island-primary-btn"
          onClick={(e) => { stop(e); onPlayPause() }}
          aria-label="Play / pause"
          style={{
            width: 54,
            height: 54,
            borderRadius: '50%',
            border: 'none',
            background: view.accent,
            color: 'var(--il-bg)',
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
            boxShadow: `0 6px 18px ${view.accentSoft}`,
          }}
        >
          <PlayPauseLarge isPause={view.isRunning} />
        </button>
        <button
          className="island-icon-btn"
          onClick={(e) => { stop(e); onSkip() }}
          aria-label="Skip"
          style={iconBtn}
        >
          <SkipLarge />
        </button>
        <div style={{ flex: 1 }} />
        <Menu onToggleMenu={props.onToggleMenu} />
      </div>
      {props.menuOpen && (
        <div
          style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}
          onClick={stop}
        >
          <MenuDropdown onTasks={props.onOpenTasks} onSettings={props.onSettings} onQuit={props.onQuit} />
        </div>
      )}
    </div>
  )
}

function Expanded(props: IslandProps) {
  return <ExpandedBody {...props} />
}

/** Expanded panel with the task list appended below. */
/** Expanded panel with the task list appended below — shadow on wrapper, not inner body. */
function ExpandedWithTasks(props: IslandProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      borderRadius: props.notch ? '0 0 26px 26px' : 26,
      boxShadow: '0 24px 64px rgba(0,0,0,.48),0 5px 14px rgba(0,0,0,.32)',
      overflow: 'hidden',
    }}>
      <ExpandedBody {...props} bottomRadius={0} noShadow />
      {props.tasks && (
        <TaskList tasks={props.tasks} accent={props.view.accent} onClose={props.onCloseTasks} />
      )}
    </div>
  )
}

const iconBtn: CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: '50%',
  border: 'none',
  background: 'transparent',
  color: 'var(--il-muted)',
  display: 'grid',
  placeItems: 'center',
  cursor: 'pointer',
  transition: 'all .16s',
}

// ---- Completion effects ----

function CompletionFx({
  ripple,
  accent,
  accentBright,
  borderRadius,
  exiting,
}: {
  ripple: Ripple
  accent: string
  accentBright: string
  borderRadius: CSSProperties['borderRadius']
  exiting: boolean
}) {
  const defs = RIPPLE_DEFS[ripple]
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        animation: exiting ? 'islandFxExit 0.55s ease-out forwards' : undefined,
      }}
    >
      <span
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius,
          boxShadow: `0 0 34px 6px ${accentBright}`,
          animation: exiting ? undefined : 'islandGlow 2.6s ease-in-out infinite',
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
            borderRadius,
            border: `${d.w}px solid ${d.bright ? accentBright : accent}`,
            pointerEvents: 'none',
            zIndex: 3,
            ['--op' as string]: d.op,
            ['--sc' as string]: d.sc,
            animation: exiting
              ? undefined
              : `islandRipple ${d.dur}s cubic-bezier(.16,.6,.3,1) ${d.delay}s infinite`,
          }}
        />
      ))}
    </div>
  )
}
