import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Placement, Prefs, TimerState } from '@shared/types'
import { deriveIsland } from './derive'
import { Island, type Present } from './Island'
import { playChime } from './chime'

export function IslandApp() {
  const [state, setState] = useState<TimerState | null>(null)
  const [prefs, setPrefs] = useState<Prefs | null>(null)
  const [placement, setPlacement] = useState<Placement>({ snapped: true, dragging: false, nearSnap: false })
  const [expanded, setExpanded] = useState(false)
  const [peek, setPeek] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const measureRef = useRef<HTMLDivElement>(null)
  const justDragged = useRef(false)
  const moved = useRef(false)
  const prevStatus = useRef<string | null>(null)

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
      playChime(prefs.volume)
    }
    prevStatus.current = state.status
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
  const view = state && prefs ? deriveIsland(state, prefs) : null

  let present: Present = 'collapsed'
  if (expanded) present = 'expanded'
  else if (peek && placement.snapped && !placement.dragging) present = 'peek'

  const toggleExpand = () => {
    if (justDragged.current) return
    setMenuOpen(false)
    setExpanded((v) => !v)
  }

  return (
    <div ref={measureRef} style={{ display: 'inline-block' }}>
      {view && state && prefs && (
        <Island
          present={present}
          view={view}
          notch={placement.snapped}
          anim={prefs.anim}
          messagesOn={prefs.showMessages}
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
