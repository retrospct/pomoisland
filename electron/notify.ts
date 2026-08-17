// Native completion notifications (ADR-0004 update, 2026-07-01). Silent — the app
// already plays its own synthesized completion alarm (src/shared/sound.ts) — and
// clicking one reveals the island.

import { Notification } from 'electron'
import type { CompleteEvent } from './timer'
import type { Timer } from './timer'
import { getPrefs } from './store'
import { activeTaskAtEstimate } from './taskStore'
import { revealIsland } from './windows'

/**
 * `atEstimate` branches the break-over body only. The title stays accurate
 * either way; it is the body that would otherwise promise a return to focus that
 * then doesn't happen, since the advance 2600 ms later lands at the stop rather
 * than starting the next session.
 */
function copyFor(e: CompleteEvent, atEstimate: boolean): { title: string; body: string } {
  if (e.finishedMode === 'focus') {
    return {
      title: 'Focus complete',
      body: e.nextIsLongBreak ? 'Time for a long break' : 'Time for a break',
    }
  }
  return {
    title: 'Break over',
    body: atEstimate
      ? "You've hit your estimate. Pick up where you left off, or finish the task."
      : 'Back to focus',
  }
}

export function initNotifications(timer: Timer): void {
  timer.onComplete((e) => {
    if (!getPrefs().notify) return
    // Read through the same getter the timer's boundary check uses, so the copy
    // and the behaviour cannot drift.
    const { title, body } = copyFor(e, e.finishedMode === 'break' && activeTaskAtEstimate())
    const notification = new Notification({ title, body, silent: true })
    notification.on('click', () => revealIsland())
    notification.show()
  })
}
