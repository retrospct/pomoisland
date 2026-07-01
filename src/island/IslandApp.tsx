import { resolveNotchHeight } from '@shared/notchHeight'
import { playSound, playTick } from '@shared/sound'
import type { Placement, Prefs, TasksState, TimerState } from '@shared/types'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { deriveIsland } from './derive'
import { Island, type Present } from './Island'
import { islandPaletteVars, notchBackgroundColor, resolveTheme } from './palette'
import { useDrag } from './useDrag'

export function IslandApp() {
  const [state, setState] = useState<TimerState | null>(null)
  const [prefs, setPrefs] = useState<Prefs | null>(null)
  const [tasks, setTasks] = useState<TasksState | null>(null)
  const [placement, setPlacement] = useState<Placement>({
    snapped: true,
    dragging: false,
    nearSnap: false,
    hasNotch: false,
    notchHeight: 0,
    notchWidth: 0,
    notchCenterX: 0,
  })
  const [expanded, setExpanded] = useState(false)
  const [tasksOpen, setTasksOpen] = useState(false)
  const [peek, setPeek] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const measureRef = useRef<HTMLDivElement>(null)
  // Ref so the resize observer's report() closure (registered once) always sees
  // the latest presentation without re-subscribing.
  const presentRef = useRef<Present>('collapsed')
  const prevStatus = useRef<string | null>(null)
  const prefsRef = useRef<Prefs | null>(null)
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

  // Keep prefsRef current so the tick callback (registered once) always sees latest prefs.
  useEffect(() => {
    prefsRef.current = prefs
  }, [prefs])

  // --- Completion chime on transition into `complete` ---
  useEffect(() => {
    if (!state || !prefs) return
    if (prevStatus.current !== 'complete' && state.status === 'complete') {
      playSound(prefs.sound, prefs.volume)
    }
    prevStatus.current = state.status
  }, [state, prefs])

  // --- Per-second focus tick (ADR-0005) ---
  // The main process emits `timer:tick` once per second when a focus block is running
  // (whole-second boundary in electron/timer.ts). This replaces the fragile renderer-side
  // detection that was prone to React batching / renderer-throttling jitter.
  useEffect(() => {
    return window.api.timer.onTick(() => {
      const p = prefsRef.current
      if (!p || p.tick === 'off') return
      playTick(p.tick, p.volume)
    })
  }, [])

  // --- Auto-resize the window to fit the island content (ADR-0003) ---
  useLayoutEffect(() => {
    const el = measureRef.current
    if (!el) return
    let raf = 0
    const report = () => {
      const r = el.getBoundingClientRect()
      window.api.island.resize({
        width: r.width,
        height: r.height,
        collapsed: presentRef.current === 'collapsed',
      })
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

  // Notch band height honoring the user's setting — see resolveNotchHeight for
  // the mode → height mapping (shared with the settings custom-height stepper).
  const effectiveNotchHeight = !prefs
    ? placement.notchHeight
    : resolveNotchHeight({
        mode: prefs.notchHeightMode,
        menubarHeight: placement.notchHeight,
        hasNotch: placement.hasNotch,
        custom: prefs.notchHeightCustom,
      })

  // Snapped-island surface color: pure black (Dynamic Island look, default) or
  // the theme's normal surface — only applied to the snapped presentation.
  const notchBg = prefs ? notchBackgroundColor(prefs.theme, prefs.notchBackground) : '#000000'

  // Determine presentation
  let present: Present = 'collapsed'
  if (tasksOpen && expanded) present = 'tasks'
  else if (expanded) present = 'expanded'
  else if (peek && !placement.dragging) present = 'peek'
  // Kept in sync with `present` on every render so the resize-report closure
  // (registered once in the ResizeObserver effect above) always reads the
  // latest presentation instead of the value from mount.
  presentRef.current = present

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

  // --- Peek-trigger hover region (MO-45) ---
  // The wrapper window is much larger than the visible island (it reserves
  // transparent room for the notch spacer, notch "ears", and floating-menu
  // slack — see Island.tsx). Triggering peek on `onMouseEnter` of that whole
  // window meant passing near the notch (e.g. closing a browser tab) could
  // clip through the dead zone and expand the island unintentionally.
  //
  // Fix: delegate via the bubbling mouseover/mouseout events (unlike
  // mouseenter/mouseleave, these bubble) and scope the trigger to whichever
  // `[data-hover-target]` element — the actual visible ink — the pointer is
  // over. Every presentation (collapsed clusters, peek/expanded panels, the
  // task list) marks its own visible root with that attribute; the
  // transparent scaffolding between them is left unmarked, so it stays a
  // dead zone. Boundary checks via relatedTarget avoid re-firing while the
  // pointer moves between children of the same hover target.
  const onIslandMouseOver = (e: React.MouseEvent) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-hover-target="1"]')
    if (!target) return
    const from = e.relatedTarget as HTMLElement | null
    if (from && target.contains(from)) return // still within the same hover target
    clearRetract()
    if (!expanded && !placement.dragging) setPeek(true)
  }

  const onIslandMouseOut = (e: React.MouseEvent) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-hover-target="1"]')
    if (!target) return
    const to = e.relatedTarget as HTMLElement | null
    if (to && target.contains(to)) return // still within the same hover target
    const delay = expanded ? (prefs?.expandRetractMs ?? 1000) : (prefs?.hoverRetractMs ?? 200)
    retractTimer.current = setTimeout(() => {
      retractTimer.current = null
      setExpanded(false)
      setPeek(false)
    }, delay)
  }

  return (
    <div
      ref={measureRef}
      style={{ display: 'inline-block', ...(prefs ? islandPaletteVars(prefs.theme) : {}) }}
      onMouseDown={onMouseDown}
      onMouseOver={onIslandMouseOver}
      onMouseOut={onIslandMouseOut}
    >
      {view && state && prefs && (
        <Island
          present={present}
          view={view}
          notch={placement.snapped}
          hasNotch={placement.hasNotch}
          notchHeight={effectiveNotchHeight}
          notchWidth={placement.notchWidth}
          notchBg={notchBg}
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
          onCheckUpdates={(e) => {
            e.stopPropagation()
            setMenuOpen(false)
            window.api.updates.check()
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
