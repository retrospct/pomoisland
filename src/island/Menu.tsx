// The ⋯ menu from the expanded panel.
// Menu         — trigger button only (rendered inline in the controls row).
// MenuDropdown — item list, rendered in normal flow by Expanded so the window
//               auto-grows to fit it (no absolute-position clipping). MO-6 adds Tasks.

interface TriggerProps {
  onToggleMenu: (e: React.MouseEvent) => void
  /** Show a notification dot when a downloaded update is waiting to install. */
  updateReady?: boolean
  /** Accent color for the dot (falls back to a neutral blue). */
  accent?: string
}

interface DropdownProps {
  /** Toggles Prefs.alwaysTop. Unlike every other item, does NOT close the dropdown. */
  onToggleAlwaysTop: (e: React.MouseEvent) => void
  alwaysTop: boolean
  /** Island is docked to the notch — the toggle is inert until it floats (ADR-0006). */
  snapped: boolean
  /** Accent color for the check glyph. */
  accent?: string
  onTasks: (e: React.MouseEvent) => void
  /** Pop the task list out of the island, or back in — see `tasksDetached`. */
  onPopTasks: (e: React.MouseEvent) => void
  /** Prefs.tasksDetached — flips the row between "Pop out" and "Pop in". */
  tasksDetached: boolean
  onSettings: (e: React.MouseEvent) => void
  onCheckUpdates: (e: React.MouseEvent) => void
  onQuit: (e: React.MouseEvent) => void
  /** When set, the "Check for updates" item becomes "Restart to Update". */
  updateReady?: boolean
  onInstallRestart?: (e: React.MouseEvent) => void
}

export function Menu({ onToggleMenu, updateReady, accent }: TriggerProps) {
  return (
    <button
      className="island-icon-btn"
      onClick={onToggleMenu}
      aria-label={updateReady ? 'More — update ready' : 'More'}
      style={iconBtn}
    >
      <svg width="18" height="6" viewBox="0 0 18 6">
        <circle cx="2.6" cy="3" r="1.7" fill="currentColor" />
        <circle cx="9" cy="3" r="1.7" fill="currentColor" />
        <circle cx="15.4" cy="3" r="1.7" fill="currentColor" />
      </svg>
      {updateReady && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: 9,
            right: 9,
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: accent ?? '#6F9CEB',
            // Ring in the surface color so the dot reads cleanly over the icon.
            boxShadow: '0 0 0 2px var(--il-bg)',
          }}
        />
      )}
    </button>
  )
}

