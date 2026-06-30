// Shared per-variant SVG progress trace renderer, used by both NotchProgress
// (notch outline geometry) and CardOutline (rounded-rect geometry). Only the
// path geometry differs between the two callers; the variant logic is identical.
//
// CSS keyframes (ncGlow, ncDot, ncSheen, ncComet, ncUnder) and the
// .nc-progress-stroke class are globally defined in src/shared/notch.css,
// which is imported in both island and settings renderers.

import type { ReactNode, RefObject } from 'react'
import type { TimerStyle } from './types'

const TRACK = 'rgba(242,241,236,0.13)'

export interface ProgressGeometry {
  /** Full perimeter path `d` attribute. */
  fullPath: string
  /** Left half of the perimeter (for converge/split). Starts at the "outer" end, ends at meetPoint. */
  leftPath: string
  /** Right half of the perimeter (for converge/split). Starts at the "outer" end, ends at meetPoint. */
  rightPath: string
  /** Where the two half-paths meet — used for the converge dot and underlight centering. */
  meetPoint: { x: number; y: number }
  /** Total measured length of fullPath (getTotalLength() result). */
  len: number
  /** Current leading-dot position for the 'front' variant (getPointAtLength(len*p) result). */
  front: { x: number; y: number }
}

export interface UnderlightEllipse {
  cx: number
  cy: number
  rx: number
  ry: number
  fill: string
  opacity?: number
  delay?: string
}

export interface ProgressTraceProps extends ProgressGeometry {
  variant: TimerStyle
  p: number         // clamped progress 0–1
  accent: string
  accentBright: string
  /** Ref pointing to the MAIN progress <path> element. Needed so the parent can measure it. */
  pathRef: RefObject<SVGPathElement | null>
  /**
   * Caller-specified underlight ellipses for the 'underlight' variant. NotchProgress
   * passes 2 notch-specific ellipses; CardOutline passes 2 card-proportional ellipses.
   * If omitted, no underlight ellipses are rendered.
   */
  underlightEllipses?: UnderlightEllipse[]
  /**
   * Optional extra path element rendered as the "bright arc" under the shape for
   * the underlight variant. NotchProgress passes the notch bottom-arc; CardOutline
   * omits this (the bottom-edge glow is handled via underlightEllipses instead).
   */
  underlightArcPath?: ReactNode
}

/**
 * Renders the SVG children for the current progress variant. Returns null for
 * 'below' (the Ring element handles progress in that mode).
 */
