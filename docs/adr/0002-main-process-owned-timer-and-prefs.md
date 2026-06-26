# ADR-0002: Main process owns the timer runtime and preferences

Status: Accepted
Date: 2026-06-26

## Context

There are two windows (island + Settings) that must agree on the same data: the timer's
`status/mode/total/remaining/sessionIndex` and every user preference. In the prototype this
all lived in one renderer component (`Dynamic Island Pomodoro.dc.html`), which works for a
single canvas but not across multiple windows. Settings must also persist across restarts, and
changing accent/theme must reskin the island live.

## Decision

The **main process is the single source of truth**:

- A timer state machine in `electron/timer.ts` (ported from the prototype's tick/play/pause/
  reset/skip/complete/advance/switchMode) runs on a 250ms tick and **broadcasts** `timer:state`.
- Preferences live in `electron/store.ts` (`electron-store`), exposed via `prefs:get/set` and a
  `prefs:changed` broadcast.
- Renderers are thin: they subscribe and render, and send mutations back over IPC. No renderer
  holds authoritative timer or pref state.

## Alternatives considered

- **Renderer-owned state + cross-window messaging.** Either window could be closed/hidden,
  losing the clock; syncing two renderers is more fragile than one owner.
- **Shared state in preload.** Preload is per-window; it cannot be the cross-window owner.

## Consequences

- The timer keeps running regardless of which windows are open/visible.
- One broadcast drives both windows, so live reskin and live timer updates are trivial.
- IPC contracts (`src/shared/types.ts`) become the integration seam — they must be frozen
  before the two renderers are built in parallel (see ADR-0003).
