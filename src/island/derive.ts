// View-model derivation for the Island, ported from Island.dc.html renderVals.
import type { Prefs, TimerState } from '@shared/types'
import { fmtTime, frac as fracOf } from '@shared/format'
import { accentHex, hexToRgba, resolveAccent } from '@shared/accent'
import { ISLAND_NEUTRAL } from './palette'

export type Glyph = 'play' | 'pause' | 'check' | 'cup' | 'none'

export interface IslandView {
  accent: string
  accentBright: string
  accentSoft: string
  frac: number
  timeStr: string
  statusLabel: string
  glyph: Glyph
  micro: string
  displayTask: string
  taskColor: string
  isRunning: boolean
  isComplete: boolean
  isBreak: boolean
  dots: DotStyle[]
  showRing: boolean
  showTimeText: boolean
  /** Focus sessions completed today — drives the SessionDots hover reveal (MO-7). */
  completedToday: number
}

export interface DotStyle {
  size: number
  background: string
  boxShadow: string
}

export function deriveIsland(
  state: TimerState,
  prefs: Prefs,
  resolvedTheme: 'light' | 'dark' = 'dark',
  completedToday = 0,
): IslandView {
  const { status, mode, total, remaining, sessionIndex, sessionTotal } = state
  const isBreak = mode === 'break'
  const isRunning = status === 'running'
  const isPaused = status === 'paused'
  const isIdle = status === 'idle'
  const isComplete = status === 'complete'

  const { accent, accentBright, accentSoft } = resolveAccent({
    base: accentHex(prefs.accent),
    mode,
    status,
    remaining,
  })

  const frac = fracOf(total, remaining)
  const timeStr = fmtTime(remaining)

  const statusLabel = isComplete
    ? isBreak
      ? 'BREAK DONE'
      : 'FOCUS DONE'
    : isBreak
      ? 'BREAK'
      : isPaused
        ? 'PAUSED'
        : isIdle
          ? 'READY'
          : 'FOCUS'

  const glyph: Glyph = isComplete
    ? 'check'
    : isPaused
      ? 'pause'
      : isIdle
        ? 'play'
        : isBreak
          ? 'cup'
          : 'none'

  let micro: string
  if (isIdle) micro = isBreak ? 'Step away for a bit.' : 'Ready when you are.'
  else if (isPaused) micro = 'Paused \u2014 pick it back up.'
  else if (isComplete) micro = isBreak ? 'Break\u2019s over. Back to it?' : 'Nice work. Take a breather.'
  else if (isBreak) micro = 'Breathe. Look away from the screen.'
  else if (frac < 0.45) micro = 'Settle in.'
  else if (frac < 0.85) micro = 'Nice, past the halfway mark.'
  else micro = 'Almost there \u2014 hold the line.'

  const rawTask = (state.task ?? '').trim()
  const hasTask = rawTask.length > 0
  const displayTask = hasTask ? rawTask : isBreak ? 'Break time' : 'No task set'
  const n = ISLAND_NEUTRAL[resolvedTheme]
  const taskColor = hasTask ? n.taskColor : n.taskDim

  const dots: DotStyle[] = []
  const count = prefs.showDots ? sessionTotal : 0
  for (let i = 0; i < count; i++) {
    const done = i < sessionIndex || (i === sessionIndex && isComplete)
    const current = i === sessionIndex && !isComplete
    dots.push({
      size: current ? 8 : 7,
      background: done || current ? accent : n.dotInactive,
      boxShadow: current ? `0 0 0 3px ${hexToRgba(accent, 0.18)}` : 'none',
    })
  }

  return {
    accent,
    accentBright,
    accentSoft,
    frac,
    timeStr,
    statusLabel,
    glyph,
    micro,
    displayTask,
    taskColor,
    isRunning,
    isComplete,
    isBreak,
    dots,
    showRing: prefs.layout !== 'minimal',
    showTimeText: prefs.layout !== 'compact',
    completedToday,
  }
}
