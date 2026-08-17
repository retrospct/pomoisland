// Task list panel — one component, two homes (ticket 23).
//
// **Docked** it drops below the timer inside the island window, at a fixed width
// matched to the expanded card, with the rows in a short scroll area.
// **Detached** it fills its own window (see src/tasks/), the rows take all the
// height the user gives them, and its header doubles as the window's drag region
// since the window is frameless.
//
// Verbs: add / edit title / set estimate / mark done / delete / set active /
// reorder by dragging the leading grip.

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { hexToRgba } from '@shared/accent'
import type { Task, TasksState } from '@shared/types'
import { ThumbtackGlyph } from './Glyphs'

const SANS = "'Inter', sans-serif"
const MONO = "'IBM Plex Mono', monospace"

/**
 * Hover-to-popover delay for a truncated task title (ticket 21).
 *
 * Long enough that dragging the pointer down a list of ten rows doesn't flash ten
 * popovers on the way past, short enough to feel like a property of the title
 * rather than a thing you wait for. Deliberately quicker than the ~1s the OS
 * gives a native tooltip: this one is reading assistance for text the row could
 * not fit, not supplementary help.
 */
const TITLE_POPOVER_DELAY_MS = 400

/**
 * Hover delay for the header control labels. Shorter than the title popover's 400ms:
 * these are three fixed controls a user is deliberately pointing at to find out what
 * they do, not text encountered while scanning a list.
 */
const HEADER_TIP_DELAY_MS = 250

/**
 * Which incomplete row the pointer is currently above, as the id to drop *before*,
 * or null for "past them all" — the argument shape `reorder` takes (ticket 22).
 *
 * Reads the live row rects on every move instead of measuring the list once at
 * drag start. Rows are a fixed height today so a cached table would work, but it
 * would silently rot the moment a row wraps or the detached window is resized
 * mid-drag, and this is a handful of rects on a list capped by a scroll viewport.
 *
 * Hand-rolled, no drag-and-drop library — the app has no runtime dependencies and
 * this is the whole reason that is affordable.
 *
 * **No drag auto-scroll**, deliberately. Docked, the scroll area is 220px — about
 * eight rows — and detached it is however tall the user made the window, which is
 * usually the whole list. So the drags that would need it are the ones crossing
 * more than a screenful, on a list long enough that dragging is the wrong tool for
 * moving something that far. Add it when a real list makes it necessary; guessing
 * at an edge-proximity scroll rate now is how drags end up feeling twitchy.
 */
function dropTargetAt(clientY: number, from: HTMLElement): string | null {
  const scroller = from.closest('.il-task-scroll')
  if (!scroller) return null
  for (const row of scroller.querySelectorAll<HTMLElement>('[data-drag-row]')) {
    const r = row.getBoundingClientRect()
    // The midpoint is the flip line: above it the dragged task lands before this
    // row, below it we keep looking. Using the midpoint rather than an edge is
    // what makes the indicator track the pointer without hysteresis.
    if (clientY < r.top + r.height / 2) return row.dataset.dragRow ?? null
  }
  return null
}

/** An in-flight reorder: the task being dragged, and where it would land. */
interface ReorderDrag {
  id: string
  /** Id to drop before, or null for last among the incomplete tasks. */
  beforeId: string | null
}

/**
 * Would this drop actually move the task? Used both to skip a pointless write and
 * to decide whether to draw the landing line at all — a line promising a move that
 * won't happen is worse than no line.
 *
 * `incomplete` is the rendered incomplete group, in render order.
 */
