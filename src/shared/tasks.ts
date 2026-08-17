// Pure task logic — no Electron, no filesystem, no listeners, so it can be driven
// from a plain Node assertion script (scripts/task-check.ts). It lives in shared/
// rather than electron/ because the at-estimate predicate that ADR-0008 keeps
// derived has to be evaluated by the renderers too; today the only importers are
// electron/taskStore.ts and the check script.
//
// electron/taskStore.ts is the shell around this: it owns the JSON file, the cache
// and the subscriber list, and calls through to these functions for every decision.
//
// Impure inputs are parameters, never ambient: the id generator and today's date
// are passed in, so every function here is deterministic.

import type { Task, TaskMutation, TasksState } from './types'

/** Mints ids for newly added tasks. Injected so tests can be deterministic. */
export type NewId = () => string

/**
 * The task to work on next: the first incomplete one, or nothing.
 *
 * The single answer to "which task now?", shared by every path that has to pick
 * one (delete, clearCompleted, and the done path) — separate paths choosing
 * independently is how they drift apart.
 */
function firstIncompleteId(tasks: Task[]): string | null {
  return tasks.find((t) => !t.done)?.id ?? null
}

/**
 * Which task should be active once `tasks` is the list. Keeps the current one if
 * it's still there, otherwise falls through to `firstIncompleteId`.
 *
 * The trigger is the active task going *missing*, not its being done. Since the
 * done path advances (see the `update` case) a live state shouldn't reach here
 * with a completed active task — but a tasks.json written before that, or edited
 * by hand, loads that way, and normalizeTasksState doesn't reconcile it. Such a
 * state must survive an unrelated delete rather than being quietly re-aimed.
 */
function nextActiveId(tasks: Task[], current: string | null): string | null {
  if (tasks.some((t) => t.id === current)) return current
  return firstIncompleteId(tasks)
}

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

function finiteOr(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

/**
 * Coerce one persisted entry into a Task, or null if it isn't one.
 *
 * The count fields were once `estimatePomodoros` / `completedPomodoros`. Those
 * keys are read forever as fallbacks and never written back, so the new shape
 * lands on the next persist and the migration is self-healing. There is no
 * `version` field on TasksState: versioning machinery earns its place when a
 * *shape* changes, not when a key is renamed (cf. store.ts, which merges prefs
 * over defaults with no version — ADR-0004).
 */
function normalizeTask(raw: unknown): Task | null {
  if (!raw || typeof raw !== 'object') return null
  const t = raw as Record<string, unknown>
  if (typeof t.id !== 'string' || !t.id) return null
  return {
    id: t.id,
    title: typeof t.title === 'string' ? t.title : 'Untitled task',
    estimateSessions: finiteOr(t.estimateSessions, finiteOr(t.estimatePomodoros, 1)),
    completedSessions: finiteOr(t.completedSessions, finiteOr(t.completedPomodoros, 0)),
    done: t.done === true,
  }
}

/**
 * Coerce whatever was read off disk into a valid TasksState. tasks.json is
 * user-writable and outlives app versions, so nothing about its shape is
 * guaranteed — every field is validated, a tasks value that isn't an array is
 * discarded rather than trusted, and entries that aren't tasks are dropped
 * rather than repaired into id-less ghosts.
 *
 * The top-level scalars are checked as strictly as the per-task fields:
 * `defaultEstimate` feeds Math.round() in the add path, so a junk value here
 * would mint tasks with a NaN estimate.
 */
export function normalizeTasksState(parsed: unknown, today: string): TasksState {
  const base = emptyTasksState(today)
  if (!parsed || typeof parsed !== 'object') return base
  const p = parsed as Record<string, unknown>
  return {
    tasks: Array.isArray(p.tasks)
      ? p.tasks.map(normalizeTask).filter((t): t is Task => t !== null)
      : [],
    activeTaskId: typeof p.activeTaskId === 'string' ? p.activeTaskId : null,
    completedToday: finiteOr(p.completedToday, base.completedToday),
    completedDate: typeof p.completedDate === 'string' ? p.completedDate : today,
    defaultEstimate: finiteOr(p.defaultEstimate, base.defaultEstimate),
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
    t.id === state.activeTaskId ? { ...t, completedSessions: t.completedSessions + 1 } : t,
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
        estimateSessions: estimate,
        completedSessions: 0,
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
      // Completing the task you were working on hands the active slot to the
      // next incomplete one, matching delete and clearCompleted — otherwise the
      // island keeps naming a task you just ticked off. The identity test is the
      // whole guard: without it, ticking *any* row would re-aim the active task,
      // so housekeeping would hijack the session.
      const completedTheActiveTask = m.patch.done === true && state.activeTaskId === m.id
      if (!completedTheActiveTask) return { ...state, tasks }
      return { ...state, tasks, activeTaskId: firstIncompleteId(tasks) }
    }
    case 'setActive': {
      // Activating a completed task un-completes it in the same breath: you
      // cannot be working on something you have finished. Doing it as two
      // mutations would commit, persist and broadcast an intermediate state that
      // is incomplete but not yet active — one no user action asked for.
      const tasks = state.tasks.map((t) =>
        t.id === m.id && t.done ? { ...t, done: false } : t,
      )
      return { ...state, tasks, activeTaskId: m.id }
    }
    case 'delete': {
      const tasks = state.tasks.filter((t) => t.id !== m.id)
      return { ...state, tasks, activeTaskId: nextActiveId(tasks, state.activeTaskId) }
    }
    case 'clearCompleted': {
      const tasks = state.tasks.filter((t) => !t.done)
      return { ...state, tasks, activeTaskId: nextActiveId(tasks, state.activeTaskId) }
    }
    default: {
      const _exhaustive: never = m
      return _exhaustive
    }
  }
}
