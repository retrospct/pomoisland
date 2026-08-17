// Task store (userData/tasks.json). Mirrors the store.ts pattern — main process
// owns task state; both renderers subscribe via IPC. Kept separate from Prefs so
// list churn and settings writes don't interact (see PRD architecture notes).
//
// This module is the *shell*: the JSON file, the in-memory cache and the
// subscriber list. Every decision about what the state should become lives in
// src/shared/tasks.ts, which is pure and therefore drivable from a plain Node
// assertion script (scripts/task-check.ts). Impure inputs — the id generator and
// today's date — are supplied here and passed in.

import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import * as tasks from '../src/shared/tasks'
import { getPrefs } from './store'
import type { TaskMutation, TasksState } from '../src/shared/types'

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
    return tasks.normalizeTasksState(JSON.parse(raw), todayString())
  } catch {
    return tasks.emptyTasksState(todayString())
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
  return tasks.activeTaskTitle(getTasks())
}

/**
 * Called when a focus block completes — credits the active task and the day,
 * unless the block was skipped and the user hasn't asked for skips to count.
 * The reason comes from the timer; the pref is read here so the reducer stays
 * pure.
 */
export function recordFocusComplete(reason: 'elapsed' | 'skipped'): void {
  commit(
    tasks.recordFocusComplete(getTasks(), todayString(), {
      reason,
      creditSkipped: getPrefs().creditSkipped,
    }),
  )
}

export function applyMutation(m: TaskMutation): void {
  commit(tasks.applyMutation(getTasks(), m, randomUUID))
}
