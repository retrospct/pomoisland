// Pause-when-idle (ADR-0004 update, 2026-07-01). Polls system idle time and
// auto-pauses a running focus block after IDLE_THRESHOLD_SEC of no input, then
// auto-resumes on the next input — seamless, no manual un-pause needed. Breaks
// are never touched; idling during a break is the point of the break.

import { powerMonitor } from 'electron'
import { getPrefs } from './store'
import type { Timer } from './timer'

const IDLE_THRESHOLD_SEC = 120
const POLL_MS = 5000

let interval: ReturnType<typeof setInterval> | null = null
/** True while the current pause was caused by this watcher, not the user. */
let autoPaused = false

export function startIdleWatcher(timer: Timer): void {
  if (interval) return
  interval = setInterval(() => {
    if (!getPrefs().pauseIdle) {
      autoPaused = false
      return
    }
    const idleSec = powerMonitor.getSystemIdleTime()

    if (!autoPaused) {
      const state = timer.getState()
      if (state.mode === 'focus' && state.status === 'running' && idleSec >= IDLE_THRESHOLD_SEC) {
        timer.action({ type: 'playPause' })
        autoPaused = true
      }
      return
    }

    if (idleSec < IDLE_THRESHOLD_SEC) {
      if (timer.getState().status === 'paused') {
        timer.action({ type: 'playPause' })
      }
      autoPaused = false
    }
  }, POLL_MS)
}

export function stopIdleWatcher(): void {
  if (interval) clearInterval(interval)
  interval = null
  autoPaused = false
}
