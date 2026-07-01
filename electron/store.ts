// Minimal JSON-file preference store (userData/prefs.json). Hand-rolled to avoid
// an ESM-only dependency in the CJS main process; see ADR-0002.

import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { DEFAULT_SHORTCUTS, SHORTCUT_ACTIONS } from '../src/shared/shortcuts'
import type {
  IslandPlacement,
  IslandSlot,
  Prefs,
  Shortcuts,
  TickSound,
  TimerStyle,
} from '../src/shared/types'

type Layout = 'split' | 'minimal' | 'compact'

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
  showDockIcon: true,
  shortcuts: { ...DEFAULT_SHORTCUTS },
  // Preferences · Alarm & sound
  sound: 'chime',
  volume: 70,
  tick: 'off',
  notify: true,
  // Preferences · Appearance
  accent: 'teal',
  theme: 'dark',
  // Pure black by default so the snapped island reads as the physical notch bezel,
  // matching the real Dynamic Island, regardless of the theme.
  notchBackground: 'black',
  // Notch-outline bar — the headline notch-native treatment from the design handoff.
  timerStyle: 'outline',
  // Default: Focus label below the notch; timer flanks left, session dots flank right; ring hidden.
  islandPlacement: { ring: 'off', status: 'below', time: 'left', dots: 'right' },
  ripple: 'burst',
  floatingLayout: 'L1',
  // Notch band height: match the menu bar by default.
  notchHeightMode: 'menubar',
  notchHeightCustom: 38,
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

/**
 * `timerStyle` used to be `circular | outline | bar`; it is now the notch-native
 * A–H set (see TimerStyle). Map the two legacy values that have no 1:1 successor:
 * the ring-in-a-pill `circular` → the pill `below` the notch; the `bar` →
 * the notch-`outline` bar. `outline` keeps its name. Unknown/missing → `outline`.
 */
function migrateTimerStyle(raw: unknown): TimerStyle {
  switch (raw) {
    case 'below':
    case 'outline':
    case 'glow':
    case 'front':
    case 'underlight':
    case 'converge':
    case 'split':
    case 'comet':
      return raw
    case 'circular':
      return 'below'
    case 'bar':
      return 'outline'
    default:
      return 'outline'
  }
}

/**
 * Migrate from the old 3-element placement (ring/time/dots, no `status`, no `off`)
 * plus separate `layout` and `showDots` fields to the new 4-element placement with
 * an `off` slot. Called when the persisted prefs predate this schema.
 */
function migrateIslandPlacement(raw: unknown, layout: unknown, showDots: unknown): IslandPlacement {
  const defaults = DEFAULT_PREFS.islandPlacement
  const p = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>

  const slotOrOff = (v: unknown, fallback: IslandSlot): IslandSlot => {
    if (v === 'left' || v === 'below' || v === 'right' || v === 'off') return v
    return fallback
  }

  // Old `layout` controlled visibility: minimal hid ring, compact hid time.
  const layoutHidesRing = (layout as Layout) === 'minimal'
  const layoutHidesTime = (layout as Layout) === 'compact'

  // Old `time` slot seeds both new `status` and `time`.
  const oldTimeSlot = slotOrOff(p.time, 'below')

  return {
    ring: layoutHidesRing ? 'off' : slotOrOff(p.ring, defaults.ring),
    status: oldTimeSlot,
    time: layoutHidesTime ? 'off' : oldTimeSlot,
    dots: showDots === false ? 'off' : slotOrOff(p.dots, defaults.dots),
  }
}

/**
 * Shortcuts didn't exist before ADR-0007 (only a hard-coded, unpersisted show-hide
 * accelerator). Fills in any missing/invalid per-action entry from the default so
 * partial or pre-ADR-0007 prefs files still round-trip to a valid `Shortcuts`.
 */
function migrateShortcuts(raw: unknown): Shortcuts {
  const p = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const result = {} as Shortcuts
  for (const action of SHORTCUT_ACTIONS) {
    const v = p[action]
    result[action] = typeof v === 'string' || v === null ? v : DEFAULT_SHORTCUTS[action]
  }
  return result
}

function load(): Prefs {
  try {
    const raw = readFileSync(filePath(), 'utf8')
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const merged = { ...DEFAULT_PREFS, ...parsed } as Prefs
    merged.tick = migrateTick(parsed.tick)
    merged.timerStyle = migrateTimerStyle(parsed.timerStyle)
    merged.shortcuts = migrateShortcuts(parsed.shortcuts)
    // Migrate old placement shape if `status` key is missing (pre-split schema).
    const rawPlacement = parsed.islandPlacement as Record<string, unknown> | undefined
    if (!rawPlacement || !('status' in rawPlacement)) {
      merged.islandPlacement = migrateIslandPlacement(rawPlacement, parsed.layout, parsed.showDots)
    }
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
