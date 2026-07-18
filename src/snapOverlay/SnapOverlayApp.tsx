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
 *   dragging (far)  → dashed accent outline + "DROP TO SNAP" label. The dashed
 *                      outline and label never move or change between states.
 *   nearSnap        → same dashed outline + same "DROP TO SNAP" label, plus a
 *                      solid glowing accent ring that animates in just outside
 *                      the outline (same shape, offset outward).
 *
 * Animations: fade-in + scaleY on drag start; glow ring scales/fades in on
 * nearSnap, then pulses while held.
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
    notchWidth: 0,
    notchCenterX: 0,
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
        // Side padding exceeds OVERLAY_PADDING_X (extra 30px each side) so the
        // ghost reads as a compact target instead of spanning the full docked
        // footprint width — no top padding — ghost is flush with the screen top
        // edge (y=0). Height gives blur room below.
        padding: '0 100px 0',
        pointerEvents: 'none',
      }}
    >
      <NotchGhost nearSnap={placement.nearSnap} accent={accent} />
    </div>
  )
}

// Drop-zone bar height — reads as a compact target rather than a thin strip.
const DROP_H = 46

function NotchGhost({ nearSnap, accent }: { nearSnap: boolean; accent: string }) {
  const h = accent.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  const rgba = (a: number) => `rgba(${r},${g},${b},${a})`

  // Flat top (flush with the screen edge), rounded bottom — mirrors the dock.
  // This dashed outline is the ONE persistent shape: it stays put and never
  // swaps to solid — the near-snap glow renders as a separate ring outside it.
  const shape: CSSProperties = {
    flex: '1 1 auto',
    height: DROP_H,
    borderRadius: '0 0 16px 16px',
    border: `3px dashed ${accent}`,
    borderTop: 'none',
    position: 'relative',
    pointerEvents: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }

  const labelStyle: CSSProperties = {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 12.5,
    letterSpacing: '0.08em',
    fontWeight: 700,
    color: accent,
    userSelect: 'none',
  }

  // Frosted "liquid glass" plate so the label stays legible over busy backgrounds.
  // The overlay window is transparent with no vibrancy, so backdrop-filter can't
  // blur the real desktop — the translucent plate is what guarantees contrast;
  // the blur is progressive enhancement where the compositor honors it.
  const labelPill: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 12px',
    borderRadius: 999,
    background: 'rgba(20,20,22,0.72)',
    border: '1px solid rgba(255,255,255,0.14)',
    boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
    backdropFilter: 'blur(14px) saturate(1.4)',
    WebkitBackdropFilter: 'blur(14px) saturate(1.4)',
  }

  return (
    <div className="snap-ghost" style={shape}>
      {nearSnap && (
        // Solid glowing ring that animates in outside the dashed outline,
        // tracing the same shape offset outward — never replaces the dashed line.
        <div
          className="snap-glow-ring"
          style={{
            position: 'absolute',
            inset: -10,
            top: 0,
            borderRadius: '0 0 24px 24px',
            border: `3px solid ${accent}`,
            borderTop: 'none',
            boxShadow: [`0 0 12px 3px ${rgba(0.5)}`, `0 0 26px 9px ${rgba(0.26)}`, `inset 0 0 9px 2px ${rgba(0.12)}`].join(','),
            pointerEvents: 'none',
          }}
        />
      )}
      <div style={labelPill}>
        <span style={labelStyle}>DROP TO SNAP</span>
      </div>
    </div>
  )
}
