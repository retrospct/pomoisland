import { RIPPLE_DEFS } from '@shared/ripple'
import type { IslandElement, Ripple, TasksState, TimerStyle } from '@shared/types'
import { useReducedMotion } from '@shared/useReducedMotion'
import { renderProgressTrace } from '@shared/progressTrace'
import type { CSSProperties } from 'react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
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
  onCheckUpdates: (e: React.MouseEvent) => void
  onQuit: (e: React.MouseEvent) => void
}

interface IslandProps extends Handlers {
  present: Present
  view: IslandView
  notch: boolean
  /** True when the current display has a hardware notch. */
  hasNotch: boolean
  /** Height (px) of the notch band: workArea.y - bounds.y. */
  notchHeight: number
  /** Notch width (px) used to size the wrap spacer; 0 on non-notch displays. */
  notchWidth: number
  /** Snapped-island surface color (resolved from Prefs.notchBackground). Applied
   *  as a local `--il-bg` override on the Island root when `notch` is true, so
   *  every descendant that reads var(--il-bg) picks it up automatically. */
  notchBg: string
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
// Sized for the 4 items (Tasks, Settings, Check for updates, Quit) + separator.
const MENU_ALLOWANCE = 200

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
    <div
      style={{
        position: 'relative',
        display: 'inline-block',
        // Room for the inverse-rounded ears, which flare beyond the card's sides
        // when snapped — plus a few px clearance so the ear (and its trace) isn't
        // clipped flush at the window edge. Symmetric, so the card stays centered.
        paddingLeft: props.notch ? EAR_SIZE + 8 : undefined,
        paddingRight: props.notch ? EAR_SIZE + 8 : undefined,
        // Override --il-bg for the whole snapped subtree (menu popover, task
        // list, ears — everything reads var(--il-bg)) so Prefs.notchBackground
        // controls the notch's surface color without touching every consumer.
        // Not applied while floating: the floating card always follows the theme.
        ...(props.notch ? { ['--il-bg' as string]: props.notchBg } : {}),
      }}
    >
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
              onCheckUpdates={props.onCheckUpdates}
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

// Always-on transparent bleed (px) beside + below the snapped body so the running
// progress trace's blur halo (glow ~3.5px, comet, the front dot r7+blur, and the
// underlight ellipses' blur(10) at the bottom) isn't clipped by the tight window
// bounds. Smaller than FX_PAD since the trace halo is far smaller than a ripple.
const TRACE_BLEED = 22

// MO-20: completion fx tracks enter/exit phase to animate in and out.
// MO-30: outer wrapper grows by FX_PAD when FX fires so the window is large enough to
//        show the full ring expansion without clipping.
// Width (px) reserved between the left and right clusters for the physical camera
// when snapped, so the clusters flank the notch instead of sitting under it (MO-22).
// Approximate MacBook notch width; calibrate against real hardware later.
const NOTCH_GAP = 200

/**
 * Extra buffer (px) added on top of the estimated notch width when reserving
 * the flanking spacer. `notchWidth` comes from EstimateNotchProvider's
 * display-width fraction (see electron/notch.ts), not a per-model hardware
 * measurement, so it can run a bit narrow on some MacBook models — without
 * this margin, flanking content (e.g. combined status + time text) can
 * overflow into the real notch's footprint and get visually clipped by the
 * physical camera housing.
 */
const NOTCH_WIDTH_SAFETY = 28

// Size (px) of the inverse-rounded "ears" at the top corners of a snapped card.
// Also the horizontal bleed the window needs so the ears aren't clipped.
const EAR_SIZE = 13

/**
 * Dynamic-island / notch top corners. When a card is snapped flush against the
 * screen's top edge, its top-left and top-right corners flare slightly *wider*
 * than the body and curve back in with a concave (inverse) fillet — the SuperIsland
 * shape, where the body looks like it grows out of the top bezel.
 *
 * Implemented as two absolutely-positioned boxes filled with the card background;
 * a radial-gradient carves a concave quarter-circle out of each box's inner-bottom,
 * leaving solid fill along the top edge (the wide flare) and the inner side (the
 * join to the body). The parent must be position:relative, and the window needs
 * EAR_SIZE of horizontal bleed (added on the Island wrapper when snapped) so the
 * ears render instead of being clipped.
 */
function NotchEars() {
  const base: CSSProperties = {
    position: 'absolute',
    top: 0,
    width: EAR_SIZE,
    height: EAR_SIZE,
    pointerEvents: 'none',
  }
  // transparent inside the radius, card bg outside → concave corner.
  const fill = `transparent ${EAR_SIZE - 0.6}px, var(--il-bg) ${EAR_SIZE}px`
  return (
    <>
      <div
        aria-hidden
        style={{ ...base, left: -EAR_SIZE, background: `radial-gradient(circle at 0 100%, ${fill})` }}
      />
      <div
        aria-hidden
        style={{ ...base, right: -EAR_SIZE, background: `radial-gradient(circle at 100% 100%, ${fill})` }}
      />
    </>
  )
}

function Collapsed({ view, notch, hasNotch, notchHeight, notchWidth, ripple, onToggleExpand }: IslandProps) {
  const rm = useReducedMotion()

  const [fxPhase, setFxPhase] = useState<'enter' | 'exit' | 'none'>('none')
  const fxActiveRef = useRef(false)

  // Body measurement for snapped CardOutline overlay — must be unconditional (React rules of hooks)
  const bodyRef = useRef<HTMLDivElement>(null)
  const [bodyDims, setBodyDims] = useState({ w: 0, h: 0 })
  useLayoutEffect(() => {
    if (!notch) return  // only measure in snapped mode
    const el = bodyRef.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    const w = Math.round(width), h = Math.round(height)
    setBodyDims(prev => (prev.w === w && prev.h === h) ? prev : { w, h })
  })


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
      case 'status':
        return (
          <span
            key="status"
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
        )
      case 'time':
        return (
          <span
            key="time"
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
        )
      case 'dots':
        return <SessionDots key="dots" dots={view.dots} />
      default: {
        const _exhaustive: never = key
        return _exhaustive
      }
    }
  }

  // renderPill is used for the floating (non-snapped) layout only.
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
      borderRadius: 999,
      padding: '8px 20px 9px 10px',
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
  // Both snapped bodies square the top so they hang flush from the screen's top
  // edge — the real-notch wrap meets the camera housing, the non-notch dock
  // mimics a notch. Only the floating (un-snapped) card is fully rounded.
  const wrapNotch = notch && hasNotch
  const fxBorderRadius: CSSProperties['borderRadius'] = notch
    ? wrapNotch
      ? '0 0 20px 20px'
      : '0 0 22px 22px'
    : 999

  if (notch) {
    const belowVisible = belowKeys.filter(hasContent)
    const leftVisible = leftKeys.filter(hasContent)
    const rightVisible = rightKeys.filter(hasContent)

    // Effective notch width — provider estimate (+ safety buffer, since the
    // estimate isn't pixel-exact per model), falling back to the legacy
    // constant if metrics haven't arrived yet.
    const spacerW = (notchWidth > 0 ? notchWidth : NOTCH_GAP) + NOTCH_WIDTH_SAFETY

    // Transparent bleed beside + below the body (never above — the top stays
    // flush at y=0) so the progress trace's blur/comet/front-dot halo isn't
    // clipped by the tight window bounds. Completion FX uses the larger FX_PAD.
    const traceBleed = view.timerStyle !== 'below' ? TRACE_BLEED : 0

    return (
      <div
        style={{
          position: 'relative',
          display: 'inline-flex',
          paddingLeft: fxActive ? FX_PAD : traceBleed,
          paddingRight: fxActive ? FX_PAD : traceBleed,
          paddingBottom: fxActive ? FX_PAD : traceBleed,
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
              borderRadius={fxBorderRadius}
              exiting={fxPhase === 'exit'}
            />
          </div>
        )}
        {hasNotch ? (
          // ── Snapped unified body: wraps the real notch (Fix 8) ───────────────
          // One dark body div with squared top corners (meets the physical notch)
          // and rounded bottom. Left/right elements flank the notch; below content
          // sits flush under the notch spacer (sized to the real notch width). No
          // mock notch drawn — real hardware shows through the transparent center.
          <div
            ref={bodyRef}
            data-island="1"
            onClick={onToggleExpand}
            style={{
              position: 'relative',
              display: 'inline-grid',
              gridTemplateColumns: 'auto auto auto',
              alignItems: 'center',
              background: 'var(--il-bg)',
              color: 'var(--il-text)',
              borderRadius: '0 0 20px 20px',
              cursor: 'pointer',
            }}
          >
            <NotchEars />
            {/* Left column — bare elements flanking the notch. Marked as its own
                hover target (MO-45): the transparent notch spacer beside it must
                stay a dead zone, not part of the peek-trigger region. */}
            <div
              data-hover-target="1"
              style={{
                alignSelf: 'center',
                padding: '0 10px 0 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 13,
              }}
            >
              {leftVisible.map(renderElement)}
            </div>

            {/* Center column — transparent notch spacer + below content. Only the
                below-content row (if any) is marked as a hover target; the spacer
                above it stays a dead zone (MO-45). */}
            <div
              style={{
                minWidth: spacerW,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <div aria-hidden style={{ height: notchHeight, minWidth: spacerW, flexShrink: 0 }} />
              {belowVisible.length > 0 && (
                <div
                  data-hover-target="1"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 13,
                    padding: '8px 20px 12px',
                  }}
                >
                  {belowVisible.map(renderElement)}
                </div>
              )}
            </div>

            {/* Right column — bare elements flanking the notch. Own hover target,
                same reasoning as the left column (MO-45). */}
            <div
              data-hover-target="1"
              style={{
                alignSelf: 'center',
                padding: '0 14px 0 10px',
                display: 'flex',
                alignItems: 'center',
                gap: 13,
              }}
            >
              {rightVisible.map(renderElement)}
            </div>

            {/* CardOutline overlay — variant-aware progress trace for non-'below' styles.
                flushTop: the squared top meets the notch, so the trace skips the top edge. */}
            {view.timerStyle !== 'below' && bodyDims.w > 0 && (
              <CardOutline
                width={bodyDims.w}
                height={bodyDims.h}
                rxTop={0}
                rxBottom={20}
                variant={view.timerStyle}
                progress={view.frac}
                accent={view.accent}
                accentBright={view.accentBright}
                flushTop
              />
            )}
          </div>
        ) : (
          // ── Snapped on a non-notch display: faux-notch dock ─────────────────
          // No physical notch, so mimic one: a single-row body with a flat top
          // (squared corners) flush against the screen's top edge and a rounded
          // bottom, hung from y=0 by the main process. All elements sit in one row.
          <div
            ref={bodyRef}
            data-island="1"
            data-hover-target="1"
            onClick={onToggleExpand}
            style={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 14,
              background: 'var(--il-bg)',
              color: 'var(--il-text)',
              // Wider + shorter to sit closer to the menu-bar / notch proportions.
              // Height follows the user's notch-height setting (min 30 so the
              // countdown always fits).
              borderRadius: '0 0 16px 16px',
              padding: '4px 28px 5px',
              cursor: 'pointer',
              minHeight: Math.max(30, notchHeight),
              boxSizing: 'border-box',
            }}
          >
            <NotchEars />
            {[...leftVisible, ...belowVisible, ...rightVisible].map(renderElement)}
            {/* flushTop: the dock's squared top is flush with the screen edge,
                so the trace skips the top edge (same rule as the real notch). */}
            {view.timerStyle !== 'below' && bodyDims.w > 0 && (
              <CardOutline
                width={bodyDims.w}
                height={bodyDims.h}
                rxTop={0}
                rxBottom={16}
                variant={view.timerStyle}
                progress={view.frac}
                accent={view.accent}
                accentBright={view.accentBright}
                flushTop
              />
            )}
          </div>
        )}
      </div>
    )
  }

  // ── Floating mode: FloatingCard (Fix 6) ──────────────────────────────────
  // A floating card is rounded on all sides, so its progress-trace glow bleeds
  // outward in every direction. Reserve transparent bleed on all four sides (when
  // the trace is active) so the window grows to fit it instead of clipping it.
  const floatBleed = view.timerStyle !== 'below' ? TRACE_BLEED : 0
  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-flex',
        paddingTop: fxActive ? undefined : floatBleed,
        paddingLeft: fxActive ? FX_PAD : floatBleed,
        paddingRight: fxActive ? FX_PAD : floatBleed,
        paddingBottom: fxActive ? FX_PAD : floatBleed,
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
            borderRadius={fxBorderRadius}
            exiting={fxPhase === 'exit'}
          />
        </div>
      )}
      <FloatingCard view={view} onToggleExpand={onToggleExpand} renderPill={renderPill} renderElement={renderElement} />
    </div>
  )
}

