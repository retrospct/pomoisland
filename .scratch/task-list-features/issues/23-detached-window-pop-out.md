# 23 — Detached task window: pop out and pop in

**What to build:** the task list moves into its own window and stops being trapped in the island.

Today the list drops below the timer, is fixed at one width, scrolls inside a short area, and
vanishes the moment you look at anything else. After this ticket you can pop it out into its own
window, and pop it back in.

**Detach is exclusive**: while detached, the island never renders the inline panel, and every
route that used to open it focuses the window instead. Pop-out is a **move**, never a clone.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

**Why this shape:** see [ticket 10](10-detached-window-architecture-and-header.md), whose
architecture questions are answered here, and
[ticket 02](02-research-electron-frameless-resizable-macos.md), which already supplies the hard
Electron facts.

Note the file overlap: tickets 15 and 20 also edit the task list and will conflict on merge, but
neither gates this one.

- [ ] The list can be popped out into its own window, and popped back in, from a control in the
      list's header
- [ ] Header layout: title left, controls right. Docked shows pop-out only; detached shows pop-in,
      pin and close in that order with close outermost
- [ ] The list has **no header today** — adding one must not blow the docked panel's vertical
      budget inside the island
- [ ] While detached, the island's task presentation is unreachable and the inline panel never
      renders
- [ ] The island's ⋯ menu Tasks item and its clickable task label both focus the detached window
      instead of opening the panel
- [ ] The island resizes correctly when the panel disappears mid-session
- [ ] Settle the renderer entry: a fourth entry alongside the existing three, or the island entry
      with a query param. Task state already lives in the main process and broadcasts to all
      windows, so a detached window gets its state for free either way
- [ ] Settle the window lifecycle, following the Settings singleton pattern — a module-level
      reference, showing and focusing an existing window on re-open
- [ ] Settle what the close button means: pop back in, or stay detached-and-closed so the Tasks
      item reopens it detached
- [ ] The detached header is the window's drag region, since the window has no title bar
- [ ] Adding pop out / pop in to the ⋯ dropdown means retuning its height allowance a third time.
      It is **measured, not guessed** — the worst case is the snapped state, where the extra
      sub-label makes the popover taller
- [ ] The detached state persists across restart, with no Settings UI
- [ ] Type-check and lint pass

**Not in this ticket:** geometry persistence, the resize grip and the pin — all ticket 24. This
one ships a window that opens, closes and moves the list; it is verifiable on its own.

**Do not** parent the detached window to the island window. See ticket 02.