export function renderProgressTrace(props: ProgressTraceProps): ReactNode {
  const {
    variant,
    p,
    accent,
    accentBright,
    fullPath,
    leftPath,
    rightPath,
    meetPoint,
    len,
    front,
    pathRef,
    underlightEllipses,
    underlightArcPath,
  } = props

  if (variant === 'below') return null

  const dashArray = len ? len.toFixed(2) : '1000'
  const dashOffset = len ? (len * (1 - p)).toFixed(2) : '1000'
  const twoOffset = (100 * (1 - p)).toFixed(2)
  const isConverge = variant === 'converge'
  const meetOpacity = isConverge ? p * p : 0
  const hasFront = variant === 'front' && len > 0

  if (variant === 'outline') {
    return (
      <>
        <path d={fullPath} fill="none" stroke={TRACK} strokeWidth={2.5} />
        <path
          ref={pathRef}
          d={fullPath}
          fill="none"
          stroke={accent}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeDasharray={dashArray}
          strokeDashoffset={dashOffset}
          className="nc-progress-stroke"
        />
      </>
    )
  }

  if (variant === 'glow') {
    return (
      <>
        <path d={fullPath} fill="none" stroke={TRACK} strokeWidth={2.5} />
        <path
          d={fullPath}
          fill="none"
          stroke={accentBright}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={dashArray}
          strokeDashoffset={dashOffset}
          className="nc-progress-stroke"
          data-nc-anim
          style={{ filter: 'blur(3.5px)', animation: 'ncGlow 2.1s ease-in-out infinite' }}
        />
        <path
          ref={pathRef}
          d={fullPath}
          fill="none"
          stroke={accent}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeDasharray={dashArray}
          strokeDashoffset={dashOffset}
          className="nc-progress-stroke"
        />
      </>
    )
  }

  if (variant === 'front') {
    return (
      <>
        <path d={fullPath} fill="none" stroke={TRACK} strokeWidth={2.5} />
        <path
          ref={pathRef}
          d={fullPath}
          fill="none"
          stroke={accent}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeDasharray={dashArray}
          strokeDashoffset={dashOffset}
          className="nc-progress-stroke"
        />
        {hasFront && (
          <>
            <circle
              cx={front.x}
              cy={front.y}
              r={7}
              fill={accent}
              opacity={0.4}
              data-nc-anim
              style={{
                filter: 'blur(3px)',
                transformBox: 'fill-box',
                transformOrigin: 'center',
                animation: 'ncDot 1.6s ease-in-out infinite',
              }}
            />
            <circle
              cx={front.x}
              cy={front.y}
              r={2.8}
              fill={accentBright}
              data-nc-anim
              style={{ animation: 'ncSheen 1.6s ease-in-out infinite' }}
            />
          </>
        )}
      </>
    )
  }

  if (variant === 'converge' || variant === 'split') {
    return (
      <>
        <path d={leftPath} pathLength={100} fill="none" stroke={TRACK} strokeWidth={2.5} />
        <path d={rightPath} pathLength={100} fill="none" stroke={TRACK} strokeWidth={2.5} />
        <path
          d={leftPath}
          pathLength={100}
          fill="none"
          stroke={accent}
          strokeWidth={2.8}
          strokeLinecap="round"
          strokeDasharray={100}
          strokeDashoffset={twoOffset}
          className="nc-progress-stroke"
        />
        <path
          ref={pathRef}
          d={rightPath}
          pathLength={100}
          fill="none"
          stroke={accent}
          strokeWidth={2.8}
          strokeLinecap="round"
          strokeDasharray={100}
          strokeDashoffset={twoOffset}
          className="nc-progress-stroke"
        />
        {isConverge && (
          <circle
            cx={meetPoint.x}
            cy={meetPoint.y}
            r={3.2}
            fill={accentBright}
            opacity={meetOpacity}
            style={{ filter: 'blur(0.6px)' }}
          />
        )}
      </>
    )
  }

  if (variant === 'comet') {
    return (
      <>
        <path d={fullPath} pathLength={100} fill="none" stroke="rgba(242,241,236,0.10)" strokeWidth={2.5} />
        <path
          d={fullPath}
          pathLength={100}
          fill="none"
          stroke={accent}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray="14 86"
          data-nc-anim
          style={{ filter: 'blur(3px)', animation: 'ncComet 2.4s linear infinite' }}
        />
        <path
          d={fullPath}
          pathLength={100}
          fill="none"
          stroke={accentBright}
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeDasharray="13 87"
          data-nc-anim
          style={{ animation: 'ncComet 2.4s linear infinite' }}
        />
        <path
          d={fullPath}
          pathLength={100}
          fill="none"
          stroke={accent}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray="11 89"
          data-nc-anim
          style={{ filter: 'blur(2px)', animation: 'ncComet 2.4s linear infinite', animationDelay: '-1.2s' }}
        />
        <path
          d={fullPath}
          pathLength={100}
          fill="none"
          stroke={accentBright}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeDasharray="10 90"
          data-nc-anim
          style={{ animation: 'ncComet 2.4s linear infinite', animationDelay: '-1.2s' }}
        />
      </>
    )
  }

  if (variant === 'underlight') {
    return (
      <>
        {underlightEllipses?.map((el, i) => (
          <ellipse
            key={i}
            cx={el.cx}
            cy={el.cy}
            rx={el.rx}
            ry={el.ry}
            fill={el.fill}
            opacity={el.opacity}
            data-nc-anim
            style={{
              filter: i === 0 ? 'blur(10px)' : 'blur(6px)',
              transformBox: 'fill-box',
              transformOrigin: 'center',
              animation: `ncUnder 2.6s ease-in-out infinite${el.delay ? ` ${el.delay}` : ''}`,
            }}
          />
        ))}
        {underlightArcPath}
      </>
    )
  }

  return null
}
