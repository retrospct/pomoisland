// Launch-at-login (ADR-0004 update, 2026-07-01). The pref is the source of
// truth: reconciled against the OS on launch and whenever it actually changes,
// so the OS login-item state can't drift from what Settings shows.

import { app } from 'electron'
import { getPrefs, onPrefsChange } from './store'

let lastApplied: boolean | null = null

function applyLaunchLogin(openAtLogin: boolean): void {
  if (lastApplied === openAtLogin) return
  lastApplied = openAtLogin
  // macOS refuses to register an unsigned/unpackaged binary as a login item
  // ("Operation not permitted") — that's expected under `npm run dev`, not a
  // bug, so skip the guaranteed-to-fail call there. Works in the packaged app.
  if (!app.isPackaged) return
  app.setLoginItemSettings({ openAtLogin, openAsHidden: true })
}

export function initLaunchLogin(): void {
  applyLaunchLogin(getPrefs().launchLogin)
  // onPrefsChange fires on every pref write, not just launchLogin — applyLaunchLogin's
  // own dedupe (above) is what keeps this from re-hitting the OS on unrelated changes.
  onPrefsChange((p) => applyLaunchLogin(p.launchLogin))
}
