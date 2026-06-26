// Shared domain + IPC contract types. Imported by main, preload, and both renderers.
// See CONTEXT.md for the vocabulary and ADR-0002 for why the main process owns this state.

export type Status = 'idle' | 'running' | 'paused' | 'complete'
export type Mode = 'focus' | 'break'

export type Preset = 'classic' | 'focus' | 'custom'
export type ThemeChoice = 'light' | 'dark' | 'auto'
export type TimerType = 'circular' | 'outline' | 'bar'
export type Layout = 'split' | 'minimal' | 'compact'
export type AlarmSound = 'chime' | 'marimba' | 'bell' | 'pebble' | 'birdsong' | 'custom'
export type CompletionAnim = 'ripple' | 'bloom' | 'heartbeat' | 'confetti' | 'none'

/** Runtime timer state, owned by the main process and broadcast to renderers. */
export interface TimerState {
  status: Status
  mode: Mode
  /** Total length of the current block, in seconds. */
  total: number
  /** Time left in the current block, in seconds (may be fractional while ticking). */
  remaining: number
  /** Zero-based index of the current focus session within the round. */
  sessionIndex: number
  /** Sessions per round (drives the dots); mirrors prefs.longEvery. */
  sessionTotal: number
  /** Whether the current break is the long break. */
  isLongBreak: boolean
  task: string
}

/** Persisted user preferences, owned by the main process (electron-store). */
export interface Prefs {
  // Timer
  preset: Preset
  focusMin: number
  shortMin: number
  longMin: number
  longEvery: number
  dailyGoal: number
  autoBreak: boolean
  autoFocus: boolean
  // Sounds & alerts
  alarm: AlarmSound
  volume: number
  tickOn: boolean
  anim: CompletionAnim
  notify: boolean
  // Appearance
  theme: ThemeChoice
  accent: string
  timerType: TimerType
  layout: Layout
  showDots: boolean
  showMessages: boolean
  // Behavior (some are persisted-only no-ops this pass — see ADR-0004)
  launchLogin: boolean
  alwaysTop: boolean
  magnetic: boolean
  hideShare: boolean
  pauseIdle: boolean
}

export type TimerActionType =
  | 'playPause'
  | 'reset'
  | 'skip'
  | 'switchMode'
  | 'quit'

export interface SetTaskAction {
  type: 'setTask'
  task: string
}

export type TimerAction = { type: TimerActionType } | SetTaskAction

/** Drag / snap status of the island window, broadcast during a drag. */
export interface Placement {
  snapped: boolean
  dragging: boolean
  /** True while dragging and close enough to the notch to snap on release. */
  nearSnap: boolean
}

export interface IslandSize {
  width: number
  height: number
}

/** The surface exposed to renderers via contextBridge as `window.api`. */
export interface PomApi {
  platform: string
  timer: {
    get(): Promise<TimerState>
    onState(cb: (s: TimerState) => void): () => void
    action(action: TimerAction): void
  }
  prefs: {
    get(): Promise<Prefs>
    set(patch: Partial<Prefs>): void
    onChange(cb: (p: Prefs) => void): () => void
  }
  island: {
    resize(size: IslandSize): void
    onPlacement(cb: (p: Placement) => void): () => void
    getPlacement(): Promise<Placement>
    dragStart(cursorX: number, cursorY: number): void
    dragMove(cursorX: number, cursorY: number): void
    dragEnd(): void
  }
  windows: {
    openSettings(): void
    settingsControl(action: SettingsControl): void
  }
}

export type SettingsControl = 'close' | 'minimize' | 'zoom'

export const IPC = {
  timerGet: 'timer:get',
  timerState: 'timer:state',
  timerAction: 'timer:action',
  prefsGet: 'prefs:get',
  prefsSet: 'prefs:set',
  prefsChanged: 'prefs:changed',
  islandResize: 'island:resize',
  islandPlacement: 'island:placement',
  islandGetPlacement: 'island:getPlacement',
  islandDragStart: 'island:dragStart',
  islandDragMove: 'island:dragMove',
  islandDragEnd: 'island:dragEnd',
  openSettings: 'windows:openSettings',
  settingsControl: 'windows:settingsControl',
} as const
