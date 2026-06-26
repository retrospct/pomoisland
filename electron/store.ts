// Minimal JSON-file preference store (userData/prefs.json). Hand-rolled to avoid
// an ESM-only dependency in the CJS main process; see ADR-0002.

import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { Prefs } from '../src/shared/types'

export const DEFAULT_PREFS: Prefs = {
  // Timer
  preset: 'classic',
  focusMin: 25,
  shortMin: 5,
  longMin: 15,
  longEvery: 4,
  dailyGoal: 8,
  autoBreak: true,
  autoFocus: false,
  // Sounds & alerts
  alarm: 'chime',
  volume: 70,
  tickOn: false,
  anim: 'ripple',
  notify: true,
  // Appearance
  theme: 'dark',
  accent: '#8FC8C0',
  timerType: 'circular',
  layout: 'split',
  showDots: true,
  showMessages: true,
  // Behavior
  launchLogin: true,
  alwaysTop: true,
  magnetic: true,
  hideShare: false,
  pauseIdle: true,
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
