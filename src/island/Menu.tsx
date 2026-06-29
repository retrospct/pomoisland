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
            stroke="var(--il-teal)"
            strokeWidth="1.3"
          />
          <path
            d="M2.5 4l1.2 1.2 2-2.4"
            stroke="var(--il-teal)"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M8.5 3.5h4M8.5 7h4M8.5 10.5h4"
            stroke="var(--il-teal)"
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
        <svg width="15" height="15" viewBox="0 0 14 14">
          <circle cx="7" cy="7" r="2.4" fill="none" stroke="var(--il-icon)" strokeWidth="1.3" />
          <path
            d="M7 1.4 v1.6 M7 11 v1.6 M1.4 7 h1.6 M11 7 h1.6 M3 3 l1.1 1.1 M9.9 9.9 l1.1 1.1 M11 3 l-1.1 1.1 M4.1 9.9 l-1.1 1.1"
            fill="none"
            stroke="var(--il-icon)"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
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
