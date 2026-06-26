// Main-process timer state machine. Ported from the prototype's logic in
// design-reference/project/Dynamic Island Pomodoro.dc.html, but block lengths,
// the long-break cadence, and auto-start come from persisted prefs (ADR-0002).

import type { Prefs, TimerAction, TimerState } from '../src/shared/types'

const TICK_MS = 250
const COMPLETE_HOLD_MS = 2600 // time for the completion flourish before advancing

type Getter = () => Prefs
type Listener = (s: TimerState) => void

export class Timer {
  private state: TimerState
  private readonly getPrefs: Getter
  private readonly listeners = new Set<Listener>()
  private interval: ReturnType<typeof setInterval> | null = null
  private completeTimer: ReturnType<typeof setTimeout> | null = null

  constructor(getPrefs: Getter) {
    this.getPrefs = getPrefs
    const p = getPrefs()
    const total = p.focusMin * 60
    this.state = {
      status: 'idle',
      mode: 'focus',
      total,
      remaining: total,
      sessionIndex: 0,
      sessionTotal: p.longEvery,
      isLongBreak: false,
      task: '',
    }
  }

  start(): void {
    if (this.interval) return
    this.interval = setInterval(() => this.tick(), TICK_MS)
  }

  stop(): void {
    if (this.interval) clearInterval(this.interval)
    if (this.completeTimer) clearTimeout(this.completeTimer)
    this.interval = null
    this.completeTimer = null
  }

  getState(): TimerState {
    return { ...this.state }
  }

  subscribe(cb: Listener): () => void {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  private set(patch: Partial<TimerState>): void {
    this.state = { ...this.state, ...patch }
    const snapshot = this.getState()
    for (const l of this.listeners) l(snapshot)
  }

  private focusSeconds(): number {
    return this.getPrefs().focusMin * 60
  }

  /** Re-sync the dot count and (only when idle) the current block length to prefs. */
  syncPrefs(): void {
    const p = this.getPrefs()
    const patch: Partial<TimerState> = { sessionTotal: p.longEvery }
    if (this.state.status === 'idle') {
      const total =
        this.state.mode === 'focus'
          ? p.focusMin * 60
          : (this.state.isLongBreak ? p.longMin : p.shortMin) * 60
      patch.total = total
      patch.remaining = total
    }
    this.set(patch)
  }

  action(action: TimerAction): void {
    switch (action.type) {
      case 'playPause':
        return this.playPause()
      case 'reset':
        return this.reset()
      case 'skip':
        return this.skip()
      case 'switchMode':
        return this.switchMode()
      case 'quit':
        return this.quit()
      case 'setTask':
        return this.set({ task: action.task })
      default: {
        const _exhaustive: never = action
        return _exhaustive
      }
    }
  }

  private tick(): void {
    if (this.state.status !== 'running') return
    const rem = this.state.remaining - TICK_MS / 1000
    if (rem <= 0) this.complete()
    else this.set({ remaining: rem })
  }

  private complete(): void {
    if (this.completeTimer) clearTimeout(this.completeTimer)
    this.set({ remaining: 0, status: 'complete' })
    this.completeTimer = setTimeout(() => this.advance(), COMPLETE_HOLD_MS)
  }

  private advance(): void {
    if (this.completeTimer) clearTimeout(this.completeTimer)
    this.completeTimer = null
    const p = this.getPrefs()
    if (this.state.mode === 'focus') {
      const idx = this.state.sessionIndex + 1
      const isLong = idx % p.longEvery === 0
      const total = (isLong ? p.longMin : p.shortMin) * 60
      this.set({
        mode: 'break',
        isLongBreak: isLong,
        total,
        remaining: total,
        status: p.autoBreak ? 'running' : 'idle',
        sessionIndex: idx,
        sessionTotal: p.longEvery,
      })
    } else {
      const total = this.focusSeconds()
      this.set({
        mode: 'focus',
        isLongBreak: false,
        total,
        remaining: total,
        status: p.autoFocus ? 'running' : 'idle',
      })
    }
  }

  private playPause(): void {
    const { status } = this.state
    if (status === 'running') this.set({ status: 'paused' })
    else if (status === 'paused' || status === 'idle') this.set({ status: 'running' })
    else if (status === 'complete') this.advance()
  }

  private reset(): void {
    if (this.completeTimer) clearTimeout(this.completeTimer)
    this.completeTimer = null
    const total = this.focusSeconds()
    this.set({
      status: 'idle',
      mode: 'focus',
      isLongBreak: false,
      total,
      remaining: total,
      sessionIndex: 0,
    })
  }

  /** Skip to the end of the current block now (plays the completion flourish, then advances). */
  private skip(): void {
    this.complete()
  }

  private switchMode(): void {
    if (this.completeTimer) clearTimeout(this.completeTimer)
    this.completeTimer = null
    const p = this.getPrefs()
    if (this.state.mode === 'focus') {
      const total = p.shortMin * 60
      this.set({ mode: 'break', isLongBreak: false, total, remaining: total, status: 'idle' })
    } else {
      const total = this.focusSeconds()
      this.set({ mode: 'focus', isLongBreak: false, total, remaining: total, status: 'idle' })
    }
  }

  private quit(): void {
    if (this.completeTimer) clearTimeout(this.completeTimer)
    this.completeTimer = null
    const total = this.focusSeconds()
    this.set({
      status: 'idle',
      mode: 'focus',
      isLongBreak: false,
      total,
      remaining: total,
      sessionIndex: 0,
    })
  }
}
