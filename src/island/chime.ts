// Lightweight synthesized completion chime via Web Audio. Real bundled alarm
// sound files (chime/marimba/bell/…) are a follow-up (ADR-0004).

let ctx: AudioContext | null = null

export function playChime(volume: number): void {
  if (volume <= 0) return
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    const now = ctx.currentTime
    const gain = ctx.createGain()
    const peak = Math.min(1, volume / 100) * 0.18
    gain.connect(ctx.destination)
    // Two soft notes, a rising fifth.
    const notes = [
      { freq: 660, at: 0 },
      { freq: 990, at: 0.16 },
    ]
    for (const n of notes) {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = n.freq
      const t0 = now + n.at
      g.gain.setValueAtTime(0, t0)
      g.gain.linearRampToValueAtTime(peak, t0 + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.9)
      osc.connect(g)
      g.connect(gain)
      osc.start(t0)
      osc.stop(t0 + 1)
    }
  } catch {
    // Audio is best-effort; ignore failures (e.g. no user gesture yet).
  }
}