// ── CardOutline — variant-aware pill-border progress trace (Fix 6) ──────────
// Module-level cache avoids the dashoffset flash on remount (same pattern as
// NotchProgress.tsx cachedLen). Uses rounded-rect path geometry so all 8
// TimerStyle treatments work (via renderProgressTrace from progressTrace.tsx).
let cachedCardLen = 0

/** Build a closed rounded-rect perimeter path starting at top-center, going clockwise. */
function cardPath(W: number, H: number, rxT: number, rxB: number): string {
  const rT = Math.min(rxT, W / 2, H / 2)
  const rB = Math.min(rxB, W / 2, H / 2)
  return [
    `M ${W / 2} 0`,
    `L ${W - rT} 0`,
    `Q ${W} 0 ${W} ${rT}`,
    `L ${W} ${H - rB}`,
    `Q ${W} ${H} ${W - rB} ${H}`,
    `L ${W / 2} ${H}`,
    // continue full path for measurement — left side back to top-center
    `L ${rB} ${H}`,
    `Q 0 ${H} 0 ${H - rB}`,
    `L 0 ${rT}`,
    `Q 0 0 ${rT} 0`,
    `L ${W / 2} 0`,
    `Z`,
  ].join(' ')
}

/** Left converge path: from top-center counterclockwise to bottom-center. */
function cardLeftConverge(W: number, H: number, rxT: number, rxB: number): string {
  const rT = Math.min(rxT, W / 2, H / 2)
  const rB = Math.min(rxB, W / 2, H / 2)
  return [
    `M ${W / 2} 0`,
    `L ${rT} 0`,
    `Q 0 0 0 ${rT}`,
    `L 0 ${H - rB}`,
    `Q 0 ${H} ${rB} ${H}`,
    `L ${W / 2} ${H}`,
  ].join(' ')
}