export function MenuDropdown({
  onToggleAlwaysTop,
  alwaysTop,
  snapped,
  accent,
  onTasks,
  onPopTasks,
  tasksDetached,
  onSettings,
  onCheckUpdates,
  onQuit,
  updateReady,
  onInstallRestart,
}: DropdownProps) {
  return (
    <div style={popover}>
      {/* State toggle, kept in its own group above the commands. Unlike every
          other item this one does NOT close the dropdown — the user should see
          the check flip in place. While snapped, applyIslandWindowLevel() forces
          'screen-saver' level so the island can paint over the menu bar
          (ADR-0006), so the pref only bites once the island is floating; say so
          rather than silently no-op'ing. Stays ENABLED while snapped — setting it
          before undocking is legitimate. */}
      <button
        className="island-menu-item"
        onClick={onToggleAlwaysTop}
        role="menuitemcheckbox"
        aria-checked={alwaysTop}
        style={menuItem}
      >
        {/* Thumbtack — "pin this on top". */}
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flex: '0 0 auto' }}>
          <path
            d="M5.8 1.5h3.4l-.5 3.3 2.3 2.3H4l2.3-2.3z"
            stroke="var(--il-icon)"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <path d="M7.5 7.1v6.2" stroke="var(--il-icon)" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block' }}>Always on Top</span>
          {snapped && (
            <span
              style={{
                display: 'block',
                fontSize: 10.5,
                lineHeight: 1.25,
                color: 'var(--il-muted)',
                marginTop: 2,
              }}
            >
              Floating only
            </span>
          )}
        </span>
        {/* Fixed-width slot so the label column doesn't shift as the check appears. */}
        <span style={{ flex: '0 0 14px', display: 'grid', placeItems: 'center' }} aria-hidden>
          {alwaysTop && (
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path
                d="M2.2 6.9l2.9 3 5.7-6.4"
                stroke={accent ?? 'var(--il-text)'}
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </span>
      </button>
      <div style={{ height: 1, background: 'var(--il-line)', margin: '5px 9px' }} />
      <button className="island-menu-item" onClick={onTasks} style={menuItem}>
        <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
          <rect
            x="1.5"
            y="1.5"
            width="5"
            height="5"
            rx="1"
            stroke="var(--il-icon)"
            strokeWidth="1.3"
          />
          <path
            d="M2.5 4l1.2 1.2 2-2.4"
            stroke="var(--il-icon)"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M8.5 3.5h4M8.5 7h4M8.5 10.5h4"
            stroke="var(--il-icon)"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          <rect
            x="1.5"
            y="8.5"
            width="5"
            height="4"
            rx="1"
            stroke="var(--il-muted)"
            strokeWidth="1.3"
          />
        </svg>
        Tasks
      </button>
      {/* Where the list lives. Docked → "Pop out"; detached → "Pop in". Single
          line by design: the popover's reserved height (MENU_ALLOWANCE in
          Island.tsx) is computed per row, and a sub-label here would blow it. */}
      <button className="island-menu-item" onClick={onPopTasks} style={menuItem}>
        {tasksDetached ? (
          /* Pop in — arrow travelling back into the frame. */
          <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
            <path
              d="M6 2.5H2.5v9h9V8"
              stroke="var(--il-icon)"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M7 7h3.5v3.5M11 11 7 7"
              stroke="var(--il-icon)"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          /* Pop out — arrow leaving the frame toward the top-right. */
          <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
            <path
              d="M6 2.5H2.5v9h9V8"
              stroke="var(--il-icon)"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M8.5 2.5h3v3M11.5 2.5 7 7"
              stroke="var(--il-icon)"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        {tasksDetached ? 'Pop in' : 'Pop out'}
      </button>
      <button className="island-menu-item" onClick={onSettings} style={menuItem}>
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <path
            d="M6.3 1.5h2.4l.3 1.3c.4.1.7.3 1 .5l1.2-.5 1.7 1.7-.5 1.2c.2.3.4.6.5 1l1.3.3v2.4l-1.3.3c-.1.4-.3.7-.5 1l.5 1.2-1.7 1.7-1.2-.5c-.3.2-.6.4-1 .5l-.3 1.3H6.3l-.3-1.3c-.4-.1-.7-.3-1-.5l-1.2.5-1.7-1.7.5-1.2c-.2-.3-.4-.6-.5-1L.8 9V6.6l1.3-.3c.1-.4.3-.7.5-1L2.1 4l1.7-1.7 1.2.5c.3-.2.6-.4 1-.5l.3-1.3z"
            stroke="var(--il-icon)"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <circle cx="7.5" cy="7.5" r="2" stroke="var(--il-icon)" strokeWidth="1.3" />
        </svg>
        Settings
      </button>
      <button
        className="island-menu-item"
        onClick={updateReady && onInstallRestart ? onInstallRestart : onCheckUpdates}
        style={menuItem}
      >
        {/* Refresh / update arrows — a circular pair suggesting "check again". */}
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <path
            d="M12.5 6a5 5 0 1 0 .3 3"
            stroke="var(--il-icon)"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12.7 2.3v3.4H9.3"
            stroke="var(--il-icon)"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {updateReady ? 'Restart to Update' : 'Check for updates'}
      </button>
      <div style={{ height: 1, background: 'var(--il-line)', margin: '5px 9px' }} />
      <button className="island-menu-item" onClick={onQuit} style={menuItem}>
        {/* Power icon — reads as "quit" more clearly than a logout arrow. Same
            icon color as Tasks/Settings, no orange. */}
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
          <path
            d="M18.36 6.64a9 9 0 1 1-12.73 0"
            stroke="var(--il-icon)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M12 2v10" stroke="var(--il-icon)" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
        Quit
      </button>
    </div>
  )
}

const iconBtn: React.CSSProperties = {
  position: 'relative',
  width: 42,
  height: 42,
  borderRadius: '50%',
  border: 'none',
  background: 'transparent',
  color: 'var(--il-muted)',
  display: 'grid',
  placeItems: 'center',
  cursor: 'pointer',
  transition: 'all .16s',
  padding: 0,
}

const popover: React.CSSProperties = {
  width: 178,
  background: 'var(--il-bg)',
  border: '1px solid var(--il-border)',
  borderRadius: 13,
  padding: 6,
}

const menuItem: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  width: '100%',
  textAlign: 'left',
  background: 'transparent',
  border: 'none',
  color: 'var(--il-text)',
  fontFamily: "'Inter', sans-serif",
  fontSize: 13,
  padding: '10px 12px',
  borderRadius: 9,
  cursor: 'pointer',
  transition: 'background .14s',
}
