# 02 — RESEARCH: Electron frameless resizable window on macOS

Type: research
Status: claimed

## Question

What does Electron actually give us for the detached task-list window, and what must be
hand-built? Ticket 10 depends on the answer.

Specifically:

1. **Resize grip.** The brief asks for "the standard fold/grip icon in the bottom right
   hand corner". macOS removed the classic grow box; `resizable: true` on a frameless
   window gives invisible edge/corner hit zones and no glyph. Is there any native affordance
   left, or is the grip purely decorative and hand-drawn? If hand-drawn, does it need its
   own drag handling or does it sit inside the OS corner hit zone?

2. **Edge resize on a frameless window.** How wide is the draggable edge region by default,
   can it be widened, and does `-webkit-app-region: drag` on the header conflict with edge
   resize or with the corner?

3. **Always-on-top levels.** `setAlwaysOnTop(flag, level)` levels available on macOS, and
   which one a task-list window should use so it floats over normal apps *without* fighting
   the island's own level (the island deliberately floats above the menu bar, ADR-0006, via
   `applyIslandWindowLevel()` in `electron/windows.ts:230`). Does a `'floating'`-level task
   window sit above or below the island, and can that be controlled?

4. **Geometry persistence.** Standard pattern for save/restore of bounds, and the failure
   modes worth guarding: window restored offscreen after a display change, restored larger
   than the current display, restore vs. `minWidth`/`minHeight` conflicts.

5. **Minimum viable window config** to match the Settings precedent (`electron/windows.ts:435`)
   while being frameless with a custom header.

Capture findings on a throwaway `research/electron-frameless-resize` branch or as a note
under `.scratch/task-list-features/`, and link it from this ticket's Answer.
