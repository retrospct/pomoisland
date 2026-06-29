import { playSound, playTick } from '@shared/sound'
import type { Placement, Prefs, TasksState, TimerState } from '@shared/types'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { deriveIsland } from './derive'
import { Island, type Present } from './Island'
import { islandPaletteVars, resolveTheme } from './palette'
import { useDrag } from './useDrag'

export function IslandApp() {
  const [state, setState] = useState<TimerState | null>(null)
  const [prefs, setPrefs] = useState<Prefs | null>(null)
  const [tasks, setTasks] = useState<TasksState | null>(null)
  const [placement, setPlacement] = useState<Placement>({
    snapped: true,
    dragging: false,
    nearSnap: false,
  })
  const [expanded, setExpanded] = useState(false)
  const [tasksOpen, setTasksOpen] = useState(false)
  const [peek, setPeek] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const measureRef = useRef<HTMLDivElement>(null)
  const prevStatus = useRef<string | null>(null)
  const lastTickSecond = useRef<number | null>(null)
  const retractTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Ref so the blur handler never has a stale dragging value.
  const draggingRef = useRef(false)

  const { onMouseDown, justDragged } = useDrag()

  // Keep draggingRef in sync with placement state.
  useEffect(() => {
    draggingRef.current = placement.dragging
  }, [placement.dragging])

  // Forces a re-render when the OS appearance changes, so `resolveTheme('system')` re-reads
  // the media query and the palette vars update live.
  const [, forceThemeUpdate] = useState(0)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => forceThemeUpdate((v) => v + 1)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // --- Subscriptions ---
  useEffect(() => {
    let alive = true
    void window.api.timer.get().then((s) => alive && setState(s))
    void window.api.prefs.get().then((p) => alive && setPrefs(p))
    void window.api.tasks.get().then((t) => alive && setTasks(t))
    void window.api.island.getPlacement().then((p) => alive && setPlacement(p))
    const offState = window.api.timer.onState(setState)
    const offPrefs = window.api.prefs.onChange(setPrefs)
    const offTasks = window.api.tasks.onChange(setTasks)
    const offPlace = window.api.island.onPlacement(setPlacement)
    return () => {
      alive = false
      offState()
      offPrefs()
      offTasks()
      offPlace()
    }
  }, [])

  // --- Completion chime on transition into `complete` ---
  useEffect(() => {
    if (!state || !prefs) return
    if (prevStatus.current !== 'complete' && state.status === 'complete') {
      playSound(prefs.sound, prefs.volume)
    }
    prevStatus.current = state.status
  }, [state, prefs])

  // --- Per-second focus tick (ADR-0005) ---
  // The main-process timer fires every 250ms, so detect each whole-second decrease in
  // `remaining` and play at most one tick per second — only while a focus block runs.
  // KNOWN BUG: cadence is unreliable (see .scratch/ticking-sound/issues/01-*).
  useEffect(() => {
    if (!state || !prefs) return
    if (prefs.tick === 'off' || state.mode !== 'focus' || state.status !== 'running') {
      lastTickSecond.current = null
      return
    }
    const sec = Math.ceil(state.remaining)
    if (lastTickSecond.current === null) {
      lastTickSecond.current = sec // arm without firing on the first running frame
      return
    }
    if (sec < lastTickSecond.current) {
      lastTickSecond.current = sec
      playTick(prefs.tick, prefs.volume)
    }
  }, [state, prefs])

  // --- Auto-resize the window to fit the island content (ADR-0003) ---
  useLayoutEffect(() => {
    const el = measureRef.current
    if (!el) return
    let raf = 0
    const report = () => {
      const r = el.getBoundingClientRect()
      window.api.island.resize({ width: r.width, height: r.height })
    }
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(report)
    })
    ro.observe(el)
    report()
    return () => {
      ro.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [])

  // --- Retract helpers (MO-10) ---
  const clearRetract = useCallback(() => {
    if (retractTimer.current !== null) {
      clearTimeout(retractTimer.current)
      retractTimer.current = null
    }
  }, [])

  /** Immediately collapse to the minimised notch state. */
  const retract = useCallback(() => {
    clearRetract()
    setExpanded(false)
    setPeek(false)
    setMenuOpen(false)
  }, [clearRetract])

  // Ensure pending timers are cleared on unmount.
  useEffect(() => clearRetract, [clearRetract])

  // --- Click-outside / window-blur retract ---
  // When the island window loses OS focus (user clicked elsewhere), collapse it.
  // Guard against firing during a drag — the mouse leaving the window doesn't
  // lose focus, but just in case.
  useEffect(() => {
    const onBlur = () => {
      if (draggingRef.current) return
      retract()
    }
    window.addEventListener('blur', onBlur)
    return () => window.removeEventListener('blur', onBlur)
  }, [retract])

  // The wrapper is always rendered so the ResizeObserver (attached on mount) can
  // measure the island once state/prefs arrive and drive the window auto-resize.
  const resolvedTheme = prefs ? resolveTheme(prefs.theme) : 'dark'
  const view =
    state && prefs ? deriveIsland(state, prefs, resolvedTheme, tasks?.completedToday ?? 0) : null

  // Determine presentation
  let present: Present = 'collapsed'
  if (tasksOpen && expanded) present = 'tasks'
  else if (expanded) present = 'expanded'
  else if (peek && !placement.dragging) present = 'peek'

  const toggleExpand = () => {
    if (justDragged.current) return
    if (expanded) {
      setTasksOpen(false)
      retract()
    } else {
      clearRetract()
      setMenuOpen(false)
      setExpanded(true)
    }
  }

  const openTasks = (e: React.MouseEvent) => {
    e.stopPropagation()
    setMenuOpen(false)
    setExpanded(true)
    setTasksOpen(true)
  }

  const closeTasks = () => setTasksOpen(false)

  return (
    <div
      ref={measureRef}
      style={{ display: 'inline-block', ...(prefs ? islandPaletteVars(prefs.theme) : {}) }}
      onMouseDown={onMouseDown}
      onMouseEnter={() => {
        clearRetract()
        if (!expanded && !placement.dragging) setPeek(true)
      }}
      onMouseLeave={() => {
        const delay = expanded ? (prefs?.expandRetractMs ?? 1000) : (prefs?.hoverRetractMs ?? 200)
        retractTimer.current = setTimeout(() => {
          retractTimer.current = null
          setExpanded(false)
          setPeek(false)
        }, delay)
      }}
    >
      {view && state && prefs && (
        <Island
          present={present}
          view={view}
          notch={placement.snapped}
          ripple={prefs.ripple}
          messagesOn={prefs.messages}
          tasks={tasks}
          onToggleExpand={toggleExpand}
          onPlayPause={() => window.api.timer.action({ type: 'playPause' })}
          onReset={() => window.api.timer.action({ type: 'reset' })}
          onSkip={() => window.api.timer.action({ type: 'skip' })}
          menuOpen={menuOpen}
          onToggleMenu={(e) => {
            e.stopPropagation()
            setMenuOpen((v) => !v)
          }}
          onOpenTasks={openTasks}
          onCloseTasks={closeTasks}
          onSettings={(e) => {
            e.stopPropagation()
            setMenuOpen(false)
            window.api.windows.openSettings()
          }}
          onQuit={(e) => {
            e.stopPropagation()
            setMenuOpen(false)
            window.api.timer.action({ type: 'quit' })
          }}
        />
      )}
    </div>
  )
}
