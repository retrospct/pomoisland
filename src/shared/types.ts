// Shared domain + IPC contract types. Imported by main, preload, and both renderers.
// See CONTEXT.md for the vocabulary and ADR-0002 for why the main process owns this state.

export type Status = 'idle' | 'running' | 'paused' | 'complete'
export type Mode = 'focus' | 'break'

export type Preset = 'classic' | 'focus' | 'custom'
export type ThemeChoice = 'light' | 'dark' | 'system'
export type TimerStyle = 'circular' | 'outline' | 'bar'
export type Layout = 'split' | 'minimal' | 'compact'
export type AccentKey = 'teal' | 'clay' | 'blue' | 'violet' | 'rose' | 'green'
/**
 * Completion alarm voices — synthesized in the renderer via Web Audio (see
 * src/shared/sound.ts and ADR-0005). `chime/bell/marimba/digital` are the clean
 * built-ins; `halcyon/spice/pocket/koto` are the cinematic/pocket-synth set;
 * `aurora` is a granular ambient bloom (Hologram Microcosm-inspired).
 */
export type Sound =
  | 'chime'
  | 'bell'
  | 'marimba'
  | 'digital'
  | 'halcyon'
  | 'spice'
  | 'pocket'
  | 'koto'
  | 'aurora'
/** Completion ("done") animation variants — see RippleConcept.dc.html. */
export type Ripple = 'burst' | 'echo' | 'heartbeat' | 'bloom'

/**
 * Per-second ticking sound while focusing — synthesized in the renderer (see
 * src/shared/sound.ts and ADR-0005). `off` is silent; `soft` is a low woodblock
 * thunk; `crisp` is a brighter click.
 */
export type TickSound = 'off' | 'soft' | 'crisp'

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
  /** Sessions per round (drives the dots); mirrors prefs.cSessions. */
  sessionTotal: number
  /** Whether the current break is the long break. */
  isLongBreak: boolean
  task: string
}

/**
 * Persisted user preferences, owned by the main process. The field set mirrors
 * the SettingsPanel.dc.html design (General + Preferences tabs). `alwaysTop` and
 * `magnetic` are not surfaced in that panel but the main process reads them to
 * drive window behavior — see ADR-0004.
 */
export interface Prefs {
  // ---- General · Timer preset + durations (minutes) ----
  preset: Preset
  cFocus: number
  cShort: number
  cLong: number
  /** Focus sessions until a long break (drives the dots). */
  cSessions: number
  dailyGoal: number
  // ---- General · Behavior ----
  /** Auto-start the next focus/break block when one ends. */
  autoStart: boolean
  /** Do Not Disturb while focusing (persisted-only this pass — ADR-0004). */
  dnd: boolean
  launchLogin: boolean
  /** Motivational messages in the expanded panel. */
  messages: boolean
  hideShare: boolean
  pauseIdle: boolean
  // ---- Preferences · Alarm & sound ----
  sound: Sound
  volume: number
  /** Per-second ticking sound while focusing — see ADR-0005. */
  tick: TickSound
  notify: boolean
  // ---- Preferences · Appearance ----
  accent: AccentKey
  theme: ThemeChoice
  timerStyle: TimerStyle
  layout: Layout
  showDots: boolean
  /** Completion ("done") animation. */
  ripple: Ripple
  // ---- Window behavior (not in SettingsPanel UI; read by main) ----
  alwaysTop: boolean
  magnetic: boolean
  /** Delay (ms) before collapsing from peek after cursor leaves. */
  hoverRetractMs: number
  /** Delay (ms) before collapsing from expanded after cursor leaves. */
  expandRetractMs: number
}

export type TimerActionType = 'playPause' | 'reset' | 'skip' | 'switchMode' | 'quit'

export interface SetTaskAction {
  type: 'setTask'
  task: string
}

export type TimerAction = { type: TimerActionType } | SetTaskAction

// ---------------------------------------------------------------------------
// Tasks (MO-6) — persisted per-task state owned by the main process.
// ---------------------------------------------------------------------------

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

// ---- Task model (MO-6) ----

export interface Task {
  id: string
  title: string
  /** Target focus sessions for this task. */
  estimatePomodoros: number
  /** Focus sessions completed while this task was active. */
  completedPomodoros: number
  done: boolean
}

export interface TasksState {
  tasks: Task[]
  activeTaskId: string | null
  /** Focus sessions completed today (MO-7). */
  completedToday: number
  /** ISO date string (YYYY-MM-DD) tracking when completedToday was last reset. */
  completedDate: string
}

export type TaskMutation =
  | { type: 'add'; title: string }
  | {
      type: 'update'
      id: string
      patch: Partial<Pick<Task, 'title' | 'estimatePomodoros' | 'done'>>
    }
  | { type: 'delete'; id: string }
  | { type: 'setActive'; id: string | null }

/** The surface exposed to renderers via contextBridge as `window.api`. */
export interface PomApi {
  platform: string
  timer: {
    get(): Promise<TimerState>
    onState(cb: (s: TimerState) => void): () => void
    /** Fired by the main process once per second when a focus block is running. */
    onTick(cb: () => void): () => void
    action(action: TimerAction): void
  }
  prefs: {
    get(): Promise<Prefs>
    set(patch: Partial<Prefs>): void
    onChange(cb: (p: Prefs) => void): () => void
  }
  tasks: {
    get(): Promise<TasksState>
    mutate(m: TaskMutation): void
    onChange(cb: (s: TasksState) => void): () => void
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
  timerTick: 'timer:tick',
  timerAction: 'timer:action',
  prefsGet: 'prefs:get',
  prefsSet: 'prefs:set',
  prefsChanged: 'prefs:changed',
  tasksGet: 'tasks:get',
  tasksMutate: 'tasks:mutate',
  tasksChanged: 'tasks:changed',
  islandResize: 'island:resize',
  islandPlacement: 'island:placement',
  islandGetPlacement: 'island:getPlacement',
  islandDragStart: 'island:dragStart',
  islandDragMove: 'island:dragMove',
  islandDragEnd: 'island:dragEnd',
  openSettings: 'windows:openSettings',
  settingsControl: 'windows:settingsControl',
} as const
