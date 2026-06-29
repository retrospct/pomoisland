import { useCallback, useRef } from 'react'

/**
 * Seam for the custom JS→IPC drag loop (MO-9, ADR-0003).
 * Owns mousedown→IPC binding and interactive-element exclusion so that
 * swapping to native app-region later is a one-file change.
 *
 * A drag is only committed once the cursor travels > DRAG_THRESHOLD_PX from
 * the mousedown origin. This filters out micro-jitter during normal clicks so
 * the island doesn't jump or flicker on a tap. dragStart is sent only then,
 * with the original mousedown coordinates so the window offset is correct.
 *
 * Excluded targets: <button> elements and anything with [data-drag-exclude]
 * (the latter is reserved for the task-text hotspot added by MO-6).
 */

const DRAG_THRESHOLD_PX = 5

export function useDrag() {
  const moved = useRef(false)
  const justDragged = useRef(false)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('[data-drag-exclude]')) return

    moved.current = false
    const startX = e.screenX
    const startY = e.screenY
    let started = false

    const onMove = (ev: MouseEvent) => {
      const dx = ev.screenX - startX
      const dy = ev.screenY - startY

      if (!started) {
        if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD_PX) return
        started = true
        // Pass the original mousedown coords so the window offset is correct.
        window.api.island.dragStart(startX, startY)
      }

      moved.current = true
      window.api.island.dragMove(ev.screenX, ev.screenY)
    }

    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      if (started) window.api.island.dragEnd()
      if (moved.current) {
        justDragged.current = true
        setTimeout(() => (justDragged.current = false), 60)
      }
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  return { onMouseDown, justDragged }
}