/** Right converge path: from top-center clockwise to bottom-center. */
function cardRightConverge(W: number, H: number, rxT: number, rxB: number): string {
  const rT = Math.min(rxT, W / 2, H / 2)
  const rB = Math.min(rxB, W / 2, H / 2)
  return [
    `M ${W / 2} 0`,
    `L ${W - rT} 0`,
    `Q ${W} 0 ${W} ${rT}`,
    `L ${W} ${H - rB}`,
    `Q ${W} ${H} ${W - rB} ${H}`,
    `L ${W / 2} ${H}`,
  ].join(' ')
}

/** Left split path: from bottom-center counterclockwise to top-center (reverse of left converge). */
function cardLeftSplit(W: number, H: number, rxT: number, rxB: number): string {
  const rT = Math.min(rxT, W / 2, H / 2)
  const rB = Math.min(rxB, W / 2, H / 2)
  return [
    `M ${W / 2} ${H}`,
    `L ${rB} ${H}`,
    `Q 0 ${H} 0 ${H - rB}`,
    `L 0 ${rT}`,
    `Q 0 0 ${rT} 0`,
    `L ${W / 2} 0`,
  ].join(' ')
}

/** Right split path: from bottom-center clockwise to top-center (reverse of right converge). */
function cardRightSplit(W: number, H: number, rxT: number, rxB: number): string {
  const rT = Math.min(rxT, W / 2, H / 2)
  const rB = Math.min(rxB, W / 2, H / 2)
  return [
    `M ${W / 2} ${H}`,
    `L ${W - rB} ${H}`,
    `Q ${W} ${H} ${W} ${H - rB}`,
    `L ${W} ${rT}`,
    `Q ${W} 0 ${W - rT} 0`,
    `L ${W / 2} 0`,
  ].join(' ')
}

