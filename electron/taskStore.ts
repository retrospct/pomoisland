// Task store (userData/tasks.json). Mirrors the store.ts pattern — main process
// owns task state; both renderers subscribe via IPC. Kept separate from Prefs so
// list churn and settings writes don't interact (see PRD architecture notes).

import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { Task, TaskMutation, TasksState } from '../src/shared/types'

type Listener = (s: TasksState) => void
const listeners = new Set<Listener>()

let cache: TasksState | null = null

function todayString(): string {
  return new Date().toISOString().slice(0, 10)
}

function filePath(): string {
  return join(app.getPath('userData'), 'tasks.json')
}

function load(): TasksState {
  try {
    const raw = readFileSync(filePath(), 'utf8')
    const parsed = JSON.parse(raw) as Partial<TasksState>
    const base: TasksState = {
      tasks: [],
      activeTaskId: null,
      completedToday: 0,
      completedDate: todayString(),
    }
    return {
      ...base,
      ...parsed,
      // Ensure tasks is always a valid array regardless of what was persisted.
      tasks: Array.isArray(parsed.tasks) ? (parsed.tasks as Task[]) : [],
    }
  } catch {
    return { tasks: [], activeTaskId: null, completedToday: 0, completedDate: todayString() }
  }
}

function persist(state: TasksState): void {
  try {
    const path = filePath()
    mkdirSync(dirname(path), { recursive: true })
    if (!existsSync(dirname(path))) return
    writeFileSync(path, JSON.stringify(state, null, 2), 'utf8')
  } catch {
    // Persistence is best-effort; keep running with the in-memory cache.
  }
}

function snap(s: TasksState): TasksState {
  return { ...s, tasks: s.tasks.map((t) => ({ ...t })) }
}

function commit(next: TasksState): void {
  cache = next
  persist(next)
  const copy = snap(next)
  for (const l of listeners) l(copy)
}

export function getTasks(): TasksState {
  cache ??= load()
  return snap(cache)
}

export function onTasksChange(cb: Listener): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

/** Title of the currently active task, or empty string if none. */
export function activeTaskTitle(): string {
  const s = getTasks()
  if (!s.activeTaskId) return ''
  return s.tasks.find((t) => t.id === s.activeTaskId)?.title ?? ''
}

/**
 * Called when a focus block completes — bumps the active task's pomodoro count
 * and the daily total, resetting the counter when the date has rolled over.
 * Auto-completes the task when all sessions are done, then advances to the
 * next incomplete task.
 */
export function recordFocusComplete(): void {
  const s = getTasks()
  const today = todayString()
  const completedToday = s.completedDate === today ? s.completedToday + 1 : 1

  let justAutoCompleted = false
  const tasks = s.tasks.map((t) => {
    if (t.id !== s.activeTaskId) return t
    const completedPomodoros = t.completedPomodoros + 1
    const shouldAutoDone = !t.done && completedPomodoros >= t.estimatePomodoros
    if (shouldAutoDone) justAutoCompleted = true
    return { ...t, completedPomodoros, done: t.done || shouldAutoDone }
  })

  const activeTaskId = justAutoCompleted
    ? (tasks.find((t) => !t.done && t.id !== s.activeTaskId)?.id ?? null)
    : s.activeTaskId

  commit({ ...s, tasks, activeTaskId, completedToday, completedDate: today })
}

export function applyMutation(m: TaskMutation): void {
  const s = getTasks()
  switch (m.type) {
    case 'add': {
      const task: Task = {
        id: randomUUID(),
        title: m.title.trim() || 'Untitled task',
        estimatePomodoros: 1,
        completedPomodoros: 0,
        done: false,
      }
      const tasks = [...s.tasks, task]
      // Auto-activate the first task added when nothing is active yet.
      const activeTaskId = s.activeTaskId ?? task.id
      commit({ ...s, tasks, activeTaskId })
      break
    }
    case 'update': {
      const tasks = s.tasks.map((t) => {
        if (t.id !== m.id) return t
        const patched = { ...t, ...m.patch }
        // Estimate-change side-effects: adding sessions to a done task unchecks it;
        // reducing estimate at or below completed sessions auto-completes it.
        if (m.patch.estimatePomodoros !== undefined) {
          if (patched.done && patched.estimatePomodoros > patched.completedPomodoros) {
            return { ...patched, done: false }
          }
          if (!patched.done && patched.completedPomodoros >= patched.estimatePomodoros && patched.completedPomodoros > 0) {
            return { ...patched, done: true }
          }
        }
        return patched
      })
      commit({ ...s, tasks })
      break
    }
    case 'delete': {
      const tasks = s.tasks.filter((t) => t.id !== m.id)
      // Fall back to the first remaining incomplete task if the active one was deleted.
      const activeTaskId =
        s.activeTaskId === m.id ? (tasks.find((t) => !t.done)?.id ?? null) : s.activeTaskId
      commit({ ...s, tasks, activeTaskId })
      break
    }
    case 'setActive': {
      commit({ ...s, activeTaskId: m.id })
      break
    }
    default: {
      const _exhaustive: never = m
      return _exhaustive
    }
  }
}
