// Native completion notifications (ADR-0004 update, 2026-07-01). Silent — the app
// already plays its own synthesized completion alarm (src/shared/sound.ts) — and
// clicking one reveals the island.

import { Notification } from 'electron'
import type { CompleteEvent } from './timer'
import type { Timer } from './timer'
import { getPrefs } from './store'
import { revealIsland } from './windows'

function copyFor(e: CompleteEvent): { title: string; body: string } {
  if (e.finishedMode === 'focus') {
    return {
      title: 'Focus complete',
      body: e.nextIsLongBreak ? 'Time for a long break' : 'Time for a break',
    }
  }
  return { title: 'Break over', body: 'Back to focus' }
}

export function initNotifications(timer: Timer): void {
  timer.onComplete((e) => {
    if (!getPrefs().notify) return
    const { title, body } = copyFor(e)
    const notification = new Notification({ title, body, silent: true })
    notification.on('click', () => revealIsland())
    notification.show()
  })
}
