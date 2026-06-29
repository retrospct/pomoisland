// The ⋯ menu from the expanded panel. Replaced inline Settings with the real
// Settings window; removed the testing-only break-mode switch (MO-18);
// added Tasks entry (MO-6).

interface MenuProps {
  open: boolean
  onToggleMenu: (e: React.MouseEvent) => void
  onTasks: (e: React.MouseEvent) => void
  onSettings: (e: React.MouseEvent) => void
  onQuit: (e: React.MouseEvent) => void
}

export function Menu({ open, onToggleMenu, onTasks, onSettings, onQuit }: MenuProps) {
  return (
    <div style={{ position: 'relative' }}>
      <button className="island-icon-btn" onClick={onToggleMenu} aria-label="More" style={iconBtn}>
        <svg width="18" height="6" viewBox="0 0 18 6">
          <circle cx="2.6" cy="3" r="1.7" fill="currentColor" />
          <circle cx="9" cy="3" r="1.7" fill="currentColor" />
          <circle cx="15.4" cy="3" r="1.7" fill="currentColor" />
        </svg>
      </button>
      {open && (
        <div style={popover}>
          <button className="island-menu-item" onClick={onTasks} style={menuItem}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1.5" y="1.5" width="5" height="5" rx="1" stroke="#8FC8C0" strokeWidth="1.3" />
              <path d="M2.5 4l1.2 1.2 2-2.4" stroke="#8FC8C0" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M8.5 3.5h4M8.5 7h4M8.5 10.5h4" stroke="#8FC8C0" strokeWidth="1.3" strokeLinecap="round" />
              <rect x="1.5" y="8.5" width="5" height="4" rx="1" stroke="rgba(242,241,236,0.3)" strokeWidth="1.3" />
            </svg>
            Tasks
          </button>
          <button className="island-menu-item" onClick={onSettings} style={menuItem}>
            <svg width="14" height="14" viewBox="0 0 14 14">
              <circle cx="7" cy="7" r="2.4" fill="none" stroke="#B8BDC2" strokeWidth="1.3" />
              <path
                d="M7 1.4v1.6M7 11v1.6M1.4 7h1.6M11 7h1.6M3 3l1.1 1.1M9.9 9.9l1.1 1.1M11 3l-1.1 1.1M4.1 9.9l-1.1 1.1"
                fill="none"
                stroke="#B8BDC2"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </svg>
            Settings
          </button>
          <div style={{ height: 1, background: 'rgba(242,241,236,0.09)', margin: '5px 9px' }} />
          <button
            className="island-menu-item island-menu-item--danger"
            onClick={onQuit}
            style={{ ...menuItem, color: '#E2A24A' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14">
              <path
                d="M5.4 2H2.4a.6.6 0 0 0-.6.6v8.8a.6.6 0 0 0 .6.6H5.4M8.4 4.4L11.6 7 8.4 9.6M11.6 7H5"
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
      )}
    </div>
  )
}

const iconBtn: React.CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: '50%',
  border: 'none',
  background: 'transparent',
  color: 'rgba(242,241,236,0.7)',
  display: 'grid',
  placeItems: 'center',
  cursor: 'pointer',
  transition: 'all .16s',
  padding: 0,
}

const popover: React.CSSProperties = {
  position: 'absolute',
  bottom: 50,
  right: 0,
  width: 178,
  background: '#23262B',
  border: '1px solid rgba(242,241,236,0.1)',
  borderRadius: 13,
  padding: 6,
  boxShadow: '0 18px 44px rgba(0,0,0,.55)',
  zIndex: 20,
}

const menuItem: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 9,
  width: '100%',
  textAlign: 'left',
  background: 'transparent',
  border: 'none',
  color: '#F2F1EC',
  fontFamily: "'Inter', sans-serif",
  fontSize: 13,
  padding: '9px 10px',
  borderRadius: 9,
  cursor: 'pointer',
  transition: 'background .14s',
}
