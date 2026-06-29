import { ipcMain } from 'electron'
import { IPC } from '../src/shared/types'
import type { IslandSize, Prefs, SettingsControl, TaskMutation, TimerAction } from '../src/shared/types'
import { getPrefs, onPrefsChange, setPrefs } from './store'
import { activeTaskTitle, applyMutation, getTasks, onTasksChange, recordFocusComplete } from './taskStore'
import {
  applyAlwaysOnTop,
  broadcastToAll,
  createSettingsWindow,
  dragEnd,
  dragMove,
  dragStart,
  getPlacement,
  getSettingsWindow,
  resizeIsland,
} from './windows'
import type { Timer } from './timer'

export function registerIpc(timer: Timer): void {
  // Timer
  ipcMain.handle(IPC.timerGet, () => timer.getState())
  ipcMain.on(IPC.timerAction, (_e, action: TimerAction) => timer.action(action))
  timer.subscribe((s) => broadcastToAll(IPC.timerState, s))

  // Prefs
  ipcMain.handle(IPC.prefsGet, () => getPrefs())
  ipcMain.on(IPC.prefsSet, (_e, patch: Partial<Prefs>) => setPrefs(patch))
  onPrefsChange((p) => {
    broadcastToAll(IPC.prefsChanged, p)
    timer.syncPrefs()
    applyAlwaysOnTop(p.alwaysTop)
  })

  // Tasks (MO-6 / MO-7)
  ipcMain.handle(IPC.tasksGet, () => getTasks())
  ipcMain.on(IPC.tasksMutate, (_e, m: TaskMutation) => {
    applyMutation(m)
    // Keep timer's task string in sync with the active task title.
    timer.action({ type: 'setTask', task: activeTaskTitle() })
  })
  onTasksChange((s) => {
    broadcastToAll(IPC.tasksChanged, s)
    const active = s.tasks.find((t) => t.id === s.activeTaskId)
    timer.action({ type: 'setTask', task: active?.title ?? '' })
  })
  // Seed the timer with the persisted active task on startup.
  timer.action({ type: 'setTask', task: activeTaskTitle() })

  // When a focus block completes, bump both counters.
  timer.onFocusComplete(recordFocusComplete)

  // Island window
  ipcMain.on(IPC.islandResize, (_e, size: IslandSize) => resizeIsland(size))
  ipcMain.handle(IPC.islandGetPlacement, () => getPlacement())
  ipcMain.on(IPC.islandDragStart, (_e, x: number, y: number) => dragStart(x, y))
  ipcMain.on(IPC.islandDragMove, (_e, x: number, y: number) => dragMove(x, y))
  ipcMain.on(IPC.islandDragEnd, () => dragEnd())

  // Windows
  ipcMain.on(IPC.openSettings, () => createSettingsWindow())
  ipcMain.on(IPC.settingsControl, (_e, action: SettingsControl) => {
    const win = getSettingsWindow()
    if (!win) return
    switch (action) {
      case 'close':
        return win.close()
      case 'minimize':
        return win.minimize()
      case 'zoom':
        return win.isMaximized() ? win.unmaximize() : win.maximize()
    }
  })
}
