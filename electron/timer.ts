// Main-process timer state machine. Ported from the prototype's logic in
// design-reference/project/Dynamic Island Pomodoro.dc.html, but block lengths,
// the long-break cadence, and auto-start come from persisted prefs (ADR-0002).

import type { Prefs, TimerAction, TimerState } from '../src/shared/types'

const TICK_MS = 250
const COMPLETE_HOLD_MS = 2600 // time for the completion flourish before advancing

type Getter = () => Prefs
type Listener = (s: TimerState) => void
type FocusCompleteHook = () => void
type TickHook = () => void

export class Timer {
  private state: TimerState
  private readonly getPrefs: Getter
  private readonly listeners = new Set<Listener>()
  private readonly focusCompleteHooks = new Set<FocusCompleteHook>()
  private readonly tickHooks = new Set<TickHook>()
  private interval: ReturnType<typeof setInterval> | null = null
  private completeTimer: ReturnType<typeof setTimeout> | null = null

  constructor(getPrefs: Getter) {
    this.getPrefs = getPrefs
    const p = getPrefs()
    const total = p.cFocus * 60
    this.state = {
      status: 'idle',
      mode: 'focus',
      total,
      remaining: total,
      sessionIndex: 0,
      sessionTotal: p.cSessions,
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

  /** Register a hook fired when a focus block completes (breaks don't count). */
  onFocusComplete(cb: FocusCompleteHook): () => void {
    this.focusCompleteHooks.add(cb)
    return () => this.focusCompleteHooks.delete(cb)
  }

  /**
   * Register a hook fired once per second while a focus block is running.
   * The main-process timer emits this when `remaining` crosses a whole-second
   * boundary, giving the renderer a precise, renderer-throttling-immune cadence.
   */
  onTick(cb: TickHook): () => void {
    this.tickHooks.add(cb)
    return () => this.tickHooks.delete(cb)
  }

  /** Test-only: advance one TICK_MS step synchronously without the real interval. */
  tickOnce(): void {
    this.tick()
  }

  private set(patch: Partial<TimerState>): void {
    this.state = { ...this.state, ...patch }
    const snapshot = this.getState()
    for (const l of this.listeners) l(snapshot)
  }

  private focusSeconds(): number {
    return this.getPrefs().cFocus * 60
  }

  /** Re-sync the dot count and (only when idle) the current block length to prefs. */
  syncPrefs(): void {
    const p = this.getPrefs()
    const patch: Partial<TimerState> = { sessionTotal: p.cSessions }
    if (this.state.status === 'idle') {
      const total =
        this.state.mode === 'focus'
          ? p.cFocus * 60
          : (this.state.isLongBreak ? p.cLong : p.cShort) * 60
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
    const prev = this.state.remaining
    const rem = prev - TICK_MS / 1000
    if (rem <= 0) {
      this.complete()
      return
    }
    // Emit once per second when `remaining` lands on a whole-second value
    // (i.e. X.25 → X.0).  Using Math.ceil matches the countdown display: both
    // update at the same moment.  0.25 s steps from an integer start are exact
    // in IEEE 754 (0.25 = 1/4), so this comparison is reliable.
    if (this.state.mode === 'focus' && Math.ceil(rem) < Math.ceil(prev)) {
      for (const hook of this.tickHooks) hook()
    }
    this.set({ remaining: rem })
  }

  private complete(): void {
    if (this.completeTimer) clearTimeout(this.completeTimer)
    const wasFocus = this.state.mode === 'focus'
    this.set({ remaining: 0, status: 'complete' })
    if (wasFocus) {
      for (const hook of this.focusCompleteHooks) hook()
    }
    this.completeTimer = setTimeout(() => this.advance(), COMPLETE_HOLD_MS)
  }

  private advance(): void {
    if (this.completeTimer) clearTimeout(this.completeTimer)
    this.completeTimer = null
    const p = this.getPrefs()
    if (this.state.mode === 'focus') {
      const idx = this.state.sessionIndex + 1
      const isLong = idx % p.cSessions === 0
      const total = (isLong ? p.cLong : p.cShort) * 60
      this.set({
        mode: 'break',
        isLongBreak: isLong,
        total,
        remaining: total,
        status: p.autoStart ? 'running' : 'idle',
        sessionIndex: idx,
        sessionTotal: p.cSessions,
      })
    } else {
      const total = this.focusSeconds()
      this.set({
        mode: 'focus',
        isLongBreak: false,
        total,
        remaining: total,
        status: p.autoStart ? 'running' : 'idle',
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
      const total = p.cShort * 60
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