function isRealMove(incomplete: Task[], drag: ReorderDrag): boolean {
  const from = incomplete.findIndex((t) => t.id === drag.id)
  if (from === -1) return false
  const to =
    drag.beforeId === null
      ? incomplete.length
      : incomplete.findIndex((t) => t.id === drag.beforeId)
  if (to === -1) return false
  // Landing on your own index, or on the one just after it, both leave the order
  // unchanged: "before the task that already follows me" is where I already am.
  return to !== from && to !== from + 1
}

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
  // In-flight drag (ticket 22): which task is moving, and where it would land.
  // `beforeId` is the id to drop before, or null for last-among-incomplete —
  // exactly the reorder mutation's argument, so the commit is a pass-through and
  // there is no second representation of "where this lands" to keep in step.
  const [reorder, setReorder] = useState<{ id: string; beforeId: string | null } | null>(null)

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

  /**
   * Commit the drag, unless it wouldn't move anything.
   *
   * The reducer already returns an unchanged state for a no-op drop, but taskStore
   * persists and broadcasts on *every* mutation regardless, so letting one through
   * writes the file and wakes every renderer to announce that nothing happened.
   *
   * Two arrangements are no-ops, and only one of them is obvious. Dropping a task
   * on itself is `beforeId === id`. But dropping it immediately *before the row
   * that already follows it* is the same position with a different id, so an
   * id-only check misses it — which is precisely the seam the id-based interface
   * trades for not carrying indices. Resolved by comparing positions in the
   * rendered incomplete list, which the view has to hand and the reducer does not.
   */
  function endReorder() {
    if (reorder && isRealMove(active, reorder)) {
      mutate({ type: 'reorder', id: reorder.id, beforeId: reorder.beforeId })
    }
    setReorder(null)
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
              <HeaderTip label="Pop back into the timer">
                <button
                  aria-label="Pop task list back into the timer"
                  onClick={(e) => { e.stopPropagation(); onPopIn?.() }}
                  style={{ ...headerBtn, ...noDrag }}
                >
                  <PopInGlyph />
                </button>
              </HeaderTip>
              <HeaderTip label="Keep above other windows">
                <PinButton pinned={pinned} accent={accent} onToggle={() => onTogglePin?.()} />
              </HeaderTip>
            </>
          ) : (
            <HeaderTip label="Pop out into its own window">
              <button
                aria-label="Pop task list out into its own window"
                onClick={(e) => { e.stopPropagation(); onPopOut?.() }}
                style={headerBtn}
              >
                <PopOutGlyph />
              </button>
            </HeaderTip>
          )}
          <HeaderTip label={detached ? 'Close window' : 'Close task list'}>
            <button
              aria-label={detached ? 'Close task window' : 'Close task list'}
              onClick={(e) => { e.stopPropagation(); onClose() }}
              style={{ ...headerBtn, fontSize: 13, ...(detached ? noDrag : null) }}
            >
              ✕
            </button>
          </HeaderTip>
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

        {active.map((task, i) => (
          <TaskRow
            key={task.id}
            task={task}
            isActive={task.id === tasks.activeTaskId}
            accent={accent}
            // Only the incomplete group is draggable. Dragging a task into the
            // completed group would mean "and also finish it", which is the
            // checkbox's job — the reducer refuses it too, so the rule holds even
            // if a future call site forgets.
            draggable
            dragging={reorder !== null}
            isDragSubject={reorder?.id === task.id}
            // Only drawn for a drop that would actually move something. That also
            // fixes a rendering bug rather than just a semantic one: the two no-op
            // arrangements are exactly the ones where the line lands on the dragged
            // row itself, and the dragged row is faded to 0.4 — so the line was
            // inheriting that fade through its parent and rendering half-visible.
            dropBefore={
              reorder !== null &&
              reorder.beforeId === task.id &&
              isRealMove(active, reorder)
            }
            // The landing line for "past every row" has nowhere of its own to
            // live, so the last row draws it below itself.
            dropAfter={
              reorder !== null &&
              reorder.beforeId === null &&
              i === active.length - 1 &&
              isRealMove(active, reorder)
            }
            onDragStart={() => setReorder({ id: task.id, beforeId: task.id })}
            onDragMove={(beforeId) =>
              setReorder((d) => (d && d.beforeId !== beforeId ? { ...d, beforeId } : d))
            }
            onDragEnd={endReorder}
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
 * Hover label for a header control. Hand-rolled, because the native `title` these
 * buttons used to carry never appeared in the detached window.
 *
 * The header is the frameless window's drag region (`-webkit-app-region: drag`),
 * and inside one macOS owns mouse tracking for the window drag. `no-drag` on each
 * button restores clicks, which is why they work, but it does not restore
 * Chromium's tooltip timer — that wants a sustained mouseover the OS is busy
 * interpreting as a possible window drag. So the attribute was present and correct
 * and silently did nothing.
 *
 * Opens DOWNWARD, the only direction with room: the header is the top edge of the
 * window. Right-aligned to the control, so a label wider than its 20px button
 * grows leftward into the panel instead of off the right edge, which is where all
 * of these live. `pointer-events: none` and `no-drag` keep it from extending either
 * the hover target or the drag rectangle.
 *
 * `aria-label` stays on the buttons and is not duplicated here: this is a visual
 * affordance, and the accessible name already exists.
 */
function HeaderTip({ label, children }: { label: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cancel = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current)
      timer.current = null
    }
    setShow(false)
  }, [])

  useEffect(() => cancel, [cancel])

  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', ...noDrag }}
      onMouseEnter={() => {
        if (timer.current !== null) clearTimeout(timer.current)
        timer.current = setTimeout(() => {
          timer.current = null
          setShow(true)
        }, HEADER_TIP_DELAY_MS)
      }}
      onMouseLeave={cancel}
    >
      {children}
      {show && (
        <span
          className="il-header-tip"
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 5,
            zIndex: 6,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            background: 'var(--il-bg-menu)',
            border: '1px solid var(--il-border)',
            borderRadius: 7,
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.3)',
            padding: '4px 7px',
            fontSize: 11,
            lineHeight: 1.2,
            color: 'var(--il-text)',
            ...noDrag,
          }}
        >
          {label}
        </span>
      )}
    </span>
  )
}


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

