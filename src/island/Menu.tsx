// The ⋯ menu from the expanded panel.
// Menu         — trigger button only (rendered inline in the controls row).
// MenuDropdown — item list, rendered in normal flow by Expanded so the window
//               auto-grows to fit it (no absolute-position clipping). MO-6 adds Tasks.

interface TriggerProps {
  onToggleMenu: (e: React.MouseEvent) => void
}

interface DropdownProps {
  onTasks: (e: React.MouseEvent) => void
  onSettings: (e: React.MouseEvent) => void
  onQuit: (e: React.MouseEvent) => void
}

export function Menu({ onToggleMenu }: TriggerProps) {
  return (
    <button className="island-icon-btn" onClick={onToggleMenu} aria-label="More" style={iconBtn}>
      <svg width="18" height="6" viewBox="0 0 18 6">
        <circle cx="2.6" cy="3" r="1.7" fill="currentColor" />
        <circle cx="9" cy="3" r="1.7" fill="currentColor" />
        <circle cx="15.4" cy="3" r="1.7" fill="currentColor" />
      </svg>
    </button>
  )
}

export function MenuDropdown({ onTasks, onSettings, onQuit }: DropdownProps) {
  return (
    <div style={popover}>
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
      <div style={{ height: 1, background: 'var(--il-line)', margin: '5px 9px' }} />
      <button
        className="island-menu-item island-menu-item--danger"
        onClick={onQuit}
        style={{ ...menuItem, color: '#E2A24A' }}
      >
        <svg width="15" height="15" viewBox="0 0 14 14">
          <path
            d="M5.4 2 H2.4 a0.6 0.6 0 0 0 -0.6 0.6 v8.8 a0.6 0.6 0 0 0 0.6 0.6 H5.4 M8.4 4.4 L11.6 7 L8.4 9.6 M11.6 7 H5"
            fill="none"
            stroke="#E2A24A"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Quit
      </button>
    </div>
  )
}

const iconBtn: React.CSSProperties = {
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
