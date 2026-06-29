// Task list panel — drops below the timer in the island (MO-6).
// v1 verbs: add / edit title / set estimate / mark done / delete / set active.
// Drag-reorder is a separate fast-follow issue.

import { useRef, useState } from 'react'
import { hexToRgba } from '@shared/accent'
import type { Task, TasksState } from '@shared/types'

const SANS = "'Inter', sans-serif"
const MONO = "'IBM Plex Mono', monospace"
const TEXT = '#F2F1EC'
const MUTED = 'rgba(242,241,236,0.45)'
const BORDER = 'rgba(242,241,236,0.1)'
const ACTIVE_BG = 'rgba(242,241,236,0.07)'
const HOVER_BG = 'rgba(242,241,236,0.04)'

interface TaskListProps {
  tasks: TasksState
  accent: string
  onClose: () => void
}

export function TaskList({ tasks, accent, onClose }: TaskListProps) {
  const [addText, setAddText] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function mutate(m: Parameters<typeof window.api.tasks.mutate>[0]) {
    window.api.tasks.mutate(m)
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const title = addText.trim()
    if (!title) return
    mutate({ type: 'add', title })
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
      style={{
        width: 320,
        boxSizing: 'border-box',
        background: '#17191D',
        color: TEXT,
        fontFamily: SANS,
        borderTop: `1px solid ${BORDER}`,
        borderRadius: '0 0 26px 26px',
        paddingBottom: 12,
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
          padding: '12px 20px 8px',
        }}
      >
        <span
          style={{
            fontFamily: MONO,
            fontSize: 9,
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
            color: MUTED,
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
      <div style={{ maxHeight: 220, overflowY: 'auto' }}>
        {active.length === 0 && done.length === 0 && (
          <p
            style={{
              margin: '0 20px 12px',
              fontSize: 12,
              color: MUTED,
              fontStyle: 'italic',
            }}
          >
            No tasks yet — add one below.
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
            onSetActive={() => mutate({ type: 'setActive', id: task.id })}
            onToggleDone={() => mutate({ type: 'update', id: task.id, patch: { done: true } })}
            onDelete={() => mutate({ type: 'delete', id: task.id })}
            onAdjustEstimate={(d) =>
              mutate({
                type: 'update',
                id: task.id,
                patch: { estimatePomodoros: Math.max(1, task.estimatePomodoros + d) },
              })
            }
          />
        ))}

        {done.length > 0 && (
          <>
            <div style={{ height: 1, background: BORDER, margin: '4px 16px' }} />
            {done.map((task) => (
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
                onSetActive={() => {
                  mutate({ type: 'update', id: task.id, patch: { done: false } })
                  mutate({ type: 'setActive', id: task.id })
                }}
                onToggleDone={() =>
                  mutate({ type: 'update', id: task.id, patch: { done: false } })
                }
                onDelete={() => mutate({ type: 'delete', id: task.id })}
                onAdjustEstimate={(d) =>
                  mutate({
                    type: 'update',
                    id: task.id,
                    patch: { estimatePomodoros: Math.max(1, task.estimatePomodoros + d) },
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
        style={{ display: 'flex', gap: 8, padding: '8px 14px 0', alignItems: 'center' }}
      >
        <input
          ref={inputRef}
          value={addText}
          onChange={(e) => setAddText(e.target.value)}
          onKeyDown={stopProp}
          onClick={stopProp}
          placeholder="Add task…"
          style={{
            flex: 1,
            background: 'rgba(242,241,236,0.07)',
            border: `1px solid ${BORDER}`,
            borderRadius: 8,
            color: TEXT,
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
            background: addText.trim() ? accent : 'rgba(242,241,236,0.1)',
            border: 'none',
            borderRadius: 8,
            color: addText.trim() ? '#17191D' : MUTED,
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
  const isEditing = editId === task.id

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '5px 12px',
        margin: '1px 4px',
        borderRadius: 8,
        background: isActive ? ACTIVE_BG : hovered ? HOVER_BG : 'transparent',
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
          border: task.done ? 'none' : `1.5px solid ${isActive ? accent : MUTED}`,
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
              stroke="#17191D"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {/* Active pip */}
      {isActive && !task.done && (
        <span
          style={{
            flexShrink: 0,
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: accent,
            marginLeft: -4,
          }}
        />
      )}

      {/* Title */}
      <div style={{ flex: 1, minWidth: 0 }}>
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
              color: TEXT,
              fontFamily: SANS,
              fontSize: 12.5,
              padding: '2px 6px',
              outline: 'none',
              caretColor: accent,
            }}
          />
        ) : (
          <span
            title={task.title}
            onDoubleClick={(e) => { e.stopPropagation(); onStartEdit(task) }}
            style={{
              display: 'block',
              fontSize: 12.5,
              color: task.done ? MUTED : TEXT,
              textDecoration: task.done ? 'line-through' : 'none',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              letterSpacing: '-0.005em',
            }}
          >
            {task.title}
          </span>
        )}
      </div>

      {/* Estimate pips + ±buttons (on hover or active) */}
      {(hovered || isActive) && !task.done && (
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <Pips
            completed={task.completedPomodoros}
            estimate={task.estimatePomodoros}
            accent={accent}
          />
          <button
            aria-label="Fewer sessions"
            onClick={(e) => { e.stopPropagation(); onAdjustEstimate(-1) }}
            style={pipBtn}
          >
            −
          </button>
          <button
            aria-label="More sessions"
            onClick={(e) => { e.stopPropagation(); onAdjustEstimate(1) }}
            style={pipBtn}
          >
            +
          </button>
        </div>
      )}

      {/* Delete (on hover) */}
      {hovered && (
        <button
          aria-label="Delete task"
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          style={{
            flexShrink: 0,
            background: 'transparent',
            border: 'none',
            color: 'rgba(242,241,236,0.28)',
            cursor: 'pointer',
            padding: '2px 2px',
            fontSize: 11,
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      )}
    </div>
  )
}

function Pips({
  completed,
  estimate,
  accent,
}: {
  completed: number
  estimate: number
  accent: string
}) {
  const total = Math.min(Math.max(estimate, completed), 8)
  const inactive = hexToRgba(accent, 0.28)
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: i < completed ? accent : inactive,
            flexShrink: 0,
          }}
        />
      ))}
    </div>
  )
}

const pipBtn: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid rgba(242,241,236,0.18)',
  borderRadius: 4,
  color: MUTED,
  cursor: 'pointer',
  width: 16,
  height: 16,
  fontSize: 12,
  lineHeight: 1,
  display: 'grid',
  placeItems: 'center',
  padding: 0,
}
