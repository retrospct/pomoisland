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
  Web-Audio completion chime with volume, and the live "Done animation" (ripple) selection.
- **Persisted as prefs, no OS behavior yet (no-ops):** launch-at-login, do-not-disturb,
  hide-during-screen-sharing, pause-when-idle, global shortcut, native notifications, the
  ticking sound, real alarm sound files, and the alternate timer-style / notch-layout
  renderings (the island always draws the circular ring this pass).

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