/**
 * THE ONE RULE for what a row shows at rest (ticket 20). Settled for the whole
 * set at once, because deciding it per control is how a row ends up with four
 * different rules and no way to place the fifth thing:
 *
 *   **A control is always visible if its appearance carries state. A control
 *   that is a pure verb is hover-revealed.**
 *
 * Always visible: the checkbox (its box IS done-or-not) and the session count
 * (`3/5` is the row's only readout, and a list is a comparison context — ticket
 * 03 kept the numeric count on rows for exactly this and sent the segmented bar
 * to the island instead).
 *
 * Hover-revealed: the pencil, the − / + estimate steppers, and delete. None of
 * them tell you anything when idle; they only offer to change something. Three
 * verbs at rest on every row is clutter that also crowds out the title.
 *
 * The checkbox is the case that proves the rule rather than the exception to it:
 * it is a control, but it is drawn as its own state, so hiding it would hide
 * information.
 *
 * Gestures stay unambiguous against ticket 15's row-click toggle because every
 * control here calls `stopPropagation` — the row's own click is the fallback for
 * "none of the above", and it means set-active / deselect.
 */
interface TaskRowProps {
  task: Task
  isActive: boolean
  accent: string
  /** Incomplete rows only: show the grip and take part in reordering. */
  draggable?: boolean
  /** Some row in the list is being dragged (not necessarily this one). */
  dragging?: boolean
  /** This is the row being dragged. */
  isDragSubject?: boolean
  /** Draw the landing line above this row. */
  dropBefore?: boolean
  /** Draw the landing line below this row — only ever the last incomplete one. */
  dropAfter?: boolean
  onDragStart?: () => void
  onDragMove?: (beforeId: string | null) => void
  onDragEnd?: () => void
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
  draggable = false,
  dragging = false,
  isDragSubject = false,
  dropBefore = false,
  dropAfter = false,
  onDragStart,
  onDragMove,
  onDragEnd,
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
  const isEditing = editId === task.id
  const titleRef = useRef<HTMLSpanElement>(null)
  const popTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // null = no popover. 'down' / 'up' is which way it opens, decided once when the
  // hover starts — see openTitlePopover.
  const [titlePop, setTitlePop] = useState<'down' | 'up' | null>(null)

