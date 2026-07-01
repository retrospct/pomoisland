# ADR-0007: User-rebindable global shortcuts, reject-and-revert conflicts

Status: Accepted
Date: 2026-07-01

## Context

ADR-0004 shipped one hard-coded global shortcut (show/hide) and left the "⌥ Space" play/pause
shortcut shown in Settings as a display-only stub. The owner asked for three rebindable global
shortcuts (show/hide, play/pause, next) plus unbind and reset-to-defaults, replacing the stub.

## Decision

- `Prefs` gains `shortcuts: Record<'showHide' | 'playPause' | 'next', string | null>`, storing
  Electron accelerator strings; `null` means unbound. `DEFAULT_SHORTCUTS` (the ⌘⌥-arrow family:
  ↑ show/hide, ↓ play/pause, → next; ⌘⌥← reserved for a future prev/reset) is the single source
  for first-run and the reset button. This replaces the hard-coded `SHOW_HIDE_ACCELERATOR`.
- **Conflict handling is reject-and-revert**, not save-then-mark-inactive: a capture that
  duplicates another PomoIsland shortcut, or that `globalShortcut.register()` rejects, shows an
  inline error and the previous binding is kept. The invariant is "if it's saved, it's live."
  (Known gap: some macOS system combos can register successfully yet still be swallowed by the
  OS — accepted, no blocklist maintained.)
- Captured accelerators must include at least one strong modifier (⌘/⌃/⌥); Shift is only valid
  alongside one of those. Bare keys are rejected to avoid hijacking ordinary typing globally.
- Open Settings stays a `⌘,` app-menu (Preferences) item, not a global shortcut — it doesn't need
  to fire while the app isn't focused, and globalizing it would be one more system-wide grab.

## Alternatives considered

- **Fixed defaults, display-only** (no rebinding this pass) — simplest, but the owner explicitly
  wanted rebinding + unbind + reset now.
- **Save-but-inactive with a warning badge** on conflict — more forgiving when the conflicting
  app isn't always running, but leaves a "saved yet dead" state that's harder to reason about
  for a small utility. Rejected in favor of reject-and-revert.

## Consequences

- Tray and the Settings shortcut rows both read `prefs.shortcuts` as the single source of truth
  (consistent with ADR-0002); the tray menu rebuilds when `shortcuts` changes so its displayed
  accelerators stay accurate.
- `store.ts` needs a migration step filling `shortcuts` from `DEFAULT_SHORTCUTS` for prefs files
  written before this change.
