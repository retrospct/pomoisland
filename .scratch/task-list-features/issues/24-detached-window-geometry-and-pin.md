# 24 — Detached window: geometry persistence, resize grip, pin

**What to build:** the detached list becomes a window you set up once.

You size it and place it where you want, and it comes back that way after a restart. You can drag
its corner to resize. You can pin it above other applications so it stays visible while you work.

**Blocked by:** 23 — the window has to exist first.

**Status:** ready-for-agent

**Why this shape:** [ticket 02](02-research-electron-frameless-resizable-macos.md) already
answered the hard Electron facts; follow them rather than re-deriving.

- [ ] The window is resizable by dragging its corner
- [ ] The corner grip is a hand-drawn glyph that does **not** intercept pointer events. AppKit
      owns resize on macOS — Electron's own hit-testing for frameless resize is compiled out, so
      the grip is decoration over a native resize region
- [ ] Transparency stays **off** on this window
- [ ] Size and position persist across restart. These are the first window bounds stored in prefs
- [ ] Settle whether the geometry keys are flat or a nested object; prefs are flat today apart
      from two existing exceptions
- [ ] Bounds are captured from the window's normal (non-maximized) bounds, debounced
- [ ] Restore validates, intersects against a live display, then clamps size and origin **in that
      order**, so a window can never be stranded off-screen after a display change or resolution
      change
- [ ] The window can be pinned above ordinary applications, at a normal window level with relative
      level 1, so it sits **below** the island in all three of the island's levels
- [ ] The pin reuses the shipped always-on-top idiom — the same glyph and label the island's ⋯
      menu and the tray already use. Do not invent a second pin affordance
- [ ] The pin reads clearly as on versus off, given the app has no icon-toggle precedent
- [ ] Type-check and lint pass

**One decision to make here, deliberately left open:** whether the detached window keeps its own
always-on-top pref or reads the island's. They are **not** interchangeable — the island's is inert
while snapped, because the island is forced to a level that lets it paint over the menu bar,
whereas this window sits deliberately below it. Settle it before wiring the control.

**No Settings UI** for the detached window's prefs. The reason has changed since charting: the
original precedent was a pref with no control anywhere, and the correct precedent is now the
always-on-top pref, which is user-toggleable from the island menu and the tray but not from
Settings.

**Out of scope:** pop-out and pop-in window choreography, which belongs to the global motion pass.
