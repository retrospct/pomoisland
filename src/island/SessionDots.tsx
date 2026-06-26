import type { DotStyle } from './derive'

export function SessionDots({ dots, gap = 5 }: { dots: DotStyle[]; gap?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap, flex: '0 0 auto' }}>
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
