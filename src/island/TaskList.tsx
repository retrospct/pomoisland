// Task list panel — one component, two homes (ticket 23).
//
// **Docked** it drops below the timer inside the island window, at a fixed width
// matched to the expanded card, with the rows in a short scroll area.
// **Detached** it fills its own window (see src/tasks/), the rows take all the
// height the user gives them, and its header doubles as the window's drag region
// since the window is frameless.
//
// v1 verbs: add / edit title / set estimate / mark done / delete / set active.
// Drag-reorder is a separate fast-follow issue.

import { useRef, useState, type CSSProperties } from 'react'
import { hexToRgba } from '@shared/accent'
import type { Task, TasksState } from '@shared/types'
import { ThumbtackGlyph } from './Glyphs'

const SANS = "'Inter', sans-serif"
const MONO = "'IBM Plex Mono', monospace"

/** Where this list is living. See Prefs.tasksDetached. */
export type TaskListMode = 'docked' | 'detached'

// A drag region swallows every pointer event over its rectangle, so each control
// inside the header has to opt back out explicitly — see the ticket-02 research
// note §2d. `user-select: none` is the documented companion (dragging otherwise
// fights text selection).
const drag = { WebkitAppRegion: 'drag', userSelect: 'none' } as CSSProperties
const noDrag = { WebkitAppRegion: 'no-drag' } as CSSProperties

interface TaskListProps {
  tasks: TasksState
  accent: string
  /** Panel width (px) — matched to the expanded timer body so their edges line up. */
  width?: number
  mode?: TaskListMode
  /** Docked only: move the list out into its own window. */
  onPopOut?: () => void
  /** Detached only: move the list back into the island. */
  onPopIn?: () => void
  /** Detached only: Prefs.tasksAlwaysOnTop — is the window pinned above other apps? */
  pinned?: boolean
  /** Detached only: flip the pin. */
  onTogglePin?: () => void
  /** Docked: dismiss the inline panel. Detached: close the window, which pops in. */
  onClose: () => void
}

export function TaskList({
  tasks,
  accent,
  width = 320,
  mode = 'docked',
  onPopOut,
  onPopIn,
  pinned = false,
  onTogglePin,
  onClose,
}: TaskListProps) {
  const detached = mode === 'detached'
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
        // Detached: fill the window and let the rows absorb the spare height.
        // Docked: a fixed-width slab hanging off the bottom of the island card.
        width: detached ? '100%' : width,
        height: detached ? '100%' : undefined,
        display: detached ? 'flex' : undefined,
        flexDirection: detached ? 'column' : undefined,
        // Anchors the corner grip, which is absolutely positioned in the
        // bottom-right of the window rather than laid out in the column.
        position: detached ? 'relative' : undefined,
        boxSizing: 'border-box',
        background: 'var(--il-bg)',
        color: 'var(--il-text)',
        fontFamily: SANS,
        borderTop: detached ? undefined : '1px solid var(--il-border)',
        borderRadius: detached ? undefined : '0 0 26px 26px',
        paddingBottom: 16,
      }}
      onClick={stopProp}
      onMouseDown={stopProp}
    >
      {/* Header — title left, controls right.
          Docked: pop out, then close. Detached: pop in, pin, close, close
          outermost; and the whole strip is the frameless window's drag region.
          Its vertical footprint is unchanged from before the controls were
          added, so the docked panel's height budget inside the island is
          untouched — same padding, same single line of 15px-tall glyphs as the
          existing 12px MONO title.
          Inset 6px from the window edges when detached: AppKit owns the resize
          band and its width is private/unknowable on a non-MAS build, so keep
          the drag rectangle clear of it (ticket-02 research §2a). */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: detached ? 0 : undefined,
          ...(detached
            ? // 6 margin + 7 padding = the docked 13px above the title, and
              // 6 + 18 = its 24px inset, so the header reads identically in
              // both homes while the drag rect keeps clear of the resize band.
              { margin: '6px 6px 0', padding: '7px 18px 9px', ...drag }
            : { padding: '13px 24px 9px' }),
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {detached ? (
            <>
              <button
                aria-label="Pop task list back into the timer"
                title="Pop in"
                onClick={(e) => { e.stopPropagation(); onPopIn?.() }}
                style={{ ...headerBtn, ...noDrag }}
              >
                <PopInGlyph />
              </button>
              <PinButton pinned={pinned} accent={accent} onToggle={() => onTogglePin?.()} />
            </>
          ) : (
            <button
              aria-label="Pop task list out into its own window"
              title="Pop out"
              onClick={(e) => { e.stopPropagation(); onPopOut?.() }}
              style={headerBtn}
            >
              <PopOutGlyph />
            </button>
          )}
          <button
            aria-label={detached ? 'Close task window' : 'Close task list'}
            title="Close"
            onClick={(e) => { e.stopPropagation(); onClose() }}
            style={{ ...headerBtn, fontSize: 13, ...(detached ? noDrag : null) }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Task rows */}
      {/* Rows. Detached, the scroll box is inset 8px on both sides: its 6px
          scrollbar would otherwise sit flush against the window's right edge,
          inside AppKit's resize band, and that band's true width is private on a
          non-MAS build (ticket-02 research §2a) — so the same ~8px clearance the
          header's drag region keeps, for the same reason. Symmetric so the rows
          stay centered, and it brings their inset closer to the add form's.
          Docked, the panel has a border and no resize band, so it is unchanged. */}
      <div
        className="il-task-scroll"
        style={
          detached
            ? { flex: 1, minHeight: 0, overflowY: 'auto', margin: '0 8px' }
            : { maxHeight: 220, overflowY: 'auto' }
        }
      >
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
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          padding: '9px 20px 0',
          flexShrink: detached ? 0 : undefined,
        }}
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

      {detached && <ResizeGrip />}
    </div>
  )
}

