// Task list panel — drops below the timer in the island (MO-6).
// v1 verbs: add / edit title / set estimate / mark done / delete / set active.
// Drag-reorder is a separate fast-follow issue.

import { useRef, useState } from 'react'
import type { Task, TasksState } from '@shared/types'

const SANS = "'Inter', sans-serif"
const MONO = "'IBM Plex Mono', monospace"

interface TaskListProps {
  tasks: TasksState
  accent: string
  /** Panel width (px) — matched to the expanded timer body so their edges line up. */
  width?: number
  onClose: () => void
}

export function TaskList({ tasks, accent, width = 320, onClose }: TaskListProps) {
  const [addText, setAddText] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [showCompleted, setShowCompleted] = useState(false)
  // Session estimate for the next task; seeded from the persisted default (the
  // last value used) and kept as the running default within the session (MO-53).
  const [addEstimate, setAddEstimate] = useState(() => tasks.defaultEstimate ?? 1)
  const inputRef = useRef<HTMLInputElement>(null)

  function mutate(m: Parameters<typeof window.api.tasks.mutate>[0]) {
    window.api.tasks.mutate(m)
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const title = addText.trim()
    if (!title) return
    mutate({ type: 'add', title, estimate: addEstimate })
    setAddText('')
  }

  function startEdit(task: Task) {
    setEditId(task.id)
    setEditText(task.title)
  }

  function commitEdit(id: string) {
    const title = editText.trim()
    if (title) mutate({ type: 'update', id, patch: { title } })
    setEditId(null)
  }

  function stopProp(e: React.MouseEvent | React.KeyboardEvent) {
    e.stopPropagation()
  }

  const active = tasks.tasks.filter((t) => !t.done)
  const done = tasks.tasks.filter((t) => t.done)

  return (
    <div
      data-hover-target="1"
      style={{
        width,
        boxSizing: 'border-box',
        background: 'var(--il-bg)',
        color: 'var(--il-text)',
        fontFamily: SANS,
        borderTop: '1px solid var(--il-border)',
        borderRadius: '0 0 26px 26px',
        paddingBottom: 16,
      }}
      onClick={stopProp}
      onMouseDown={stopProp}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '13px 24px 9px',
        }}
      >
        <span
          style={{
            fontFamily: MONO,
            fontSize: 12,
            letterSpacing: '0.16em',
            color: accent,
            fontWeight: 500,
          }}
        >
          TASKS
        </span>
        <button
          aria-label="Close task list"
          onClick={(e) => { e.stopPropagation(); onClose() }}
          style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--il-muted)',
          cursor: 'pointer',
          padding: '2px 2px',
          fontSize: 13,
          lineHeight: 1,
          display: 'grid',
          placeItems: 'center',
        }}
        >
          ✕
        </button>
      </div>

      {/* Task rows */}
      <div className="il-task-scroll" style={{ maxHeight: 220, overflowY: 'auto' }}>
        {active.length === 0 && done.length === 0 && (
          <p
            style={{
              margin: '0 20px 12px',
              fontSize: 12,
              color: 'var(--il-muted)',
              fontStyle: 'italic',
            }}
          >
            No tasks yet. Add one below.
          </p>
        )}

        {active.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            isActive={task.id === tasks.activeTaskId}
            accent={accent}
            editId={editId}
            editText={editText}
            onEditTextChange={setEditText}
            onStartEdit={startEdit}
            onCommitEdit={commitEdit}
            // Clicking the row you are already on deselects it — the only way to
            // say "I'm not working on anything". The timer runs on regardless;
            // that session simply credits no task.
            onSetActive={() =>
              mutate({ type: 'setActive', id: task.id === tasks.activeTaskId ? null : task.id })
            }
            onToggleDone={() => mutate({ type: 'update', id: task.id, patch: { done: true } })}
            onDelete={() => mutate({ type: 'delete', id: task.id })}
            onAdjustEstimate={(d) =>
              mutate({
                type: 'update',
                id: task.id,
                patch: { estimateSessions: Math.max(1, task.estimateSessions + d) },
              })
            }
          />
        ))}

        {done.length > 0 && (
          <>
            <div style={{ height: 1, background: 'var(--il-border)', margin: '4px 20px' }} />
            <div style={{ display: 'flex', alignItems: 'center', margin: '1px 4px' }}>
              <button
                className="il-completed-toggle"
                aria-expanded={showCompleted}
                onClick={(e) => { e.stopPropagation(); setShowCompleted((v) => !v) }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  flex: 1,
                  padding: '5px 12px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 8,
                  color: 'var(--il-muted)',
                  fontFamily: SANS,
                  fontSize: 12,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <svg
                  className="il-completed-chevron"
                  width="10"
                  height="10"
                  viewBox="0 0 12 12"
                  fill="none"
                  style={{ transform: showCompleted ? 'rotate(90deg)' : 'none', flexShrink: 0 }}
                >
                  <path
                    d="M4.5 3L8 6.5L4.5 10"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {showCompleted ? 'Hide completed' : `Show completed (${done.length})`}
              </button>
              <button
                className="il-completed-clear"
                aria-label="Clear all completed tasks"
                onClick={(e) => { e.stopPropagation(); mutate({ type: 'clearCompleted' }) }}
                style={{
                  flexShrink: 0,
                  padding: '5px 12px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 8,
                  color: 'var(--il-muted)',
                  fontFamily: SANS,
                  fontSize: 11.5,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Clear
              </button>
            </div>
            {showCompleted && done.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                isActive={false}
                accent={accent}
                editId={editId}
                editText={editText}
                onEditTextChange={setEditText}
                onStartEdit={startEdit}
                onCommitEdit={commitEdit}
                // Completed rows render isActive={false} always, so their click
                // can never mean deselect. It means "pick this up again", which
                // setActive does in one mutation: activating a completed task
                // un-completes it, with no intermediate state to draw.
                onSetActive={() => mutate({ type: 'setActive', id: task.id })}
                onToggleDone={() =>
                  mutate({ type: 'update', id: task.id, patch: { done: false } })
                }
                onDelete={() => mutate({ type: 'delete', id: task.id })}
                onAdjustEstimate={(d) =>
                  mutate({
                    type: 'update',
                    id: task.id,
                    patch: { estimateSessions: Math.max(1, task.estimateSessions + d) },
                  })
                }
              />
            ))}
          </>
        )}
      </div>

      {/* Add task */}
      <form
        onSubmit={handleAdd}
        style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '9px 20px 0' }}
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            ref={inputRef}
            value={addText}
            onChange={(e) => setAddText(e.target.value)}
            onKeyDown={stopProp}
            onClick={stopProp}
            placeholder="Add task…"
            style={{
              flex: 1,
              background: 'transparent',
              border: '1px solid var(--il-border)',
              borderRadius: 8,
              color: 'var(--il-text)',
              fontFamily: SANS,
              fontSize: 12.5,
              padding: '7px 10px',
              outline: 'none',
              caretColor: accent,
            }}
          />
          <button
            type="submit"
            disabled={!addText.trim()}
            aria-label="Add task"
            style={{
              flexShrink: 0,
              width: 30,
              height: 30,
              background: addText.trim() ? accent : 'var(--il-track)',
              border: 'none',
              borderRadius: 8,
              color: addText.trim() ? 'var(--il-bg)' : 'var(--il-muted)',
              fontFamily: SANS,
              fontSize: 20,
              cursor: addText.trim() ? 'pointer' : 'default',
              display: 'grid',
              placeItems: 'center',
              lineHeight: 1,
              transition: 'background .15s, color .15s',
            }}
          >
            +
          </button>
        </div>
        {/* Session picker for the task about to be added — only while typing. */}
        {addText.trim() && (
          <SessionStepper
            estimate={addEstimate}
            accent={accent}
            onDec={() => setAddEstimate((n) => Math.max(1, n - 1))}
            onInc={() => setAddEstimate((n) => n + 1)}
          />
        )}
      </form>
    </div>
  )
}

