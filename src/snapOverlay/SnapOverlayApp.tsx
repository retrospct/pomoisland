import type { CSSProperties } from 'react'
import type { Placement } from '@shared/types'
import { accentHex } from '@shared/accent'
import { useEffect, useState } from 'react'
import './snapOverlay.css'

/**
 * Snap-zone ghost shown during a drag (MO-8, MO-35).
 *
 * The overlay BrowserWindow is sized to island footprint + OVERLAY_PADDING_X on each
 * side and OVERLAY_PADDING_Y below (no top offset — the window starts at snap.y = 0,
 * flush with the screen top). The ghost's top edge aligns with the screen top so the
 * island appears to emerge from the notch / menu bar when it snaps.
 *
 * Visual states:
 *   dragging (far)  → faint dashed accent outline + "DROP TO SNAP" label
 *   nearSnap        → bright glowing solid outline + outer bloom ring + "RELEASE" label
 *
 * Animations: fade-in + scaleY on drag start; glow pulse while nearSnap.
 * See snapOverlay.css. This is a scoped exception to the global animation-deferral
 * policy — see .scratch/animation-tuning/issues/01-tune-all-animations.md.
 */
export function SnapOverlayApp() {
  const [placement, setPlacement] = useState<Placement>({
    snapped: false,
    dragging: false,
    nearSnap: false,
    hasNotch: false,
    notchHeight: 0,
  })
  const [accent, setAccent] = useState<string>('#8FC8C0')

  useEffect(() => {
    void window.api.island.getPlacement().then(setPlacement)
    const offPlacement = window.api.island.onPlacement(setPlacement)

    void window.api.prefs.get().then((p) => setAccent(accentHex(p.accent)))
    const offPrefs = window.api.prefs.onChange((p) => setAccent(accentHex(p.accent)))

    return () => {
      offPlacement()
      offPrefs()
    }
  }, [])

  if (!placement.dragging) return null

  return (
    <div
      className="snap-overlay-root"
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        // Side padding matches OVERLAY_PADDING_X; bottom = OVERLAY_PADDING_Y.
        // No top padding — ghost starts flush with the screen top edge (y=0).
        padding: '0 40px 20px',
        pointerEvents: 'none',
      }}
    >
      <NotchGhost nearSnap={placement.nearSnap} accent={accent} />
    </div>
  )
}

function NotchGhost({ nearSnap, accent }: { nearSnap: boolean; accent: string }) {
  const h = accent.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  const rgba = (a: number) => `rgba(${r},${g},${b},${a})`

  // Notch pill shape: flat top (flush with screen top, border-top: none),
  // rounded bottom corners only — mirrors the notch / snapped island shape.
  const shape: CSSProperties = {
    flex: '1 1 auto',
    alignSelf: 'stretch',
    borderRadius: '0 0 20px 20px',
    // Top border intentionally omitted: the ghost "emerges from" the screen top.
    borderTop: 'none',
    position: 'relative',
    pointerEvents: 'none',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingBottom: 7,
  }

  const labelStyle: CSSProperties = {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 8,
    letterSpacing: '0.13em',
    fontWeight: 500,
    color: rgba(nearSnap ? 0.95 : 0.75),
    userSelect: 'none',
  }

  if (nearSnap) {
    return (
      <div
        className="snap-ghost-near"
        style={{
          ...shape,
          border: `1.5px solid ${rgba(0.9)}`,
          borderTop: 'none',
          boxShadow: [
            `0 0 10px 3px ${rgba(0.5)}`,
            `0 0 24px 8px ${rgba(0.28)}`,
            `inset 0 0 8px 2px ${rgba(0.12)}`,
          ].join(','),
        }}
      >
        {/* Outer bloom ring */}
        <div
          style={{
            position: 'absolute',
            inset: -7,
            top: 0,
            borderRadius: '0 0 27px 27px',
            border: `1px solid ${rgba(0.4)}`,
            borderTop: 'none',
            boxShadow: `0 0 30px 10px ${rgba(0.18)}`,
            pointerEvents: 'none',
          }}
        />
        <span style={labelStyle}>RELEASE</span>
      </div>
    )
  }

  return (
    <div
      className="snap-ghost-far"
      style={{
        ...shape,
        border: `1.5px dashed ${rgba(0.45)}`,
        borderTop: 'none',
      }}
    >
      <span style={labelStyle}>DROP TO SNAP</span>
    </div>
  )
}