// ---- Header controls ----

/**
 * Pop out — a card lifting away from a frame, with the arrow leaving toward the
 * top-right. Reads as "this moves somewhere else", not "open a link".
 */
function PopOutGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M6 2.5H2.5v9h9V8"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 2.5h3v3M11.5 2.5 7 7"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Pop in — the same frame, arrow travelling back into it. */
function PopInGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M6 2.5H2.5v9h9V8"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 7h3.5v3.5M11 11 7 7"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Pin — always-on-top for the detached window, and nothing else.
 *
 * Reuses the shipped idiom rather than inventing a second one: the same
 * thumbtack the ⋯ dropdown's row draws (one shared glyph, see Glyphs.tsx) and
 * the same "Always on Top" wording the dropdown and the tray both use. The label
 * stays put across states — `aria-pressed` carries on vs off, which is the
 * standard toggle-button contract and the closest thing outside a menu to the
 * dropdown's `menuitemcheckbox` + `aria-checked`.
 *
 * On vs off is drawn on TWO channels, because the app has no icon-toggle
 * precedent to lean on and this is a 14px mark with no room for a label:
 *
 *   1. **Color.** The glyph takes the accent when pinned, `--il-muted` when not
 *      — the same "accent means on" the dropdown's check mark uses.
 *   2. **A filled chip behind it.** Color alone is a weak signal at this size
 *      and fails outright for a color-blind user, so "on" also grows a tinted
 *      rounded background. The button reads visibly pressed, matching
 *      `aria-pressed`, and the state survives with color ignored entirely.
 *
 * Sized to land at 20px overall (14px glyph + 3px padding), which is exactly the
 * slot ticket 23 reserved — adding it reflows nothing.
 */
function PinButton({
  pinned,
  accent,
  onToggle,
}: {
  pinned: boolean
  accent: string
  onToggle: () => void
}) {
  return (
    <button
      aria-label="Always on Top"
      aria-pressed={pinned}
      title="Always on Top"
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      style={{
        ...headerBtn,
        ...noDrag,
        padding: 3,
        borderRadius: 7,
        background: pinned ? hexToRgba(accent, 0.18) : 'transparent',
        transition: 'background .14s',
      }}
    >
      <ThumbtackGlyph size={14} color={pinned ? accent : 'var(--il-muted)'} />
    </button>
  )
}

/**
 * Corner grip — decoration, not a handle.
 *
 * On macOS the resize interaction belongs entirely to AppKit: the window is
 * `resizable: true`, which becomes NSWindowStyleMaskResizable, and Electron's
 * cross-platform frameless resize hit-testing is compiled out of macOS builds
 * (`#if !BUILDFLAG(IS_MAC)`), so there is no hit region for the renderer to
 * claim and no API to widen it. `NSWindow.showsResizeIndicator` is documented as
 * doing nothing at all, so macOS draws no grow box for any window either — hence
 * a hand-drawn glyph.
 *
 * `pointer-events: none` is therefore mandatory, not tidiness: the glyph's only
 * job is to sit inside AppKit's corner zone and say "drag here", and anything it
 * intercepted would be a mouse-down AppKit never sees. There are no handlers
 * here for the same reason, and the header's drag region stops 6px short of
 * every window edge so it cannot shadow the band either. The exact width of that
 * band is AppKit-private on a non-MAS build, so the glyph stays inside ~10px of
 * the corner where the zone is widest.
 */
function ResizeGrip() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden
      style={{
        position: 'absolute',
        right: 3,
        bottom: 3,
        pointerEvents: 'none',
        color: 'var(--il-muted)',
        opacity: 0.55,
      }}
    >
      <path
        d="M10.5 4.5 4.5 10.5M10.5 8.2 8.2 10.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  )
}

const headerBtn: CSSProperties = {
  flexShrink: 0,
  background: 'transparent',
  border: 'none',
  color: 'var(--il-muted)',
  cursor: 'pointer',
  padding: '2px 2px',
  lineHeight: 1,
  display: 'grid',
  placeItems: 'center',
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
