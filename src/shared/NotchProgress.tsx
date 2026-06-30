// Notch-native progress treatments (A–H), ported verbatim from the design
// handoff NotchConcept.dc.html. ONE component, shared by the island collapsed
// view and the Settings live previews so the swatch the user picks matches
// exactly what renders on the notch (mirrors the ripple.ts → CompletionFx /
// RipplePreview pattern).
//
// Geometry is the handoff's 260×72 notch viewport: the notch fill spans x55–205
// and every outline animation traces the path below/around it — never over the
// opaque camera housing. Variants `underlight` and `comet` don't encode progress
// (they're "running" cues) and pair with the time readout.

import type { CSSProperties } from 'react'
import { useLayoutEffect, useRef, useState } from 'react'
import { renderProgressTrace } from './progressTrace'
import type { TimerStyle } from './types'

const MONO = "'IBM Plex Mono', monospace"

/** Full notch outline (open path — no closing Z), left edge down/around to right edge. */
const OUTLINE = 'M55 0 L55 17 Q55 30 68 30 L192 30 Q205 30 205 17 L205 0'

export interface NotchStyleMeta {
  key: TimerStyle
  /** Short picker label. */
  label: string
  /** One-line description for the picker. */
  desc: string
}

/** Picker metadata for all eight variants, in handoff (A→H) order. */
export const TIMER_STYLE_META: NotchStyleMeta[] = [
  { key: 'below', label: 'Below', desc: 'Pill below the notch' },
  { key: 'outline', label: 'Outline', desc: 'Fills the notch outline' },
  { key: 'glow', label: 'Glow', desc: 'Outline with a soft glow' },
  { key: 'front', label: 'Leading dot', desc: 'Pulsing edge at the front' },
  { key: 'underlight', label: 'Underlight', desc: 'Light from beneath' },
  { key: 'converge', label: 'Converge', desc: 'Fills inward to center' },
  { key: 'split', label: 'Split', desc: 'Grows from center out' },
  { key: 'comet', label: 'Comet', desc: 'Orbiting sparks' },
]

export interface NotchDot {
  size: number
  background: string
  boxShadow: string
}

export interface NotchProgressProps {
  variant: TimerStyle
  /** Elapsed fraction 0→1. Ignored by `underlight` / `comet`. */
  progress: number
  accent: string
  accentBright: string
  time?: string
  label?: string
  /** Session dots — rendered inside the `below` pill or under the outline readout. */
  dots?: NotchDot[]
  /** Color of the time readout (theme-aware in the island; light on the dark preview). */
  textColor?: string
  /**
   * Self-contained preview mode: draws the handoff's dark "mini-screen" frame so
   * the black notch reads in Settings. The island leaves this off (transparent,
   * so the trace hugs the real hardware notch).
   */
  frame?: boolean
  /**
   * When false (default for the island), skip the handoff's opaque notch fill and
   * camera lens so real hardware shows through. Settings previews pass `frame`
   * which implies simulateNotch.
   */
  simulateNotch?: boolean
  /**
   * When false, suppress the bundled label/time/dots readout so only the SVG
   * progress trace (and optional mock notch) renders. The island passes `false`
   * so placed clusters handle the readout instead. Defaults to true so Settings
   * previews keep showing the full readout.
   */
  readout?: boolean
  /** Uniform scale for compact previews; keeps layout box correct. */
  scale?: number
}

let cachedLen = 0

