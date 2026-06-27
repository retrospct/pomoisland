# ADR-0003: Two-window model with content-driven island auto-resize

Status: Accepted
Date: 2026-06-26

## Context

The island has three presentations of very different sizes — collapsed pill, peek (~266px),
expanded panel (~320px wide, taller) — and must sit top-center against the notch with no
window chrome. A frameless transparent window large enough for the expanded panel would, by
default, swallow mouse clicks over its transparent regions when collapsed. Settings is a
conventional desktop window, but the handoff draws its own chrome rather than using the OS
title bar.

> **Update (2026-06-26):** The Settings panel was rebuilt from `SettingsPanel.dc.html`
> (General + Preferences tabs, an 880px card) — superseding the original `Settings.dc.html`
> sizing/chrome described below. The current window is **880×720**, frameless, **resizable
> (720–1100 wide)**, and uses a single in-card **Close** button with the header acting as the
> drag region — there are no macOS traffic-light controls. The rest of this ADR (island
> auto-resize, tray, alternatives) still holds.

## Decision

- **Island window:** `frame:false, transparent:true, alwaysOnTop:true, skipTaskbar:true,
  resizable:false, hasShadow:false`. The renderer measures the island's DOM via a
  `ResizeObserver` and sends `island:resize`; the main process calls `setBounds` to fit the
  content exactly and re-center horizontally at the top. This keeps the clickable surface equal
  to the visible island in every state.
- **Settings window:** frameless `880x720` (resizable 720–1100 wide); the React app draws an
  880px card from `SettingsPanel.dc.html` whose header is the drag region and whose in-card
  **Close** button maps to `window:settingsControl`. (Originally specced as `780x600` with
  handoff traffic-lights; see the Update note above.)
- A **tray** icon hosts show/hide + quit so the app survives with no visible windows.

## Alternatives considered

- **One fixed max-size transparent window + `setIgnoreMouseEvents`.** Hit-testing transparent
  regions per-frame is fiddly and error-prone next to drag/snap.
- **macOS `titleBarStyle: hiddenInset` for Settings.** Loses the bespoke chrome the handoff
  specifies; we'd no longer be pixel-faithful.

## Consequences

- The island's clickable area always matches what's drawn; drag/snap math stays simple.
- We own the resize loop; the renderer must report accurate sizes (guard against feedback loops).
- Custom Settings chrome means we implement window controls ourselves (currently just Close;
  minimize/zoom remain available over IPC via `SettingsControl` but are not surfaced in the card).