// ── Topless variants ────────────────────────────────────────────────────────
// When the body is snapped flush against the screen's top edge, the flat top edge
// sits against the bezel/notch surface and must NOT carry the progress trace. The
// stroke instead runs up each side and follows the inverse-rounded ear out to its
// tip at the top corner (matching NotchEars), so the trace hugs the actual card
// outline. E is the ear size; the ear tips sit at x=-E and x=W+E (SVG overflow is
// visible, so drawing outside [0,W] is fine).
const E = EAR_SIZE

/** Open perimeter minus the top edge: left ear tip → left → bottom → right → right ear tip. */
function cardPathTopless(W: number, H: number, rxB: number): string {
  const rB = Math.min(rxB, W / 2, H / 2)
  return [
    `M ${-E} 0`,
    `Q 0 0 0 ${E}`,
    `L 0 ${H - rB}`,
    `Q 0 ${H} ${rB} ${H}`,
    `L ${W - rB} ${H}`,
    `Q ${W} ${H} ${W} ${H - rB}`,
    `L ${W} ${E}`,
    `Q ${W} 0 ${W + E} 0`,
  ].join(' ')
}

/** Left converge, topless: left ear tip → left → bottom-center. */
function cardLeftConvergeTopless(W: number, H: number, rxB: number): string {
  const rB = Math.min(rxB, W / 2, H / 2)
  return [
    `M ${-E} 0`,
    `Q 0 0 0 ${E}`,
    `L 0 ${H - rB}`,
    `Q 0 ${H} ${rB} ${H}`,
    `L ${W / 2} ${H}`,
  ].join(' ')
}

/** Right converge, topless: right ear tip → right → bottom-center. */
function cardRightConvergeTopless(W: number, H: number, rxB: number): string {
  const rB = Math.min(rxB, W / 2, H / 2)
  return [
    `M ${W + E} 0`,
    `Q ${W} 0 ${W} ${E}`,
    `L ${W} ${H - rB}`,
    `Q ${W} ${H} ${W - rB} ${H}`,
    `L ${W / 2} ${H}`,
  ].join(' ')
}

/** Left split, topless: bottom-center → left → left ear tip. */
function cardLeftSplitTopless(W: number, H: number, rxB: number): string {
  const rB = Math.min(rxB, W / 2, H / 2)
  return [
    `M ${W / 2} ${H}`,
    `L ${rB} ${H}`,
    `Q 0 ${H} 0 ${H - rB}`,
    `L 0 ${E}`,
    `Q 0 0 ${-E} 0`,
  ].join(' ')
}

/** Right split, topless: bottom-center → right → right ear tip. */
function cardRightSplitTopless(W: number, H: number, rxB: number): string {
  const rB = Math.min(rxB, W / 2, H / 2)
  return [
    `M ${W / 2} ${H}`,
    `L ${W - rB} ${H}`,
    `Q ${W} ${H} ${W} ${H - rB}`,
    `L ${W} ${E}`,
    `Q ${W} 0 ${W + E} 0`,
  ].join(' ')
}

interface CardOutlineProps {
  width: number
  height: number
  /** Top corner radius (0 = square, ~999 = pill). */
  rxTop: number
  /** Bottom corner radius. */
  rxBottom: number
  variant: TimerStyle
  progress: number
  accent: string
  accentBright: string
  /**
   * When true the body's top edge is flush against the screen's top edge (snapped
   * notch-wrap / dock), so the trace omits that edge and starts/ends at the top
   * corners. Floating cards (free on all sides) leave this false for a full loop.
   */
  flushTop?: boolean
}