// ---- TaskRow ----

interface TaskRowProps {
  task: Task
  isActive: boolean
  accent: string
  editId: string | null
  editText: string
  onEditTextChange: (t: string) => void
  onStartEdit: (task: Task) => void
  onCommitEdit: (id: string) => void
  onSetActive: () => void
  onToggleDone: () => void
  onDelete: () => void
  onAdjustEstimate: (delta: number) => void
}

function TaskRow({
  task,
  isActive,
  accent,
  editId,
  editText,
  onEditTextChange,
  onStartEdit,
  onCommitEdit,
  onSetActive,
  onToggleDone,
  onDelete,
  onAdjustEstimate,
}: TaskRowProps) {
  const [hovered, setHovered] = useState(false)
  // Reveal the − / + estimate steppers on row hover, or persistently once the
  // user clicks the session count to edit it.
  const [sessionsOpen, setSessionsOpen] = useState(false)
  const isEditing = editId === task.id

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '5px 12px',
        margin: '1px 4px',
        borderRadius: 8,
        background: hovered ? 'var(--il-line)' : 'transparent',
        transition: 'background .12s',
        cursor: 'pointer',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onSetActive}
    >
      {/* Checkbox */}
      <button
        aria-label={task.done ? 'Mark undone' : 'Mark done'}
        onClick={(e) => { e.stopPropagation(); onToggleDone() }}
        style={{
          flexShrink: 0,
          width: 15,
          height: 15,
          borderRadius: 4,
          border: task.done ? 'none' : `1.5px solid ${isActive ? accent : 'var(--il-muted)'}`,
          background: task.done ? accent : 'transparent',
          display: 'grid',
          placeItems: 'center',
          cursor: 'pointer',
          padding: 0,
          transition: 'all .14s',
        }}
      >
        {task.done && (
          <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
            <path
              d="M1 3.5L3.2 6L8 1"
              stroke="var(--il-bg)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {/* Title + edit pencil grouped so the pencil sits just after the title text */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          minWidth: 0,
          flex: isEditing ? 1 : '0 1 auto',
        }}
      >
        {isEditing ? (
          <input
            value={editText}
            autoFocus
            onChange={(e) => onEditTextChange(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              e.stopPropagation()
              if (e.key === 'Enter' || e.key === 'Escape') onCommitEdit(task.id)
            }}
            onBlur={() => onCommitEdit(task.id)}
            style={{
              width: '100%',
              background: 'transparent',
              border: `1px solid ${accent}`,
              borderRadius: 4,
              color: 'var(--il-text)',
              fontFamily: SANS,
              fontSize: 12.5,
              padding: '2px 6px',
              outline: 'none',
              caretColor: accent,
            }}
          />
        ) : (
          <>
            <span
              title={task.title}
              style={{
                minWidth: 0,
                fontSize: 12.5,
                color: task.done ? 'var(--il-muted)' : isActive ? accent : 'var(--il-text)',
                fontWeight: isActive && !task.done ? 500 : 'normal',
                textDecoration: task.done ? 'line-through' : 'none',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                letterSpacing: '-0.005em',
              }}
            >
              {task.title}
            </span>
            <button
              aria-label="Edit task title"
              onClick={(e) => { e.stopPropagation(); onStartEdit(task) }}
              style={iconActionBtn}
            >
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path
                  d="M8.5 1.5L10.5 3.5L4 10L1 11L2 8L8.5 1.5Z"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Spacer pushes the session controls + delete to the right */}
      {!isEditing && <div style={{ flex: 1 }} />}

      {/* Session count: interactive − / + stepper for active tasks, read-only
          "c/e sessions" for done tasks. Fixed-ish width keeps rows aligned. */}
      {!isEditing &&
        (task.done ? (
          <SessionCount
            completed={task.completedSessions}
            estimate={task.estimateSessions}
            accent={accent}
          />
        ) : (
          <SessionStepper
            completed={task.completedSessions}
            estimate={task.estimateSessions}
            accent={accent}
            onDec={() => onAdjustEstimate(-1)}
            onInc={() => onAdjustEstimate(1)}
            buttonsVisible={hovered || sessionsOpen}
            onCountClick={(e) => { e.stopPropagation(); setSessionsOpen((v) => !v) }}
          />
        ))}

      {/* Delete */}
      <button
        aria-label="Delete task"
        onClick={(e) => { e.stopPropagation(); onDelete() }}
        style={{ ...iconActionBtn, color: '#ff6b6b' }}
      >
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <path d="M2 3h8M5 3V2h2v1M4.5 3v6.5h3V3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  )
}

