// Root of the DETACHED task window (ticket 23) — the fourth renderer entry,
// alongside the island, Settings and the snap overlay.
//
// Why its own entry rather than the island entry with a query param: the island
// entry is not a shell. It loads the alarm sample, drives the completion/tick
// sounds, owns the drag-to-move handlers and the ResizeObserver that sizes the
// island window to its content, and its stylesheet makes the window background
// transparent — all of which would have to be gated off for this window, which
// is opaque, user-resizable and silent. A separate ~60-line entry is cheaper and
// keeps the island's own code free of "am I really the island?" branches.
//
// It needs no task state plumbing: TasksState lives in the main process and is
// broadcast to every window, so this one subscribes exactly the way the island
// does. Prefs and timer state come the same way, and are read only to resolve
// the accent identically to the docked panel — popping out must not restyle the
// list.

import { accentHex, resolveAccent } from '@shared/accent'
import type { Prefs, TasksState, TimerState } from '@shared/types'
import { useEffect, useState } from 'react'
import { islandPaletteVars, resolveTheme } from '../island/palette'
import { TaskList } from '../island/TaskList'

export function TasksWindowApp() {
  const [tasks, setTasks] = useState<TasksState | null>(null)
  const [prefs, setPrefs] = useState<Prefs | null>(null)
  const [state, setState] = useState<TimerState | null>(null)

  useEffect(() => {
    let alive = true
    void window.api.tasks.get().then((t) => alive && setTasks(t))
    void window.api.prefs.get().then((p) => alive && setPrefs(p))
    void window.api.timer.get().then((s) => alive && setState(s))
    const offTasks = window.api.tasks.onChange(setTasks)
    const offPrefs = window.api.prefs.onChange(setPrefs)
    const offState = window.api.timer.onState(setState)
    return () => {
      alive = false
      offTasks()
      offPrefs()
      offState()
    }
  }, [])

  // Re-render when the OS appearance changes so `resolveTheme('system')` re-reads
  // the media query — same trick the island uses.
  const [, forceThemeUpdate] = useState(0)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => forceThemeUpdate((v) => v + 1)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  if (!prefs || !tasks) return null

  const theme = resolveTheme(prefs.theme)
  // Break and the final minute shift the island's accent, so run the SAME
  // resolver deriveIsland uses — popping the list out must not restyle it.
  // Before timer state arrives, idle/focus resolves to the plain chosen accent.
  const { accent } = resolveAccent({
    base: accentHex(prefs.accent),
    mode: state?.mode ?? 'focus',
    status: state?.status ?? 'idle',
    remaining: state?.remaining ?? 0,
    theme,
  })

  return (
    <div
      style={{
        ...islandPaletteVars(theme),
        height: '100%',
        background: 'var(--il-bg)',
        color: 'var(--il-text)',
      }}
    >
      <TaskList
        tasks={tasks}
        accent={accent}
        mode="detached"
        onPopIn={() => window.api.windows.tasksWindow('popIn')}
        // The pin is its own pref, not the island's alwaysTop — the two levels
        // are deliberately different (see Prefs.tasksAlwaysOnTop). Written
        // straight through prefs.set: the main process re-applies the window
        // level from its own onPrefsChange, and the broadcast comes back here to
        // update the glyph, so there is no second source of truth to keep.
        pinned={prefs.tasksAlwaysOnTop}
        onTogglePin={() => window.api.prefs.set({ tasksAlwaysOnTop: !prefs.tasksAlwaysOnTop })}
        // Close means pop in: one bit for where the list lives, and it can never
        // point at a window that isn't there. See TasksWindowAction.
        onClose={() => window.api.windows.tasksWindow('popIn')}
      />
    </div>
  )
}
