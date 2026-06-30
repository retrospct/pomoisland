import { RIPPLE_DEFS } from '@shared/ripple'
import type { IslandElement, Ripple, TasksState } from '@shared/types'
import { useReducedMotion } from '@shared/useReducedMotion'
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

// Height allowance added below the panel when the menu is open, so the
// Electron window auto-grows to reveal the absolutely-positioned dropdown.
const MENU_ALLOWANCE = 156

export function Island(props: IslandProps) {
  let panel: React.ReactNode
  switch (props.present) {
    case 'collapsed':
      panel = <Collapsed {...props} />
      break
    case 'peek':
      panel = <Peek {...props} />
      break
    case 'expanded':
      panel = <Expanded {...props} />
      break
    case 'tasks':
      panel = <ExpandedWithTasks {...props} />
      break
    default: {
      const _exhaustive: never = props.present
      panel = _exhaustive
    }
  }

  const showMenu = (props.present === 'expanded' || props.present === 'tasks') && props.menuOpen

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {panel}
      {showMenu && (
        <>
          {/* Invisible spacer keeps the Electron window tall enough for the floating menu */}
          <div style={{ height: MENU_ALLOWANCE, pointerEvents: 'none', visibility: 'hidden' }} />
          {/* Absolutely-positioned menu — floats over task list and any other content */}
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: `calc(100% - ${MENU_ALLOWANCE}px + 4px)`,
              zIndex: 100,
            }}
            onClick={stop}
          >
            <MenuDropdown
              onTasks={props.onOpenTasks}
              onSettings={props.onSettings}
              onQuit={props.onQuit}
            />
          </div>
        </>
      )}
    </div>
  )
}

// Transparent bleed room (px) added beside and below the pill when completion FX is
// active. This forces the ResizeObserver / Electron auto-resize to grow the window so
// the expanding ripple rings are not clipped. No top bleed: the pill stays flush with
// the notch (snapped) or the existing window top edge (floating).
//
// Sizing: the worst-case ring (bloom, sc=2.45) on a 210px pill expands ~155 px past
// each edge. 180 gives that full extent plus a comfortable margin for any accent glow.
const FX_PAD = 180

// MO-20: completion fx tracks enter/exit phase to animate in and out.
// MO-30: outer wrapper grows by FX_PAD when FX fires so the window is large enough to
//        show the full ring expansion without clipping.
// Width (px) reserved between the left and right clusters for the physical camera
// when snapped, so the clusters flank the notch instead of sitting under it (MO-22).
// Approximate MacBook notch width; calibrate against real hardware later.
const NOTCH_GAP = 200
// Bar-row height reserved above a "below" cluster so it drops under the notch edge.
const BAR_ROW_H = 34

function Collapsed({ view, notch, ripple, onToggleExpand }: IslandProps) {
  const rm = useReducedMotion()
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

  const { left, below, right } = view.clusters
  // Drop the dots element when there are no dots to show, so we never render an empty pill.
  const hasContent = (key: IslandElement) => (key === 'dots' ? view.dots.length > 0 : true)
  const filled = [left, below, right].map((keys) => keys.filter(hasContent))
  const [leftKeys, belowKeys, rightKeys] = filled
  const pillCount = filled.filter((k) => k.length > 0).length
  const soloNotch = notch && pillCount <= 1

  const renderElement = (key: IslandElement) => {
    switch (key) {
      case 'ring':
        return (
          <Ring
            key="ring"
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
        )
      case 'time':
        return (
          <div
            key="time"
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
                transition: rm ? undefined : 'color 1.5s ease-in-out',
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
        )
      case 'dots':
        return <SessionDots key="dots" dots={view.dots} />
      default: {
        const _exhaustive: never = key
        return _exhaustive
      }
    }
  }

  const renderPill = (keys: IslandElement[]) => {
    if (keys.length === 0) return null
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
      // Preserve the single-pill snapped width; flanking pills size to content.
      minWidth: soloNotch ? 210 : 0,
      justifyContent: soloNotch ? 'space-between' : 'flex-start',
      boxShadow: 'none',
      cursor: 'pointer',
      minHeight: 44,
      boxSizing: 'border-box',
    }
    return (
      <div className="island-pill" data-island="1" style={pill}>
        {keys.map(renderElement)}
      </div>
    )
  }

  const fxActive = fxPhase !== 'none'

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-flex',
        // When FX fires, pad the container so the ResizeObserver sees a larger element and
        // the Electron window grows to give the ripple rings room to expand unclipped.
        // Sides and bottom only — no top pad so the pill stays flush with the notch/top edge.
        paddingLeft: fxActive ? FX_PAD : undefined,
        paddingRight: fxActive ? FX_PAD : undefined,
        paddingBottom: fxActive ? FX_PAD : undefined,
      }}
    >
      {fxActive && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: FX_PAD,
            right: FX_PAD,
            bottom: FX_PAD,
            pointerEvents: 'none',
          }}
        >
          <CompletionFx
            ripple={ripple}
            accent={view.accent}
            accentBright={view.accentBright}
            borderRadius={pillRadius}
            exiting={fxPhase === 'exit'}
          />
        </div>
      )}
      {/* left | center (notch gap + below cluster) | right — see MO-22 placement model */}
      <div
        data-island="1"
        onClick={onToggleExpand}
        style={{
          display: 'inline-grid',
          gridTemplateColumns: 'auto auto auto',
          alignItems: 'start',
        }}
      >
        <div style={{ justifySelf: 'end' }}>{renderPill(leftKeys)}</div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            // Reserve the camera gap only when clusters actually flank both sides;
            // a single-side arrangement (e.g. the default all-right) keeps today's look.
            minWidth: notch && leftKeys.length > 0 && rightKeys.length > 0 ? NOTCH_GAP : 0,
          }}
        >
          {notch && belowKeys.length > 0 && <div aria-hidden style={{ height: BAR_ROW_H }} />}
          {renderPill(belowKeys)}
        </div>
        <div style={{ justifySelf: 'start' }}>{renderPill(rightKeys)}</div>
      </div>
    </div>
  )
}