/**
 * "N sessions" (add form — just the estimate) or "C/E sessions" (task rows —
 * completed/estimate). The leading number is the theme accent; "session(s)" is
 * smaller and faded as secondary info. Singular when the estimate is 1.
 */
function SessionCount({
  completed,
  estimate,
  accent,
}: {
  /** When provided, renders "completed/estimate"; otherwise just the estimate. */
  completed?: number
  estimate: number
  accent: string
}) {
  const label = estimate === 1 ? 'session' : 'sessions'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 3, whiteSpace: 'nowrap' }}>
      <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, color: accent, lineHeight: 1 }}>
        {completed ?? estimate}
      </span>
      {completed !== undefined && (
        <span style={{ fontFamily: MONO, fontSize: 12, color: 'var(--il-body)', lineHeight: 1 }}>
          /{estimate}
        </span>
      )}
      <span style={{ fontFamily: SANS, fontSize: 8.5, color: 'var(--il-muted)', lineHeight: 1 }}>
        {label}
      </span>
    </span>
  )
}

/**
 * SessionCount flanked by − / + estimate steppers. The buttons render only when
 * `buttonsVisible` is true (task rows reveal them on hover / on clicking the
 * count); the add form leaves them always visible.
 */
function SessionStepper({
  completed,
  estimate,
  accent,
  onDec,
  onInc,
  buttonsVisible = true,
  onCountClick,
}: {
  completed?: number
  estimate: number
  accent: string
  onDec: () => void
  onInc: () => void
  buttonsVisible?: boolean
  onCountClick?: (e: React.MouseEvent) => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
      {buttonsVisible && (
        <button
          type="button"
          aria-label="Fewer sessions"
          onClick={(e) => { e.stopPropagation(); onDec() }}
          style={pipBtn}
        >
          −
        </button>
      )}
      <span onClick={onCountClick} style={onCountClick ? { cursor: 'pointer' } : undefined}>
        <SessionCount completed={completed} estimate={estimate} accent={accent} />
      </span>
      {buttonsVisible && (
        <button
          type="button"
          aria-label="More sessions"
          onClick={(e) => { e.stopPropagation(); onInc() }}
          style={pipBtn}
        >
          +
        </button>
      )}
    </div>
  )
}

const pipBtn: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--il-border-btn)',
  borderRadius: 4,
  color: 'var(--il-muted)',
  cursor: 'pointer',
  width: 16,
  height: 16,
  fontSize: 12,
  lineHeight: 1,
  display: 'grid',
  placeItems: 'center',
  padding: 0,
  flexShrink: 0,
}

const iconActionBtn: React.CSSProperties = {
  flexShrink: 0,
  background: 'transparent',
  border: 'none',
  color: 'var(--il-muted)',
  cursor: 'pointer',
  padding: '1px 2px',
  fontSize: 11,
  lineHeight: 1,
  display: 'grid',
  placeItems: 'center',
}