  const cancelTitlePopover = useCallback(() => {
    if (popTimer.current !== null) {
      clearTimeout(popTimer.current)
      popTimer.current = null
    }
    setTitlePop(null)
  }, [])

  // A row unmounts while hovered on every delete, mark-done and clearCompleted,
  // and the pending timeout would fire into a dead component.
  useEffect(() => cancelTitlePopover, [cancelTitlePopover])

  // A drag starting cancels every row's popover, pending or open. The guard inside
  // openTitlePopover only runs when the timeout is SCHEDULED, so grabbing the grip
  // within the 400ms delay of having hovered a title would otherwise pop it in the
  // middle of the drag. Driving it from the flag rather than the schedule means the
  // rule is "no popovers during a drag" instead of "no popovers started during a
  // drag".
  useEffect(() => {
    if (dragging) cancelTitlePopover()
  }, [dragging, cancelTitlePopover])

  // Scrolling dismisses it. The popover is anchored to the row, so it does travel
  // correctly with a scroll — but the up/down direction was chosen once from the
  // row's position in the viewport, and scrolling is exactly what invalidates that
  // choice. Dismissing is also what the pointer is saying: a scroll is a move to
  // somewhere else in the list, not a request to keep reading this title.
  useEffect(() => {
    if (!titlePop) return
    const scroller = titleRef.current?.closest('.il-task-scroll')
    if (!scroller) return
    scroller.addEventListener('scroll', cancelTitlePopover, { passive: true })
    return () => scroller.removeEventListener('scroll', cancelTitlePopover)
  }, [titlePop, cancelTitlePopover])

  /**
   * Decide whether this title needs a popover, and which way it opens, by
   * measuring at the moment of hover (ticket 21).
   *
   * Measuring on hover rather than tracking truncation is the whole design.
   * Truncation is a function of the title, the row's width and the panel's width,
   * so anything that *stored* it would need invalidating when any of the three
   * changed — a ResizeObserver per row, on a list that already re-renders every
   * timer tick. Read at the point of use it cannot go stale: a renamed task, a
   * resized detached window and a re-render all produce a correct answer on the
   * next hover, with no subscription anywhere.
   */
  function openTitlePopover() {
    const el = titleRef.current
    if (!el) return
    // A drag sweeps the pointer across every title in the list. Pointer capture
    // keeps the *pointer* events on the grip, but mouseenter still fires on the
    // spans it passes over, so without this a reorder would trail popovers.
    if (dragging) return
    // The 1px slack is for sub-pixel layout: scrollWidth and clientWidth are
    // integers rounded from fractional widths, so an untruncated title can
    // measure 1px wider than its box and would otherwise pop for no reason.
    if (el.scrollWidth <= el.clientWidth + 1) return
    // Open upward from the lower half of the scroll viewport. The popover lives
    // inside that scroller (see the render below for why), so a downward one
    // anchored to the last visible row would be clipped by the very container
    // that makes it un-clippable everywhere else.
    let dir: 'down' | 'up' = 'down'
    const scroller = el.closest('.il-task-scroll')
    if (scroller) {
      const r = el.getBoundingClientRect()
      const s = scroller.getBoundingClientRect()
      dir = r.top - s.top > s.height / 2 ? 'up' : 'down'
    }
    if (popTimer.current !== null) clearTimeout(popTimer.current)
    popTimer.current = setTimeout(() => {
      popTimer.current = null
      setTitlePop(dir)
    }, TITLE_POPOVER_DELAY_MS)
  }

