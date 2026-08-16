// Bring-to-front on completion (Prefs.raiseOnComplete). When a block RUNS OUT —
// focus or break — show the island and lift it in the z-order. Never steals
// keyboard focus: the island is a non-activating NSPanel (see windows.ts
// createIslandWindow), and raiseIsland() uses showInactive(), not focus().
//
// A manual Next/skip is not "time ends": the user is already driving the app,
// and the global Next shortcut is designed for background use, so it must not
// un-hide an island the user deliberately hid. Timer tags the completion event
// with `reason` for exactly this distinction.

import { getPrefs } from './store'
import type { Timer } from './timer'
import { raiseIsland } from './windows'

export function initRaiseOnComplete(timer: Timer): void {
  timer.onComplete((e) => {
    if (e.reason !== 'elapsed') return
    if (!getPrefs().raiseOnComplete) return
    raiseIsland()
  })
}
