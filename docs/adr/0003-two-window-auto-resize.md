# ADR-0003: Two-window model with content-driven island auto-resize

Status: Accepted
Date: 2026-06-26

## Context

The island has three presentations of very different sizes — collapsed pill, peek (~266px),
expanded panel (~320px wide, taller) — and must sit top-center against the notch with no
window chrome. A frameless transparent window large enough for the expanded panel would, by
default, swallow mouse clicks over its transparent regions when collapsed. Settings is a
conventional 780x600 window but the handoff draws its own titlebar with traffic lights.

## Decision

- **Island window:** `frame:false, transparent:true, alwaysOnTop:true, skipTaskbar:true,
  resizable:false, hasShadow:false`. The renderer measures the island's DOM via a
  `ResizeObserver` and sends `island:resize`; the main process calls `setBounds` to fit the
  content exactly and re-center horizontally at the top. This keeps the clickable surface equal
  to the visible island in every state.
- **Settings window:** frameless `780x600`; the React app draws the titlebar/traffic-lights
  from the handoff and wires the three dots to real close/minimize/zoom.
- A **tray** icon hosts show/hide + quit so the app survives with no visible windows.

## Alternatives considered

- **One fixed max-size transparent window + `setIgnoreMouseEvents`.** Hit-testing transparent
  regions per-frame is fiddly and error-prone next to drag/snap.
- **macOS `titleBarStyle: hiddenInset` for Settings.** Loses the bespoke titlebar the handoff
  specifies; we'd no longer be pixel-faithful.

## Consequences

- The island's clickable area always matches what's drawn; drag/snap math stays simple.
- We own the resize loop; the renderer must report accurate sizes (guard against feedback loops).
- Custom Settings titlebar means we implement window controls ourselves.