  return (
    <div
      className={`il-task-row${isDragSubject ? ' il-task-row-dragging' : ''}`}
      // Ticket 15's gesture, and the only place it is stated. It sits on the row
      // rather than the title so it is reachable over the title text too, which
      // is what the title's own `title={task.title}` used to block: a nested
      // native tooltip wins outright on hover, so the row's could never appear
      // where the pointer actually goes. That attribute is gone — the popover
      // below replaces it, and every control carries its own `title` so none of
      // them inherit this one and claim to deselect anything.
      //
      // Dropped while the truncation popover is up, so the two never stack. Ours
      // appears at 400ms and the OS waits about a second, so clearing the attribute
      // when the popover opens means the native one never gets to fire over a
      // truncated title — and on a title that fits, which is the case where "Click
      // to deselect" is the only thing worth saying, nothing changes.
      title={isActive && !task.done && !titlePop ? 'Click to deselect' : undefined}
      // The drop-target scan reads these off the DOM (see dropTargetAt) rather
      // than being handed a measured table at drag start.
      data-drag-row={draggable ? task.id : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '5px 12px',
        margin: '1px 4px',
        borderRadius: 8,
        cursor: 'pointer',
        // Anchors the truncation popover and the drop-indicator line.
        position: 'relative',
        // The row being dragged fades rather than moving: the list underneath
        // stays exactly where it was, so the indicator line is the only thing
        // claiming to know where the task lands. Neighbours shifting to open a gap
        // is explicitly out of scope for this ticket.
        opacity: isDragSubject ? 0.4 : 1,
      }}
      onClick={onSetActive}
    >
      {/* Completed rows are not draggable, so they hold the grip's column open with
          a spacer instead. Without it their checkboxes start 14px left of the
          incomplete rows' and the two groups read as two different lists — the same
          alignment argument as the session count's padding further down, at the
          other end of the row. */}
      {!draggable && <span aria-hidden style={{ width: GRIP_W, flexShrink: 0 }} />}

      {draggable && (
        <DragGrip
          onPointerDown={(e) => {
            // stopPropagation keeps the row's set-active click from firing;
            // preventDefault suppresses the compatibility mouse events (and the
            // text-selection drag) that would otherwise follow, which is the
            // other half of "pointer-down on the handle does not toggle the row".
            e.stopPropagation()
            e.preventDefault()
            e.currentTarget.setPointerCapture(e.pointerId)
            onDragStart?.()
          }}
          onPointerMove={(e) => {
            if (!isDragSubject) return
            onDragMove?.(dropTargetAt(e.clientY, e.currentTarget))
          }}
          // `lostpointercapture` is the ONLY commit path, deliberately. It is the
          // one signal that means "this drag is over however it ended": the
          // Pointer Events spec releases capture implicitly on pointerup and on
          // pointercancel, and dispatches this either way, so it also covers the
          // OS taking the pointer or the window losing focus mid-drag.
          //
          // Committing on pointerup as well was a double write. Calling
          // releasePointerCapture there fired this handler in the same tick, and
          // both reads of `isDragSubject` saw the pre-update closure, so the
          // reorder mutation went out twice — persisting and broadcasting to every
          // renderer twice for one gesture. Reorder happens to be idempotent, which
          // is exactly why it would never have shown up as a bug.
          onLostPointerCapture={() => {
            if (isDragSubject) onDragEnd?.()
          }}
        />
      )}

      {dropBefore && <DropLine accent={accent} edge="top" />}
      {dropAfter && <DropLine accent={accent} edge="bottom" />}

      {/* Checkbox */}
      <button
        aria-label={task.done ? 'Mark undone' : 'Mark done'}
        title={task.done ? 'Mark undone' : 'Mark done'}
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
              ref={titleRef}
              onMouseEnter={openTitlePopover}
              onMouseLeave={cancelTitlePopover}
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
              className="il-task-reveal"
              aria-label="Edit task title"
              title="Edit task title"
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

