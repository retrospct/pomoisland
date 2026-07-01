# ADR-0004: Defer deep OS integrations; persist them as prefs now

Status: Accepted
Date: 2026-06-26

## Context

The Settings panel (`SettingsPanel.dc.html`, General + Preferences tabs) exposes several
OS-level capabilities: launch-at-login, do-not-disturb-in-focus, hide-during-screen-sharing,
pause-when-idle, the global shortcut, system notifications, the ticking sound, and packaged
alarm sounds. Always-on-top and magnetic snap live in prefs too but aren't surfaced in this
panel. Implementing all of them faithfully (screen-share detection, system idle polling,
login items, global hotkey capture) is a large surface with platform edge cases. The agreed
scope for this pass is the **core experience first**.

## Decision

For this pass:

- **Wired for real:** always-on-top, magnetic snap (in-app window drag), tray, a basic
  Web-Audio completion chime with volume, the live "Done animation" (ripple) selection, and a
  **global show/hide shortcut** (`CommandOrControl+Alt+P`, see `electron/shortcuts.ts`).
- **Persisted as prefs, no OS behavior yet (no-ops):** launch-at-login, do-not-disturb,
  hide-during-screen-sharing, pause-when-idle, the start/pause global shortcut (the "⌥ Space"
  shown in Settings), native notifications, real alarm sound files, and the alternate
  timer-style / notch-layout renderings (the island always draws the circular ring this pass).

Update (2026-06-26): the **ticking sound** is no longer deferred. It became a real
`off` / `soft` / `crisp` per-second audio feature wired through the synthesized sound
engine — see ADR-0005.

Update (2026-07-01): the global shortcut is no longer hard-coded — see ADR-0007 for
user-rebindable shortcuts. Of the remaining deferred toggles, **launch-at-login**, **native
notifications**, and **pause-when-idle** are no longer deferred (wired for real this pass).
**Do-not-disturb** is dropped from the Settings UI entirely — macOS has no public API to toggle
system Focus/DND, so a toggle that can't work isn't shown. **Hide-during-screen-sharing**
remains deferred (capture detection is unreliable from Electron); so does the alternate
`timerStyle` / notch-layout rendering (its own feature pass).

Every deferred toggle is still stored and round-trips through Settings, so turning the behavior
on later is a localized change in the main process, not a data-model change.

## Alternatives considered

- **Implement everything now.** Rejected for scope; the highest-risk OS hooks would delay the
  core island/Settings experience that defines the product.
- **Hide deferred toggles from the UI.** Rejected — the handoff is pixel-specific and the
  toggles are part of the design; hiding them would diverge visually and lose the persisted
  intent.

## Consequences

- Users can configure deferred options and the choices survive restarts.
- A follow-up ADR/issue will cover turning each no-op into real behavior, with the macOS APIs
  and permission prompts spelled out.
- Deferred toggles should be visually annotated in code (not the UI) so we don't mistake a
  persisted pref for a working integration.
