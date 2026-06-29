// Session progress dots. On hover, morphs into the completed-today count (MO-7).
// Milestone rings appear at 10 and 20 completions.

import { useState } from 'react'
import type { DotStyle } from './derive'

interface SessionDotsProps {
  dots: DotStyle[]
  gap?: number
  /** Focus sessions completed today. When provided, hovering reveals the count. */
  completedToday?: number
  /** Daily goal. When provided alongside completedToday, shows "X/Y" on hover. */
  dailyGoal?: number
}

export function SessionDots({ dots, gap = 5, completedToday, dailyGoal }: SessionDotsProps) {
  const [hovered, setHovered] = useState(false)

  const handlers = {
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
  }

  if (hovered && completedToday !== undefined) {
    const isMilestone = completedToday === 10 || completedToday === 20
    const label =
      dailyGoal !== undefined ? `${completedToday}/${dailyGoal}` : String(completedToday)
    return (
      <div
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: '0 0 auto',
          minWidth: 20,
          minHeight: 16,
        }}
        {...handlers}
      >
        {isMilestone && <MilestoneRing count={completedToday} />}
        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--il-text)',
            lineHeight: 1,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {label}
        </span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap, flex: '0 0 auto' }} {...handlers}>
      {dots.map((d, i) => (
        <span
          key={i}
          style={{
            width: d.size,
            height: d.size,
            borderRadius: 999,
            background: d.background,
            boxShadow: d.boxShadow,
            flex: '0 0 auto',
            transition: 'all .3s',
          }}
        />
      ))}
    </div>
  )
}

/** Halo of small dots orbiting the number at milestone counts. */
function MilestoneRing({ count }: { count: number }) {
  const pipCount = count === 10 ? 10 : 12
  const r = 14
  const pip = 2.5
  const size = r * 2 + pip * 2 + 2

  return (
    <svg
      width={size}
      height={size}
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        overflow: 'visible',
        zIndex: 0,
      }}
    >
      {Array.from({ length: pipCount }, (_, i) => {
        const angle = (i / pipCount) * 2 * Math.PI - Math.PI / 2
        const cx = size / 2 + r * Math.cos(angle)
        const cy = size / 2 + r * Math.sin(angle)
        return <circle key={i} cx={cx} cy={cy} r={pip} fill="rgba(242,241,236,0.5)" />
      })}
    </svg>
  )
}