function CardOutline({ width: W, height: H, rxTop, rxBottom, variant, progress, accent, accentBright, flushTop = false }: CardOutlineProps) {
  const pathRef = useRef<SVGPathElement>(null)
  const [len, setLen] = useState(cachedCardLen)
  const [front, setFront] = useState({ x: W / 2, y: 0 })

  const clampedP = Math.min(1, Math.max(0, progress))
  const isSplit = variant === 'split'

  const fullPath = flushTop
    ? cardPathTopless(W, H, rxBottom)
    : cardPath(W, H, rxTop, rxBottom)
  const leftPath = flushTop
    ? isSplit
      ? cardLeftSplitTopless(W, H, rxBottom)
      : cardLeftConvergeTopless(W, H, rxBottom)
    : isSplit
      ? cardLeftSplit(W, H, rxTop, rxBottom)
      : cardLeftConverge(W, H, rxTop, rxBottom)
  const rightPath = flushTop
    ? isSplit
      ? cardRightSplitTopless(W, H, rxBottom)
      : cardRightConvergeTopless(W, H, rxBottom)
    : isSplit
      ? cardRightSplit(W, H, rxTop, rxBottom)
      : cardRightConverge(W, H, rxTop, rxBottom)

  useLayoutEffect(() => {
    const el = pathRef.current
    if (!el) return
    const l = el.getTotalLength()
    cachedCardLen = l
    setLen(l)
    if (variant === 'front' && l > 0) {
      const pt = el.getPointAtLength(l * clampedP)
      setFront({ x: +pt.x.toFixed(2), y: +pt.y.toFixed(2) })
    }
  }, [W, H, rxTop, rxBottom, variant, clampedP, flushTop])

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}
    >
      {renderProgressTrace({
        variant,
        p: clampedP,
        accent,
        accentBright,
        fullPath,
        leftPath,
        rightPath,
        meetPoint: { x: W / 2, y: H },
        len,
        front,
        pathRef,
        underlightEllipses:
          variant === 'underlight'
            ? [
                { cx: W / 2, cy: H, rx: W * 0.32, ry: H * 0.2, fill: accent, delay: undefined },
                { cx: W / 2, cy: H, rx: W * 0.22, ry: H * 0.13, fill: accentBright, opacity: 0.55, delay: '0.25s' },
              ]
            : undefined,
      })}
    </svg>
  )
}

// deps
const TRACE_INSET = 3
interface CardGeom {
  fullPath: string
  leftPath: string
  rightPath: string
  meetPoint: { x: number; y: number }
}

