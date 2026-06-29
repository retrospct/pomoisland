import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../src/shared/types'
import type {
  IslandSize,
  Placement,
  Prefs,
  PomApi,
  TaskMutation,
  TasksState,
  TimerAction,
  TimerState,
} from '../src/shared/types'

function on<T>(channel: string, cb: (payload: T) => void): () => void {
  const handler = (_e: unknown, payload: T) => cb(payload)
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.removeListener(channel, handler)
}

const api: PomApi = {
  platform: process.platform,
  timer: {
    get: () => ipcRenderer.invoke(IPC.timerGet) as Promise<TimerState>,
    onState: (cb) => on<TimerState>(IPC.timerState, cb),
    action: (action: TimerAction) => ipcRenderer.send(IPC.timerAction, action),
  },
  prefs: {
    get: () => ipcRenderer.invoke(IPC.prefsGet) as Promise<Prefs>,
    set: (patch: Partial<Prefs>) => ipcRenderer.send(IPC.prefsSet, patch),
    onChange: (cb) => on<Prefs>(IPC.prefsChanged, cb),
  },
  tasks: {
    get: () => ipcRenderer.invoke(IPC.tasksGet) as Promise<TasksState>,
    mutate: (m: TaskMutation) => ipcRenderer.send(IPC.tasksMutate, m),
    onChange: (cb) => on<TasksState>(IPC.tasksChanged, cb),
  },
  island: {
    resize: (size: IslandSize) => ipcRenderer.send(IPC.islandResize, size),
    onPlacement: (cb) => on<Placement>(IPC.islandPlacement, cb),
    getPlacement: () => ipcRenderer.invoke(IPC.islandGetPlacement) as Promise<Placement>,
    dragStart: (x: number, y: number) => ipcRenderer.send(IPC.islandDragStart, x, y),
    dragMove: (x: number, y: number) => ipcRenderer.send(IPC.islandDragMove, x, y),
    dragEnd: () => ipcRenderer.send(IPC.islandDragEnd),
  },
  windows: {
    openSettings: () => ipcRenderer.send(IPC.openSettings),
    settingsControl: (action) => ipcRenderer.send(IPC.settingsControl, action),
  },
}

contextBridge.exposeInMainWorld('api', api)
