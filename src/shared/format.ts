// Pure time/progress helpers shared across renderers.

/** Fraction elapsed in [0,1]. Ported from Island.dc.html renderVals. */
export function frac(total: number, remaining: number): number {
  if (total <= 0) return 0
  return Math.min(1, Math.max(0, (total - remaining) / total))
}

/** Format remaining seconds as mm:ss, ceiling like the prototype. */
export function fmtTime(remaining: number): string {
  const t = Math.ceil(Math.max(0, remaining))
  const mm = Math.floor(t / 60)
  const ss = t % 60
  return `${mm < 10 ? '0' : ''}${mm}:${ss < 10 ? '0' : ''}${ss}`
}