function Peek({ view, notch, onToggleExpand, onPlayPause, onSkip }: IslandProps) {
  const rm = useReducedMotion()
  return (
    <div
      style={{
        width: 272,
        boxSizing: 'border-box',
        background: 'var(--il-bg)',
        color: 'var(--il-text)',
        borderRadius: notch ? '0 0 22px 22px' : 22,
        padding: `${notch ? 22 : 16}px 20px 17px`,
        boxShadow: 'none',
        fontFamily: SANS,
        position: 'relative',
        cursor: 'pointer',
      }}
      onClick={onToggleExpand}
    >
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
            transition: rm ? undefined : 'color 1.5s ease-in-out',
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
            transition: rm
              ? 'background 1.5s ease-in-out'
              : 'width .35s, background 1.5s ease-in-out',
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
              transition: rm ? undefined : 'background 1.5s ease-in-out',
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
function ExpandedBody(props: IslandProps & { bottomRadius?: string | number }) {
  const rm = useReducedMotion()
  const { view, notch, messagesOn, onToggleExpand, onPlayPause, onReset, onSkip, bottomRadius } =
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
        boxShadow: 'none',
        fontFamily: SANS,
        position: 'relative',
        cursor: 'pointer',
      }}
      onClick={onToggleExpand}
    >
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
            transition: rm ? undefined : 'color 1.5s ease-in-out',
          }}
        >
          {view.statusLabel}
        </span>
        <SessionDots
          dots={view.dots}
          gap={6}
          completedToday={view.completedToday}
          dailyGoal={view.dailyGoal}
        />
      </div>

      {/* Task text — clicking opens the task list (non-drag hotspot per MO-6) */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Open task list"
        onClick={(e) => {
          stop(e)
          props.onOpenTasks(e)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ')
            props.onOpenTasks(e as unknown as React.MouseEvent)
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
          onClick={(e) => {
            stop(e)
            onReset()
          }}
          aria-label="Reset"
          style={iconBtn}
        >
          <ResetLarge />
        </button>
        <button
          className="island-primary-btn"
          onClick={(e) => {
            stop(e)
            onPlayPause()
          }}
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
            // Combine transform (hover/press, 0.16s) with accent shift (urgent, 1.5s).
            // Inline transition overrides the CSS class, so we carry both properties here.
            transition: rm
              ? 'background 0s, box-shadow 0s'
              : 'transform 0.16s, background 1.5s ease-in-out, box-shadow 1.5s ease-in-out',
          }}
        >
          <PlayPauseLarge isPause={view.isRunning} />
        </button>
        <button
          className="island-icon-btn"
          onClick={(e) => {
            stop(e)
            onSkip()
          }}
          aria-label="Skip"
          style={iconBtn}
        >
          <SkipLarge />
        </button>
        <div style={{ flex: 1 }} />
        <Menu onToggleMenu={props.onToggleMenu} />
      </div>
    </div>
  )
}

function Expanded(props: IslandProps) {
  return <ExpandedBody {...props} />
}

/** Expanded panel with the task list appended below — shadow on wrapper, not inner body. */
function ExpandedWithTasks(props: IslandProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: props.notch ? '0 0 26px 26px' : 26,
        boxShadow: 'none',
        overflow: 'hidden',
      }}
    >
      <ExpandedBody {...props} bottomRadius={0} />
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
  const rm = useReducedMotion()
  const defs = RIPPLE_DEFS[ripple]
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        // Keep the exit fade even at reduced-motion — it's a single short pulse,
        // not a looping animation, and it signals state completion.
        animation: exiting ? 'islandFxExit 0.55s ease-out forwards' : undefined,
      }}
    >
      <span
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius,
          boxShadow: `0 0 34px 6px ${accentBright}`,
          // With reduced-motion: hold glow at peak opacity instead of pulsing.
          animation: exiting || rm ? undefined : 'islandGlow 2.6s ease-in-out infinite',
          opacity: rm && !exiting ? 0.66 : undefined,
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
            // With reduced-motion: show only the first ring at resting opacity,
            // no expand/loop. Show nothing for subsequent rings so the state
            // is still visible without any motion.
            opacity: rm && !exiting ? (i === 0 ? d.op : 0) : undefined,
            animation:
              exiting || rm
                ? undefined
                : `islandRipple ${d.dur}s cubic-bezier(.16,.6,.3,1) ${d.delay}s infinite`,
          }}
        />
      ))}
    </div>
  )
}
