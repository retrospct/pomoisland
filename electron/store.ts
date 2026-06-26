// Minimal JSON-file preference store (userData/prefs.json). Hand-rolled to avoid
// an ESM-only dependency in the CJS main process; see ADR-0002.

import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { Prefs } from '../src/shared/types'

export const DEFAULT_PREFS: Prefs = {
  // General · Timer
  preset: 'classic',
  cFocus: 25,
  cShort: 5,
  cLong: 15,
  cSessions: 4,
  dailyGoal: 8,
  // General · Behavior
  autoStart: true,
  dnd: true,
  launchLogin: false,
  messages: true,
  hideShare: false,
  pauseIdle: true,
  // Preferences · Alarm & sound
  sound: 'chime',
  volume: 70,
  tick: false,
  notify: true,
  // Preferences · Appearance
  accent: 'teal',
  theme: 'dark',
  timerStyle: 'circular',
  layout: 'split',
  showDots: true,
  ripple: 'burst',
  // Window behavior (not surfaced in SettingsPanel)
  alwaysTop: true,
  magnetic: true,
}

type Listener = (p: Prefs) => void
const listeners = new Set<Listener>()

let cache: Prefs | null = null

function filePath(): string {
  return join(app.getPath('userData'), 'prefs.json')
}

function load(): Prefs {
  try {
    const raw = readFileSync(filePath(), 'utf8')
    const parsed = JSON.parse(raw) as Partial<Prefs>
    return { ...DEFAULT_PREFS, ...parsed }
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

function persist(prefs: Prefs): void {
  try {
    const path = filePath()
    mkdirSync(dirname(path), { recursive: true })
    if (!existsSync(dirname(path))) return
    writeFileSync(path, JSON.stringify(prefs, null, 2), 'utf8')
  } catch {
    // Persistence is best-effort; keep running with the in-memory cache.
  }
}

export function getPrefs(): Prefs {
  cache ??= load()
  return { ...cache }
}

export function setPrefs(patch: Partial<Prefs>): Prefs {
  cache = { ...getPrefs(), ...patch }
  persist(cache)
  const next = { ...cache }
  for (const l of listeners) l(next)
  return next
}

export function onPrefsChange(cb: Listener): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}