export function NotchProgress({
  variant,
  progress,
  accent,
  accentBright,
  time = '24:00',
  label = 'FOCUS',
  dots,
  textColor = '#F2F1EC',
  frame = false,
  simulateNotch = frame,
  readout = true,
  scale = 1,
}: NotchProgressProps) {
  const pathRef = useRef<SVGPathElement>(null)
  const [len, setLen] = useState(cachedLen)
  const [front, setFront] = useState({ x: 130, y: 30 })

  const isBelow = variant === 'below'
  const isFront = variant === 'front'
  const isUnderlight = variant === 'underlight'
  const isSplit = variant === 'split'
  const drawFullOutline = variant === 'outline' || variant === 'glow' || isFront
  // showReadout: variant-level condition AND the readout prop must both be true.
  const showReadout = readout && !isBelow

  const p = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0))

  // Measure the rendered outline path once mounted (and when the driving inputs
  // change) so the dash math + leading-dot point use exact pixel lengths. The
  // viewBox is 1:1 with px, so getPointAtLength returns coords in notch space.
  useLayoutEffect(() => {
    const path = pathRef.current
    if (!path || !drawFullOutline) return
    const l = path.getTotalLength()
    cachedLen = l
    setLen(l)
    if (isFront) {
      const pt = path.getPointAtLength(l * p)
      setFront({ x: +pt.x.toFixed(2), y: +pt.y.toFixed(2) })
    }
  }, [drawFullOutline, isFront, p, variant])

  const ringR = 9.5
  const ringCirc = 2 * Math.PI * ringR
  const ringOffset = (ringCirc * (1 - p)).toFixed(2)

  const leftPath = isSplit ? 'M130 30 L68 30 Q55 30 55 17 L55 0' : 'M55 0 L55 17 Q55 30 68 30 L130 30'
  const rightPath = isSplit
    ? 'M130 30 L192 30 Q205 30 205 17 L205 0'
    : 'M205 0 L205 17 Q205 30 192 30 L130 30'

  const baseW = 260
  // When readout is suppressed, height only needs to cover the 72px SVG trace zone.
  const baseH = !readout ? 72 : frame ? 128 : isBelow ? 84 : dots && dots.length ? 100 : 86

  const inner = (
    <>
      <svg
        width={260}
        height={72}
        viewBox="0 0 260 72"
        style={{ position: 'absolute', top: 0, left: 0, zIndex: 2, overflow: 'visible' }}
      >
        {/* Underlight ellipses render BELOW the notch fill so they peek out from
            beneath it (handoff z-order note). These are passed to renderProgressTrace
            when variant === 'underlight'. */}

        {simulateNotch && (
          <>
            <path d="M55 0 L55 17 Q55 30 68 30 L192 30 Q205 30 205 17 L205 0 Z" fill="#050506" />
            <circle cx={130} cy={13} r={3.4} fill="#0A0A0B" stroke="#26292E" strokeWidth={1.3} />
          </>
        )}

        {renderProgressTrace({
          variant,
          p,
          accent,
          accentBright,
          fullPath: OUTLINE,
          leftPath,
          rightPath,
          meetPoint: { x: 130, y: 30 },
          len,
          front,
          pathRef,
          underlightEllipses: isUnderlight
            ? [
                { cx: 130, cy: 35, rx: 84, ry: 18, fill: accent, delay: undefined },
                { cx: 130, cy: 32, rx: 56, ry: 11, fill: accentBright, opacity: 0.55, delay: '0.25s' },
              ]
            : undefined,
          underlightArcPath: isUnderlight ? (
            <>
              <path
                d="M55 17 Q55 30 68 30 L192 30 Q205 30 205 17"
                fill="none"
                stroke={accent}
                strokeWidth={4.5}
                strokeLinecap="round"
                opacity={0.9}
                data-nc-anim
                style={{ filter: 'blur(3px)', animation: 'ncGlow 2.6s ease-in-out infinite' }}
              />
              <path
                d="M59 26 Q61 30 68 30 L192 30 Q199 30 201 26"
                fill="none"
                stroke={accentBright}
                strokeWidth={1.6}
                strokeLinecap="round"
                opacity={0.92}
              />
            </>
          ) : undefined,
        })}
      </svg>

      {readout && isBelow && (
        <div
          style={{
            position: 'absolute',
            top: 33,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            background: '#17191D',
            borderRadius: 999,
            padding: '6px 14px 6px 7px',
            boxShadow: '0 12px 28px rgba(0,0,0,.45)',
          }}
        >
          <svg
            width={26}
            height={26}
            viewBox="0 0 26 26"
            style={{ transform: 'rotate(-90deg)', flex: '0 0 auto' }}
          >
            <circle cx={13} cy={13} r={ringR} fill="none" stroke="rgba(242,241,236,0.16)" strokeWidth={2.6} />
            <circle
              cx={13}
              cy={13}
              r={ringR}
              fill="none"
              stroke={accent}
              strokeWidth={2.6}
              strokeLinecap="round"
              strokeDasharray={ringCirc.toFixed(2)}
              strokeDashoffset={ringOffset}
              className="nc-progress-stroke"
            />
          </svg>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, lineHeight: 1 }}>
            <svg width={13} height={13} viewBox="0 0 13 13" style={{ flex: '0 0 auto' }}>
              <circle cx={6.5} cy={6.5} r={5.3} fill="none" stroke={accent} strokeWidth={1.4} />
              <circle cx={6.5} cy={6.5} r={1.7} fill={accent} />
            </svg>
            <span
              style={{
                fontFamily: MONO,
                fontSize: 14,
                fontWeight: 500,
                color: '#F2F1EC',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {time}
            </span>
          </div>
          {dots && dots.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                paddingLeft: 9,
                borderLeft: '1px solid rgba(242,241,236,0.12)',
              }}
            >
              {dots.map((d, i) => (
                <Dot key={i} dot={d} />
              ))}
            </div>
          )}
        </div>
      )}

      {showReadout && (
        <div
          style={{
            position: 'absolute',
            top: 43,
            left: '50%',
            transform: 'translateX(-50%)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontFamily: MONO,
              fontSize: 8,
              letterSpacing: '0.18em',
              color: accent,
              fontWeight: 500,
              marginBottom: 3,
            }}
          >
            {label}
          </div>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 19,
              fontWeight: 500,
              color: textColor,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '0.01em',
            }}
          >
            {time}
          </div>
          {dots && dots.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 6 }}>
              {dots.map((d, i) => (
                <Dot key={i} dot={d} />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )

  const body: CSSProperties = frame
    ? {
        position: 'relative',
        width: baseW,
        height: baseH,
        background: '#1E211C',
        borderRadius: '16px 16px 9px 9px',
        overflow: 'hidden',
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.04)',
      }
    : { position: 'relative', width: baseW, height: baseH }

  // Outer wrapper reserves the scaled footprint so the picker grid lays out right.
  return (
    <div style={{ width: baseW * scale, height: baseH * scale, position: 'relative' }}>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          transform: scale !== 1 ? `scale(${scale})` : undefined,
          transformOrigin: 'top left',
        }}
      >
        <div style={body}>{inner}</div>
      </div>
    </div>
  )
}

function Dot({ dot }: { dot: NotchDot }) {
  return (
    <span
      style={{
        width: dot.size,
        height: dot.size,
        borderRadius: 999,
        background: dot.background,
        boxShadow: dot.boxShadow,
        flex: '0 0 auto',
      }}
    />
  )
}
