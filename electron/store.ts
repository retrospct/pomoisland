// Minimal JSON-file preference store (userData/prefs.json). Hand-rolled to avoid
// an ESM-only dependency in the CJS main process; see ADR-0002.

import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { Prefs, TickSound } from '../src/shared/types'

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
  tick: 'off',
  notify: true,
  // Preferences · Appearance
  accent: 'teal',
  theme: 'dark',
  timerStyle: 'circular',
  layout: 'split',
  // MO-22: default arrangement is all three elements to the right of the notch.
  islandPlacement: { ring: 'right', time: 'right', dots: 'right' },
  showDots: true,
  ripple: 'burst',
  // Window behavior (not surfaced in SettingsPanel)
  alwaysTop: true,
  magnetic: true,
  hoverRetractMs: 200,
  expandRetractMs: 800,
}

type Listener = (p: Prefs) => void
const listeners = new Set<Listener>()

let cache: Prefs | null = null

function filePath(): string {
  return join(app.getPath('userData'), 'prefs.json')
}

/**
 * `tick` used to be a boolean (ADR-0004 era). A persisted `true` maps to `'soft'`;
 * `false`/missing/anything unrecognized falls back to `'off'`. The rename also changed
 * the appId, so the store may instead be fresh — both paths land on a valid `TickSound`.
 */
function migrateTick(raw: unknown): TickSound {
  if (raw === true || raw === 'soft') return 'soft'
  if (raw === 'crisp') return 'crisp'
  return 'off'
}

function load(): Prefs {
  try {
    const raw = readFileSync(filePath(), 'utf8')
    const parsed = JSON.parse(raw) as Partial<Prefs>
    const merged = { ...DEFAULT_PREFS, ...parsed }
    merged.tick = migrateTick((parsed as { tick?: unknown }).tick)
    return merged
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