      {/* Session count: interactive − / + stepper for incomplete tasks, read-only
          "c/e sessions" for done ones — you do not re-estimate finished work.
          The done row pads by exactly the stepper's side width so both kinds of
          row put their count and delete button in the same column. Since ticket
          20 reserves the stepper's space permanently, that gap is now there at
          rest too, and without this the completed group's rows would sit 44px
          right of the incomplete ones the moment it is expanded. */}
      {!isEditing &&
        (task.done ? (
          <div style={{ margin: `0 ${STEPPER_SIDE_W}px`, flexShrink: 0 }}>
            <SessionCount
              completed={task.completedSessions}
              estimate={task.estimateSessions}
              accent={accent}
            />
          </div>
        ) : (
          <SessionStepper
            completed={task.completedSessions}
            estimate={task.estimateSessions}
            accent={accent}
            onDec={() => onAdjustEstimate(-1)}
            onInc={() => onAdjustEstimate(1)}
            reveal
          />
        ))}

      {/* Delete */}
      <button
        className="il-task-reveal"
        aria-label="Delete task"
        title="Delete task"
        onClick={(e) => { e.stopPropagation(); onDelete() }}
        style={{ ...iconActionBtn, color: '#ff6b6b' }}
      >
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <path d="M2 3h8M5 3V2h2v1M4.5 3v6.5h3V3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Truncation popover (ticket 21) — the full title, only when it doesn't fit.
          It renders INSIDE the row, spanning the row's content width and wrapping,
          which is the one geometry that cannot be clipped: the rows live in an
          `overflow-y: auto` scroller, so anything escaping the row's own box would
          be cut by it, and a content-sized island window offers nothing outside
          the panel to escape into either. Neither the dropdown's invisible-spacer
          trick nor growing the window is needed as a result.

          `pointer-events: none` makes it a readout and nothing else: it overlaps
          the row below, and without this it would steal that row's hover, its
          click, and this row's own mouseleave — leaving the popover stuck open. */}
      {titlePop && (
        <div
          className="il-task-title-pop"
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 12,
            right: 12,
            [titlePop === 'up' ? 'bottom' : 'top']: '100%',
            zIndex: 5,
            pointerEvents: 'none',
            background: 'var(--il-bg)',
            border: '1px solid var(--il-border)',
            borderRadius: 8,
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.28)',
            padding: '5px 8px',
            fontSize: 12.5,
            lineHeight: 1.35,
            letterSpacing: '-0.005em',
            color: 'var(--il-text)',
            // Three lines is enough for any title worth reading in a 320px panel
            // and keeps the box inside the scroll viewport in both directions.
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {task.title}
        </div>
      )}
    </div>
  )
}

/**
 * Reorder grip — six dots, the conventional mark, at the row's leading edge.
 *
 * **Hover-revealed**, which ticket 22 warned against on the grounds that revealing
 * something at the leading edge shifts the edge. Ticket 20 removed that: the
 * revealed set is opacity-only with its space reserved permanently, so the grip
 * occupies its column whether or not you can see it, and the checkbox does not
 * move when you hover. With that gone, the grip follows the same rule as every
 * other control on the row — a pure verb, so it fades in.
 *
 * `touchAction: none` is required, not decorative: without it the OS claims the
 * gesture for panning and the pointermove stream stops partway through a drag.
 */
function DragGrip(props: {
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void
  /** The single end-of-drag signal — see the call site for why there is no pointerup. */
  onLostPointerCapture: () => void
}) {
  return (
    <div
      className="il-task-reveal il-task-grip"
      title="Drag to reorder"
      // `aria-hidden`, and deliberately NOT role="button" with a label.
      //
      // Keyboard reorder and screen-reader drag announcements are both out of scope
      // for ticket 22, so a labelled button role would advertise focus and an Enter
      // action this element cannot honor — worse than being absent, because it
      // promises a way through that dead-ends. The mouse affordance (the grip mark,
      // the grab cursor, the native tooltip) is unaffected, and every actual verb on
      // the row stays reachable and labelled.
      aria-hidden="true"
      style={{
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        width: GRIP_W,
        height: 16,
        cursor: 'grab',
        touchAction: 'none',
        color: 'var(--il-muted)',
      }}
      onClick={(e) => e.stopPropagation()}
      {...props}
    >
      <svg width="6" height="10" viewBox="0 0 6 10" fill="currentColor" aria-hidden>
        <circle cx="1" cy="1" r="1" />
        <circle cx="5" cy="1" r="1" />
        <circle cx="1" cy="5" r="1" />
        <circle cx="5" cy="5" r="1" />
        <circle cx="1" cy="9" r="1" />
        <circle cx="5" cy="9" r="1" />
      </svg>
    </div>
  )
}

