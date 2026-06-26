# ADR-0001: Electron + electron-vite + React + TypeScript

Status: Accepted
Date: 2026-06-26

## Context

The handoff (`design-reference/`) describes a macOS notch-aware desktop widget that must pin
to the camera notch, stay always-on-top, draw a frameless/transparent window, and (eventually)
support launch-at-login, a global shortcut, and screen-share/idle awareness. These are
desktop-OS capabilities, not browser capabilities. The team writes TypeScript + React.

## Decision

Build a desktop app with **Electron**, scaffolded by **electron-vite** (Vite + React + TS,
multi-renderer), packaged later with **electron-builder**. Two renderer entry points: the
island (`index.html`) and Settings (`settings.html`). Fonts (Fraunces, Inter, IBM Plex Mono)
are bundled offline via `@fontsource/*` instead of Google Fonts CDN.

## Alternatives considered

- **Tauri (Rust + webview).** Lighter binaries and native feel, but more work to wire the
  macOS notch/window behaviors and a second language in the stack. Revisit if bundle size or
  memory becomes a real constraint.
- **Web-only PWA.** Cannot pin to the notch, go always-on-top, or run OS integrations; the
  whole premise collapses to a browser tab.

## Consequences

- We can deliver the notch/always-on-top/frameless behaviors natively.
- We accept Electron's footprint (Chromium + Node) as the cost of those capabilities.
- electron-vite gives HMR for renderers and a clean main/preload/renderer split.