// ── TimerPet — animated SVG character for Layout 3 (Fix 6) ──────────────────
function TimerPet({
  isRunning,
  isBreak,
  isComplete,
  accent,
}: {
  isRunning: boolean
  isBreak: boolean
  isComplete: boolean
  accent: string
}) {
  const expression = isComplete ? 'complete' : isBreak ? 'break' : isRunning ? 'running' : 'paused'
  return (
    <svg width={48} height={48} viewBox="0 0 32 32">
      <style>{`
        @keyframes petBounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-2px)} }
        @keyframes petIdle   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-1px)} }
        .pet-body-run { animation: petBounce 3s ease-in-out infinite; transform-box:fill-box; transform-origin:center bottom }
        .pet-body-idle{ animation: petIdle   5s ease-in-out infinite; transform-box:fill-box; transform-origin:center bottom }
      `}</style>
      <g className={isRunning ? 'pet-body-run' : isBreak ? 'pet-body-idle' : undefined}>
        {/* Body */}
        <ellipse cx={16} cy={18} rx={9} ry={8} fill="rgba(242,241,236,0.10)" />
        {/* Face */}
        <ellipse cx={16} cy={15} rx={7} ry={7} fill="#17191D" stroke="rgba(242,241,236,0.08)" strokeWidth={1} />
        {/* Eyes */}
        {expression === 'running' && (
          <>
            <circle cx={13.5} cy={14.5} r={1.5} fill={accent} />
            <circle cx={18.5} cy={14.5} r={1.5} fill={accent} />
          </>
        )}
        {expression === 'paused' && (
          <>
            <path d="M12.5 14.5 Q13.5 13.8 14.5 14.5" fill="none" stroke={accent} strokeWidth={1.2} strokeLinecap="round" />
            <path d="M17.5 14.5 Q18.5 13.8 19.5 14.5" fill="none" stroke={accent} strokeWidth={1.2} strokeLinecap="round" />
          </>
        )}
        {expression === 'break' && (
          <>
            <circle cx={13.5} cy={14.5} r={2} fill={accent} opacity={0.8} />
            <circle cx={18.5} cy={14.5} r={2} fill={accent} opacity={0.8} />
          </>
        )}
        {expression === 'complete' && (
          <>
            <path d="M12 13 L13 15 L15 12" fill="none" stroke={accent} strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" />
            <path d="M17 13 L18 15 L20 12" fill="none" stroke={accent} strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
      </g>
    </svg>
  )
}

// ── L3Card — Companion layout with optional CardOutline (Fix 6) ─────────────
function L3Card({
  view,
  onToggleExpand,
  isRing,
  rx,
}: {
  view: IslandView
  onToggleExpand: () => void
  isRing: boolean
  rx: number
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState({ w: 0, h: 0 })
  useLayoutEffect(() => {
    const el = cardRef.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    const w = Math.round(width), h = Math.round(height)
    setDims(prev => (prev.w === w && prev.h === h) ? prev : { w, h })
  })
  return (
    <div
      ref={cardRef}
      data-island="1"
      data-hover-target="1"
      onClick={onToggleExpand}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        background: 'var(--il-bg)',
        color: 'var(--il-text)',
        borderRadius: rx,
        padding: '7px 14px 7px 10px',
        cursor: 'pointer',
      }}
    >
      <TimerPet
        isRunning={view.isRunning}
        isBreak={view.isBreak}
        isComplete={view.isComplete}
        accent={view.accent}
      />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
        <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.14em', color: view.accent, fontWeight: 500 }}>
          {view.statusLabel}
        </span>
        <span style={{ fontFamily: MONO, fontSize: 15, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
          {view.timeStr}
        </span>
      </div>
      {view.dots.length > 0 && <SessionDots dots={view.dots} />}
      {!isRing && dims.w > 0 && (
        <CardOutline
          width={dims.w}
          height={dims.h}
          rxTop={rx}
          rxBottom={rx}
          variant={view.timerStyle}
          progress={view.frac}
          accent={view.accent}
          accentBright={view.accentBright}
        />
      )}
    </div>
  )
}

// ── Circle geometry + outline for L4 ────────────────────────────────────────
let cachedCircleLen = 0

function circleGeometry(cx: number, cy: number, R: number, variant: TimerStyle): CardGeom {
  const isSplit = variant === 'split'
  // Full CCW circle (sweep=0 = CCW on screen): top → left → bottom → right → top
  const fullPath = `M ${cx} ${cy - R} A ${R} ${R} 0 0 0 ${cx} ${cy + R} A ${R} ${R} 0 0 0 ${cx} ${cy - R} Z`
  // converge: both halves start at top, meet at bottom
  const leftConverge  = `M ${cx} ${cy - R} A ${R} ${R} 0 0 0 ${cx} ${cy + R}` // CCW → left side
  const rightConverge = `M ${cx} ${cy - R} A ${R} ${R} 0 0 1 ${cx} ${cy + R}` // CW  → right side
  // split: reversed (start at bottom, fill outward)
  const leftSplit  = `M ${cx} ${cy + R} A ${R} ${R} 0 0 0 ${cx} ${cy - R}` // CCW from bottom → left → top
  const rightSplit = `M ${cx} ${cy + R} A ${R} ${R} 0 0 1 ${cx} ${cy - R}` // CW  from bottom → right → top
  return {
    fullPath,
    leftPath:  isSplit ? leftSplit  : leftConverge,
    rightPath: isSplit ? rightSplit : rightConverge,
    meetPoint: { x: cx, y: cy + R },
  }
}

function CircleOutline({ size, variant, progress, accent, accentBright }: {
  size: number
  variant: TimerStyle
  progress: number
  accent: string
  accentBright: string
}) {
  const pathRef = useRef<SVGPathElement>(null)
  const cx = size / 2, cy = size / 2
  const R = size / 2 - TRACE_INSET
  const [len, setLen] = useState(cachedCircleLen)
  const clampedP = Math.min(1, Math.max(0, progress))
  const [front, setFront] = useState({ x: cx, y: cy - R })

  const { fullPath, leftPath, rightPath, meetPoint } = circleGeometry(cx, cy, R, variant)

  useLayoutEffect(() => {
    const el = pathRef.current
    if (!el) return
    const l = el.getTotalLength()
    cachedCircleLen = l
    setLen(l)
    if (variant === 'front' && l > 0) {
      const pt = el.getPointAtLength(l * clampedP)
      setFront({ x: +pt.x.toFixed(2), y: +pt.y.toFixed(2) })
    }
  }, [size, variant, clampedP])

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}
    >
      {renderProgressTrace({
        variant,
        p: clampedP,
        accent,
        accentBright,
        fullPath,
        leftPath,
        rightPath,
        meetPoint,
        len,
        front,
        pathRef,
        underlightEllipses:
          variant === 'underlight'
            ? [
                { cx: meetPoint.x, cy: meetPoint.y, rx: R * 0.65, ry: R * 0.4, fill: accent, delay: undefined },
                { cx: meetPoint.x, cy: meetPoint.y, rx: R * 0.45, ry: R * 0.28, fill: accentBright, opacity: 0.55, delay: '0.25s' },
              ]
            : undefined,
      })}
    </svg>
  )
}

function CircleCard({ view, onToggleExpand }: { view: IslandView; onToggleExpand: () => void }) {
  const sz = 116
  const isRing = view.timerStyle === 'below'
  const R = sz / 2 - TRACE_INSET
  const circ = 2 * Math.PI * R
  const off = (circ * (1 - Math.min(1, view.frac))).toFixed(2)
  return (
    <div
      data-island="1"
      data-hover-target="1"
      onClick={onToggleExpand}
      style={{
        position: 'relative',
        width: sz,
        height: sz,
        borderRadius: '50%',
        background: 'var(--il-bg)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        color: 'var(--il-text)',
      }}
    >
      {isRing ? (
        <svg
          width={sz}
          height={sz}
          viewBox={`0 0 ${sz} ${sz}`}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none', transform: 'rotate(-90deg)' }}
        >
          <circle cx={sz / 2} cy={sz / 2} r={R} fill="none" stroke="var(--il-track)" strokeWidth={2.5} />
          <circle
            cx={sz / 2} cy={sz / 2} r={R}
            fill="none" stroke={view.accent} strokeWidth={2.5} strokeLinecap="round"
            strokeDasharray={circ.toFixed(2)} strokeDashoffset={off}
            className="nc-progress-stroke"
          />
        </svg>
      ) : (
        <CircleOutline
          size={sz}
          variant={view.timerStyle}
          progress={view.frac}
          accent={view.accent}
          accentBright={view.accentBright}
        />
      )}
      <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.14em', color: view.accent, fontWeight: 500 }}>
        {view.statusLabel}
      </span>
      <span style={{ fontFamily: MONO, fontSize: 26, fontWeight: 500, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em' }}>
        {view.timeStr}
      </span>
      {view.dots.length > 0 && <SessionDots dots={view.dots} />}
    </div>
  )
}

// ── FloatingCard — floating island layouts L1–L4 ─────────────────────────────
function FloatingCard({
  view,
  onToggleExpand,
  renderPill,
  renderElement,
}: {
  view: IslandView
  onToggleExpand: () => void
  renderPill: (keys: IslandElement[]) => React.ReactNode
  renderElement: (key: IslandElement) => React.ReactNode
}) {
  const layout = view.floatingLayout
  const isRing = view.timerStyle === 'below'
  const { left, below, right } = view.clusters

  if (layout === 'L4') return <CircleCard view={view} onToggleExpand={onToggleExpand} />

  if (layout === 'L3') {
    // Companion: pet | focus+timer stacked | dots.
    // Wrap with CardOutline when !isRing.
    const rx3 = 24
    return (
      <L3Card
        view={view}
        onToggleExpand={onToggleExpand}
        isRing={isRing}
        rx={rx3}
      />
    )
  }

  // L1 and L2: cluster-grid pill layout with optional CardOutline or Ring
  const hasContent = (key: IslandElement) => (key === 'dots' ? view.dots.length > 0 : true)
  const leftKeys = left.filter(hasContent)
  const belowKeys = below.filter(hasContent)
  const rightKeys = right.filter(hasContent)
  const allKeys = [...leftKeys, ...belowKeys, ...rightKeys]

  // L2 adds the task name as a second row
  const showTask = layout === 'L2'

  const cardPad = { paddingTop: 12, paddingBottom: 12, paddingLeft: 16, paddingRight: 16 }
  const cardH = showTask ? undefined : 44

  if (isRing) {
    // Ring on the left, then content
    const rSz = 28, rR = 10
    const rCirc = 2 * Math.PI * rR
    const rOff = (rCirc * (1 - Math.min(1, view.frac))).toFixed(2)
    return (
      <div
        data-island="1"
        data-hover-target="1"
        onClick={onToggleExpand}
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          background: 'var(--il-bg)',
          color: 'var(--il-text)',
          borderRadius: 999,
          ...cardPad,
          minHeight: cardH,
          cursor: 'pointer',
          boxSizing: 'border-box',
        }}
      >
        <svg width={rSz} height={rSz} viewBox={`0 0 ${rSz} ${rSz}`} style={{ flex: '0 0 auto', transform: 'rotate(-90deg)' }}>
          <circle cx={rSz/2} cy={rSz/2} r={rR} fill="none" stroke="var(--il-track)" strokeWidth={2.5} />
          <circle cx={rSz/2} cy={rSz/2} r={rR} fill="none" stroke={view.accent} strokeWidth={2.5} strokeLinecap="round"
            strokeDasharray={rCirc.toFixed(2)} strokeDashoffset={rOff} className="nc-progress-stroke" />
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 13 }}>
            {allKeys.map(renderElement)}
          </div>
          {showTask && (
            <span style={{ fontFamily: MONO, fontSize: 11.5, color: view.taskColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
              {view.displayTask}
            </span>
          )}
        </div>
      </div>
    )
  }

  // !isRing: CardOutline wrapping the content row
  // We need to know the card dimensions for the outline. Use a ref-measured approach;
  // start with a generous width estimate and let the outline measure itself.
  return (
    <OutlinedCard
      view={view}
      showTask={showTask}
      allKeys={allKeys}
      renderElement={renderElement}
      cardPad={cardPad}
      cardH={cardH}
      renderPill={renderPill}
      onToggleExpand={onToggleExpand}
    />
  )
}

function OutlinedCard({
  view,
  showTask,
  allKeys,
  renderElement,
  cardPad,
  cardH,
  onToggleExpand,
}: {
  view: IslandView
  showTask: boolean
  allKeys: IslandElement[]
  renderElement: (key: IslandElement) => React.ReactNode
  cardPad: CSSProperties
  cardH: number | undefined
  renderPill: (keys: IslandElement[]) => React.ReactNode
  onToggleExpand: () => void
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState({ w: 0, h: 0 })
  useLayoutEffect(() => {
    const el = cardRef.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    const w = Math.round(width), h = Math.round(height)
    setDims(prev => (prev.w === w && prev.h === h) ? prev : { w, h })
  })
  const rx = 999 // pill shape
  return (
    <div
      ref={cardRef}
      data-island="1"
      data-hover-target="1"
      onClick={onToggleExpand}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: showTask ? 3 : 12,
        background: 'var(--il-bg)',
        color: 'var(--il-text)',
        borderRadius: rx,
        ...cardPad,
        minHeight: cardH,
        cursor: 'pointer',
        boxSizing: 'border-box',
        flexDirection: showTask ? 'column' : 'row',
      }}
    >
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
        {allKeys.map(renderElement)}
      </div>
      {showTask && (
        <span style={{ fontFamily: MONO, fontSize: 11.5, color: view.taskColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
          {view.displayTask}
        </span>
      )}
      {dims.w > 0 && (
        <CardOutline
          width={dims.w}
          height={dims.h}
          rxTop={rx}
          rxBottom={rx}
          variant={view.timerStyle}
          progress={view.frac}
          accent={view.accent}
          accentBright={view.accentBright}
        />
      )}
    </div>
  )
}

function Peek({ view, notch, hasNotch, notchHeight, notchWidth, onToggleExpand, onPlayPause, onSkip }: IslandProps) {
  const rm = useReducedMotion()
  // Snapped → flat top flush with the screen edge + inverse-rounded ears (notch
  // shape); floating → fully rounded card. On a real-notch display, widen and
  // clear the physical notch height/width — same fix as ExpandedBody — so the
  // status/dots row doesn't render under the opaque camera housing.
  const wrapNotch = notch && hasNotch
  const topPad = notch ? (wrapNotch ? Math.max(30, notchHeight + 16) : 22) : 16
  const width = wrapNotch ? Math.max(340, notchWidth + 170) : 272
  return (
    <div
      data-hover-target="1"
      style={{
        width,
        boxSizing: 'border-box',
        background: 'var(--il-bg)',
        color: 'var(--il-text)',
        borderRadius: notch ? '0 0 22px 22px' : 22,
        padding: `${topPad}px 20px 17px`,
        boxShadow: 'none',
        fontFamily: SANS,
        position: 'relative',
        cursor: 'pointer',
      }}
      onClick={onToggleExpand}
    >
      {notch && <NotchEars />}
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
  const { view, notch, hasNotch, notchHeight, notchWidth, messagesOn, onToggleExpand, onPlayPause, onReset, onSkip, bottomRadius } =
    props
  const br = bottomRadius ?? 26
  // The task list's active task (for the completed/planned session hint below) —
  // distinct from view.displayTask, which is the free-text timer label and isn't
  // always backed by a task-list entry.
  const activeTask = props.tasks?.tasks.find((t) => t.id === props.tasks?.activeTaskId) ?? null
  // Snapped → flat top flush with the screen edge + inverse-rounded ears (notch
  // shape); floating → fully rounded card.
  const wrapNotch = notch && hasNotch
  // Top padding must clear the real notch height (not the flat 26px docked
  // default) plus a real buffer, or the status/dots row renders partly under
  // the physical camera housing — the notch is opaque hardware, not a CSS layer,
  // so anything drawn inside its bounds is simply gone regardless of DOM order.
  const topPad = notch ? (wrapNotch ? Math.max(30, notchHeight + 16) : 26) : 22
  // Widen using the real measured notch width (falling back to a sane default
  // if metrics haven't arrived yet) so the status label / session dots flanking
  // it keep clear of its horizontal footprint too, not just its height.
  const cardWidth = wrapNotch ? Math.max(340, notchWidth + 160) : 320
  return (
    <div
      data-hover-target="1"
      style={{
        width: cardWidth,
        boxSizing: 'border-box',
        background: 'var(--il-bg)',
        color: 'var(--il-text)',
        borderRadius: `${notch ? '0 0' : '26px 26px'} ${br}px ${br}px`,
        padding: `${topPad}px 24px 20px`,
        boxShadow: 'none',
        fontFamily: SANS,
        position: 'relative',
        cursor: 'pointer',
      }}
      onClick={onToggleExpand}
    >
      {notch && <NotchEars />}
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

      {/* Task text — clicking opens the task list (non-drag hotspot per MO-6).
          Hover underlines + brightens it to signal it's clickable. */}
      <div
        className="il-task-open"
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
          display: 'inline-block',
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
        {activeTask && (
          <span className="il-task-progress-hint">
            {' '}
            &middot; {activeTask.completedPomodoros}/{activeTask.estimatePomodoros} sessions
          </span>
        )}
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