/**
 * Where the dragged task will land. Absolutely positioned on the row's edge so it
 * costs no layout — the list must not shift while a drag is in flight, or the
 * rects the drop scan is reading would move under the pointer that is driving it.
 */
function DropLine({ accent, edge }: { accent: string; edge: 'top' | 'bottom' }) {
  return (
    <div
      className="il-task-drop-line"
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: 12,
        right: 12,
        [edge]: -1,
        height: 2,
        borderRadius: 999,
        background: accent,
        pointerEvents: 'none',
      }}
    />
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
  // The unit word appears in the add form ("3 sessions", where the number needs
  // saying what it counts) and NOT on task rows ("3/5", where it does not).
  //
  // Measured, not guessed: with ticket 20 holding the steppers' space permanently
  // and ticket 22 adding the grip, a 320px docked row left the title just 98px of
  // its 288px — enough to truncate "Write the release notes". The word costs ~38px
  // on every row and is the same word on every row, so it is the cheapest 38px in
  // the layout to reclaim, and a list is exactly the context where a repeated noun
  // carries least: "3/5" and "1/8" compare on the numbers (ticket 03 §2).
  //
  // `completed === undefined` is the existing discriminator between the two uses,
  // so this needs no new prop. The word still appears where it reads well: the
  // progress bar's hover reveal in Peek, which is one instance rather than one per
  // row.
  const showUnit = completed === undefined
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
      {showUnit && (
        <span style={{ fontFamily: SANS, fontSize: 8.5, color: 'var(--il-muted)', lineHeight: 1 }}>
          {label}
        </span>
      )}
    </span>
  )
}

/**
 * SessionCount flanked by − / + estimate steppers.
 *
 * `reveal` puts the two buttons in the row's hover-revealed set (ticket 20) —
 * always in layout, faded out until the row is hovered. The add form omits it:
 * there is no row to hover there, and its stepper is the point of the form's
 * second line rather than an incidental control.
 *
 * The buttons are always *rendered* either way. Mounting them on hover is what
 * made rows reflow under the pointer, and it is the bug ticket 20 exists to fix.
 */
function SessionStepper({
  completed,
  estimate,
  accent,
  onDec,
  onInc,
  reveal = false,
}: {
  completed?: number
  estimate: number
  accent: string
  onDec: () => void
  onInc: () => void
  reveal?: boolean
}) {
  const cls = reveal ? 'il-task-reveal' : undefined
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: PIP_GAP, flexShrink: 0 }}>
      <button
        type="button"
        className={cls}
        aria-label="Fewer sessions"
        title="Fewer sessions"
        onClick={(e) => { e.stopPropagation(); onDec() }}
        style={pipBtn}
      >
        −
      </button>
      <SessionCount completed={completed} estimate={estimate} accent={accent} />
      <button
        type="button"
        className={cls}
        aria-label="More sessions"
        title="More sessions"
        onClick={(e) => { e.stopPropagation(); onInc() }}
        style={pipBtn}
      >
        +
      </button>
    </div>
  )
}

/** Width of the reorder grip's column. Completed rows reserve it without a grip. */
const GRIP_W = 9

const PIP_W = 16
const PIP_GAP = 6
/**
 * What one side of the stepper occupies: a − / + button plus its gap. Derived
 * rather than typed twice, because a completed row pads by this to line its count
 * up with an incomplete row's — and a 22 that silently stopped matching the
 * buttons would misalign the two groups with nothing to point at.
 */
const STEPPER_SIDE_W = PIP_W + PIP_GAP

const pipBtn: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--il-border-btn)',
  borderRadius: 4,
  color: 'var(--il-muted)',
  cursor: 'pointer',
  width: PIP_W,
  height: PIP_W,
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
