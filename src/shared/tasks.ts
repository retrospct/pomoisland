// Pure task logic — no Electron, no filesystem, no listeners, so it can be driven
// from a plain Node assertion script (scripts/task-check.ts) and imported by both
// renderers as well as the main process.
//
// electron/taskStore.ts is the shell around this: it owns the JSON file, the cache
// and the subscriber list, and calls through to these functions for every decision.
//
// Impure inputs are parameters, never ambient: the id generator and today's date
// are passed in, so every function here is deterministic.

import type { Task, TaskMutation, TasksState } from './types'

/** Mints ids for newly added tasks. Injected so tests can be deterministic. */
export type NewId = () => string

/** A fresh, empty task list. `today` is an ISO date string (YYYY-MM-DD). */
export function emptyTasksState(today: string): TasksState {
  return {
    tasks: [],
    activeTaskId: null,
    completedToday: 0,
    completedDate: today,
    defaultEstimate: 1,
  }
}

/**
 * Coerce whatever was read off disk into a valid TasksState. tasks.json is
 * user-writable and outlives app versions, so nothing about its shape is
 * guaranteed — missing keys fall back to defaults, and a tasks value that isn't
 * an array is discarded rather than trusted.
 */
export function normalizeTasksState(parsed: unknown, today: string): TasksState {
  const base = emptyTasksState(today)
  if (!parsed || typeof parsed !== 'object') return base
  const p = parsed as Partial<TasksState>
  return {
    ...base,
    ...p,
    tasks: Array.isArray(p.tasks) ? p.tasks : [],
  }
}

/** Title of the currently active task, or an empty string if none. */
export function activeTaskTitle(state: TasksState): string {
  if (!state.activeTaskId) return ''
  return state.tasks.find((t) => t.id === state.activeTaskId)?.title ?? ''
}

/**
 * Called when a focus block completes — bumps the active task's session count
 * and the daily total, resetting the counter when the date has rolled over.
 * The task is NOT auto-completed when it reaches its estimate; it just keeps
 * counting (e.g. 8/7). Completion is manual (the checkbox) only.
 */
export function recordFocusComplete(state: TasksState, today: string): TasksState {
  const completedToday = state.completedDate === today ? state.completedToday + 1 : 1
  const tasks = state.tasks.map((t) =>
    t.id === state.activeTaskId ? { ...t, completedPomodoros: t.completedPomodoros + 1 } : t,
  )
  return { ...state, tasks, completedToday, completedDate: today }
}

export function applyMutation(state: TasksState, m: TaskMutation, newId: NewId): TasksState {
  switch (m.type) {
    case 'add': {
      // Estimate comes from the add form; remember it as the default for the
      // next added task (MO-53).
      const estimate = Math.max(1, Math.round(m.estimate ?? state.defaultEstimate ?? 1))
      const task: Task = {
        id: newId(),
        title: m.title.trim() || 'Untitled task',
        estimatePomodoros: estimate,
        completedPomodoros: 0,
        done: false,
      }
      return {
        ...state,
        tasks: [...state.tasks, task],
        // Auto-activate the first task added when nothing is active yet.
        activeTaskId: state.activeTaskId ?? task.id,
        defaultEstimate: estimate,
      }
    }
    case 'update': {
      // Done is manual-only: estimate changes never auto-complete or un-complete
      // a task, so it can keep counting past its estimate (e.g. 8/7).
      const tasks = state.tasks.map((t) => (t.id === m.id ? { ...t, ...m.patch } : t))
      return { ...state, tasks }
    }
    case 'setActive':
      return { ...state, activeTaskId: m.id }
    case 'delete': {
      const tasks = state.tasks.filter((t) => t.id !== m.id)
      // Fall back to the first remaining incomplete task if the active one was deleted.
      const activeTaskId =
        state.activeTaskId === m.id
          ? (tasks.find((t) => !t.done)?.id ?? null)
          : state.activeTaskId
      return { ...state, tasks, activeTaskId }
    }
    case 'clearCompleted': {
      const tasks = state.tasks.filter((t) => !t.done)
      // If the active task was among those cleared, fall back to the first
      // remaining incomplete task (same pattern as 'delete').
      const activeTaskId = tasks.some((t) => t.id === state.activeTaskId)
        ? state.activeTaskId
        : (tasks.find((t) => !t.done)?.id ?? null)
      return { ...state, tasks, activeTaskId }
    }
    default: {
      const _exhaustive: never = m
      return _exhaustive
    }
  }
}
