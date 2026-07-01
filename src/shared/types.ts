// Shared domain + IPC contract types. Imported by main, preload, and both renderers.
// See CONTEXT.md for the vocabulary and ADR-0002 for why the main process owns this state.

export type Status = 'idle' | 'running' | 'paused' | 'complete'
export type Mode = 'focus' | 'break'

export type Preset = 'classic' | 'focus' | 'custom'
export type ThemeChoice = 'light' | 'dark' | 'system'
/**
 * Notch-native progress treatment (the design handoff's A–H variants). Replaces
 * the old `circular | outline | bar` set. Every variant either sits *below* the
 * notch (`below`) or traces the physical notch *outline*; none draws over the
 * opaque camera housing. `underlight` and `comet` are "running" cues that don't
 * encode progress (they pair with the time readout). See src/shared/NotchProgress.tsx.
 */
export type TimerStyle =
  | 'below'
  | 'outline'
  | 'glow'
  | 'front'
  | 'underlight'
  | 'converge'
  | 'split'
  | 'comet'
/**
 * Collapsed-island elements whose position around the notch is user-configurable.
 * `status` = the Focus/Break/Paused label; `time` = the MM:SS countdown; `ring` =
 * the circular progress indicator; `dots` = session progress dots.
 */
export type IslandElement = 'ring' | 'status' | 'time' | 'dots'
/** Where an element sits relative to the camera notch. `off` hides the element. */
export type IslandSlot = 'off' | 'left' | 'below' | 'right'
/** Per-element position map. Default: ring off, status/time/dots below. */
export type IslandPlacement = Record<IslandElement, IslandSlot>
export type AccentKey = 'teal' | 'clay' | 'blue' | 'violet' | 'rose' | 'green'
/** Floating-card layout variant when the island is not snapped to the notch. */
export type FloatingLayout = 'L1' | 'L2' | 'L3' | 'L4'
/**
 * How tall the snapped island's notch band is.
 * `realNotch` = a standard MacBook notch height (and the measured notch on a
 * notched display); `menubar` = the current display's menu-bar height (default,
 * ~30px external / ~38px built-in); `custom` = the `notchHeightCustom` value.
 */
export type NotchHeightMode = 'realNotch' | 'menubar' | 'custom'
/**
 * Snapped-island surface color. `black` = pure black (`#000`), matching the
 * physical notch/Dynamic Island bezel regardless of theme; `theme` = the
 * normal light/dark surface color. Only affects the snapped presentation —
 * the floating card always follows the theme.
 */
export type NotchBackgroundMode = 'black' | 'theme'
/**
 * Completion alarm voices — synthesized in the renderer via Web Audio (see
 * src/shared/sound.ts and ADR-0005). `chime/bell/marimba/digital` are the clean
 * built-ins; `halcyon/spice/pocket/koto` are the cinematic/pocket-synth set;
 * `aurora` is a granular ambient bloom (Hologram Microcosm-inspired).
 */
export type Sound =
  'chime' | 'bell' | 'marimba' | 'digital' | 'halcyon' | 'spice' | 'pocket' | 'koto' | 'aurora'
/** Completion ("done") animation variants — see RippleConcept.dc.html. */
export type Ripple = 'burst' | 'echo' | 'heartbeat' | 'bloom'

/**
 * Per-second ticking sound while focusing — synthesized in the renderer (see
 * src/shared/sound.ts and ADR-0005). `off` is silent; `soft` is a low woodblock
 * thunk; `crisp` is a brighter click.
 */
export type TickSound = 'off' | 'soft' | 'crisp'

/**
 * User-rebindable global shortcut actions — see ADR-0007. `showHide` toggles the
 * island's visibility; `playPause`/`next` mirror the `playPause`/`skip` TimerActions.
 * Opening Settings is a `⌘,` app-menu item, not a global shortcut, so it has no action here.
 */
export type ShortcutAction = 'showHide' | 'playPause' | 'next'
/** Per-action Electron accelerator string (e.g. "CommandOrControl+Alt+Up"), or `null` when unbound. */
export type Shortcuts = Record<ShortcutAction, string | null>

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
  /**
   * Do Not Disturb while focusing. Persisted but dropped from the Settings UI
   * (ADR-0004 update, 2026-07-01) — macOS has no public API to toggle system
   * Focus/DND, so there's no toggle that could actually work.
   */
  dnd: boolean
  launchLogin: boolean
  /** Motivational messages in the expanded panel. */
  messages: boolean
  hideShare: boolean
  pauseIdle: boolean
  /** Show the PomoIsland icon in the macOS Dock. */
  showDockIcon: boolean
  /** User-rebindable global shortcuts (show/hide, play/pause, next) — see ADR-0007. */
  shortcuts: Shortcuts
  // ---- Preferences · Alarm & sound ----
  sound: Sound
  volume: number
  /** Per-second ticking sound while focusing — see ADR-0005. */
  tick: TickSound
  notify: boolean
  // ---- Preferences · Appearance ----
  accent: AccentKey
  theme: ThemeChoice
  /** Snapped-island surface color: pure black vs the theme's surface color. See NotchBackgroundMode. */
  notchBackground: NotchBackgroundMode
  /** Notch-native progress treatment (A–H). See TimerStyle + NotchProgress.tsx. */
  timerStyle: TimerStyle
  /**
   * Where each collapsed-island element sits around the notch. Setting a slot to
   * `'off'` hides that element. Replaces the old `layout` + `showDots` pair.
   */
  islandPlacement: IslandPlacement
  /** Completion ("done") animation. */
  ripple: Ripple
  /** Floating card layout when the island is dragged off the notch. */
  floatingLayout: FloatingLayout
  /** How the snapped island's notch-band height is chosen. See NotchHeightMode. */
  notchHeightMode: NotchHeightMode
  /** Notch band height (px) used when notchHeightMode is 'custom'. */
  notchHeightCustom: number
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
  /** True when the current display has a hardware notch (menuBarHeight ≥ 30px). */
  hasNotch: boolean
  /** Height (px) of the notch band: workArea.y - bounds.y. 0 on non-notch displays. */
  notchHeight: number
  /** Notch width in logical points, used to size the wrap spacer. 0 on non-notch. */
  notchWidth: number
  /** Absolute screen X of the notch center (display-centered on Apple hardware). */
  notchCenterX: number
}

export interface IslandSize {
  width: number
  height: number
}

/**
 * Resize payload sent on every ResizeObserver firing, including from non-collapsed
 * presentations (peek/expanded/tasks). `collapsed` discriminates the true docked-pill
 * footprint from those larger transient views, so the main process only updates the
 * snap drop-zone's remembered size (`dockedSize`) when it reflects the actual dock shape.
 */
export interface IslandResizeSize extends IslandSize {
  collapsed: boolean
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
    resize(size: IslandResizeSize): void
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
  updates: {
    /** Trigger an interactive update check; the main process drives its own dialogs. */
    check(): void
  }
  shortcuts: {
    /**
     * Attempt to bind `action` to `accelerator` (or unbind when `accelerator` is
     * `null`). Reject-and-revert: on failure the previous binding is left in
     * place and `ok` is false with a human-readable `error`. On success the
     * change is already persisted — the caller observes it via `prefs.onChange`.
     */
    set(action: ShortcutAction, accelerator: string | null): Promise<{ ok: boolean; error?: string }>
    /** Restore all shortcuts to their defaults; returns the resulting map. */
    reset(): Promise<Shortcuts>
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
  checkUpdates: 'updates:check',
  shortcutsSet: 'shortcuts:set',
  shortcutsReset: 'shortcuts:reset',
} as const
