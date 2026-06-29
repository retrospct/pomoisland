import { playSound, playTick } from '@shared/sound'
import type { Placement, Prefs, TimerState } from '@shared/types'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { deriveIsland } from './derive'
import { Island, type Present } from './Island'
import { islandPaletteVars, resolveTheme } from './palette'

export function IslandApp() {
  const [state, setState] = useState<TimerState | null>(null)
  const [prefs, setPrefs] = useState<Prefs | null>(null)
  const [placement, setPlacement] = useState<Placement>({
    snapped: true,
    dragging: false,
    nearSnap: false,
  })
  const [expanded, setExpanded] = useState(false)
  const [peek, setPeek] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const measureRef = useRef<HTMLDivElement>(null)
  const justDragged = useRef(false)
  const moved = useRef(false)
  const prevStatus = useRef<string | null>(null)
  const lastTickSecond = useRef<number | null>(null)

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
    void window.api.island.getPlacement().then((p) => alive && setPlacement(p))
    const offState = window.api.timer.onState(setState)
    const offPrefs = window.api.prefs.onChange(setPrefs)
    const offPlace = window.api.island.onPlacement(setPlacement)
    return () => {
      alive = false
      offState()
      offPrefs()
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

  // --- Drag (collapsed only) ---
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (expanded) return
      if ((e.target as HTMLElement)?.closest('button')) return
      moved.current = false
      window.api.island.dragStart(e.screenX, e.screenY)
      setPeek(false)

      const onMove = (ev: MouseEvent) => {
        moved.current = true
        window.api.island.dragMove(ev.screenX, ev.screenY)
      }
      const onUp = () => {
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
        window.api.island.dragEnd()
        if (moved.current) {
          justDragged.current = true
          setTimeout(() => (justDragged.current = false), 60)
        }
      }
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    },
    [expanded],
  )

  // The wrapper is always rendered so the ResizeObserver (attached on mount) can
  // measure the island once state/prefs arrive and drive the window auto-resize.
  const resolvedTheme = prefs ? resolveTheme(prefs.theme) : 'dark'
  const view = state && prefs ? deriveIsland(state, prefs, resolvedTheme) : null

  let present: Present = 'collapsed'
  if (expanded) present = 'expanded'
  else if (peek && placement.snapped && !placement.dragging) present = 'peek'

  const toggleExpand = () => {
    if (justDragged.current) return
    setMenuOpen(false)
    setExpanded((v) => !v)
  }

  return (
    <div ref={measureRef} style={{ display: 'inline-block', ...(prefs ? islandPaletteVars(prefs.theme) : {}) }}>
      {view && state && prefs && (
        <Island
          present={present}
          view={view}
          notch={placement.snapped}
          ripple={prefs.ripple}
          messagesOn={prefs.messages}
          onToggleExpand={toggleExpand}
          onPlayPause={() => window.api.timer.action({ type: 'playPause' })}
          onReset={() => window.api.timer.action({ type: 'reset' })}
          onSkip={() => window.api.timer.action({ type: 'skip' })}
          onMouseDown={onMouseDown}
          onMouseEnter={() => {
            if (!expanded && !placement.dragging && placement.snapped) setPeek(true)
          }}
          onMouseLeave={() => setPeek(false)}
          menuOpen={menuOpen}
          onToggleMenu={(e) => {
            e.stopPropagation()
            setMenuOpen((v) => !v)
          }}
          switchLabel={view.isBreak ? 'Switch to focus' : 'Switch to break'}
          onSwitch={(e) => {
            e.stopPropagation()
            setMenuOpen(false)
            window.api.timer.action({ type: 'switchMode' })
          }}
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
