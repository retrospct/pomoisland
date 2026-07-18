// Session progress dots. On hover, morphs into the completed-today count (MO-7).
// Milestone rings appear at 10 and 20 completions.
//
// completedToday/dailyGoal are only ever passed by the expanded card — it's the
// only view where a hover can land reliably long enough to reveal the tooltip.

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
  const dotRow = (
    <div style={{ display: 'flex', alignItems: 'center', gap }}>
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

  // Peek / collapsed views don't pass completedToday — no hover reveal there, so
  // render the bare dot row (no stacked layers, no hover class).
  if (completedToday === undefined) {
    return <div style={{ display: 'flex', alignItems: 'center', flex: '0 0 auto' }}>{dotRow}</div>
  }

  const isMilestone = completedToday === 10 || completedToday === 20
  const label = dailyGoal !== undefined ? `${completedToday}/${dailyGoal} goal` : String(completedToday)

  // Both layers occupy the same grid cell, so the container is always sized to
  // the wider child (the goal label) and never resizes on hover — which is what
  // kills the enter/leave flicker loop (MO-50). A pure-CSS :hover opacity swap
  // (island.css) reveals the goal count; no React hover state.
  return (
    <div className="il-session-dots" style={{ display: 'grid', justifyItems: 'end', alignItems: 'center', flex: '0 0 auto' }}>
      <div className="il-dots-layer" style={{ gridArea: '1 / 1' }}>
        {dotRow}
      </div>
      <div
        className="il-goal-layer"
        style={{
          gridArea: '1 / 1',
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 20,
          minHeight: 16,
        }}
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
        return <circle key={i} cx={cx} cy={cy} r={pip} fill="var(--il-muted)" />
      })}
    </svg>
  )
}
