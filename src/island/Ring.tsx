import type { ReactNode } from 'react'

interface RingProps {
  size: number
  radius: number
  strokeWidth: number
  trackColor: string
  accent: string
  frac: number
  running: boolean
  children?: ReactNode
}

/** Circular progress ring with the breathing animation while running (Island.dc.html). */
export function Ring({ size, radius, strokeWidth, trackColor, accent, frac, running, children }: RingProps) {
  const circ = 2 * Math.PI * radius
  const offset = circ * (1 - frac)
  const c = size / 2
  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'grid', placeItems: 'center', flex: '0 0 auto' }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{
          transform: 'rotate(-90deg)',
          transformOrigin: 'center',
          animation: running ? 'islandBreathe 3.4s ease-in-out infinite' : 'none',
        }}
      >
        <circle cx={c} cy={c} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
        <circle
          cx={c}
          cy={c}
          r={radius}
          fill="none"
          stroke={accent}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset .3s linear' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>{children}</div>
    </div>
  )
}
