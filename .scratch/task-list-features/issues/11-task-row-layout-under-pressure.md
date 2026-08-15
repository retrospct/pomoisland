# 11 — Task row layout under pressure

Type: prototype
Status: deferred — decided during implementation, not on the map
Blocked by: 06, 09

## Question

The task row is about to carry six things in a 320px-wide docked panel
(`Island.tsx:1438` derives the width; `TaskList.tsx:19` defaults to 320): drag handle,
checkbox, title, pencil, session stepper (`C/E` plus +/−), delete. Today it carries four,
and two of those are hover-revealed.

1. **Does it fit?** And if not, what gives — does the pencil move into the hover state
   *only* (as the brief asks), does the stepper collapse behind its count until clicked
   (it already toggles via `onCountClick`, `TaskList.tsx:486`), or does the row need two
   lines at narrow widths?

2. **The reflow bug.** Hover-revealed controls are currently **unmounted**, not hidden
   (`SessionStepper` renders `{buttonsVisible && <button…>}`, `TaskList.tsx:562`), so rows
   physically reflow on hover. Adding a hover-revealed pencil makes this worse. Settled that
   we switch to opacity so the fade *is* the fix — but decide whether the space is reserved
   permanently (row always as wide as its hover state) or reserved only while hovered.

3. **What is hover-revealed vs always visible?** Brief says the pencil joins +/−. Delete is
   always visible today (`TaskList.tsx:492`). Ticket 09 asks the same about the drag handle.
   Settle the whole set at once so the row has one rule, not four.

4. **Does the answer differ docked vs detached?** A detached window can be much wider, so
   the row could reveal everything at width and compress only when narrow. Is that
   worth the branching, or does one layout serve both?

5. **Click-target collisions.** Every control already calls `e.stopPropagation()` because
   the row itself is the set-active target (`TaskList.tsx:363`), and ticket 05 turns that
   into a toggle. Adding a drag handle means a pointer-down that must *not* toggle
   selection. Verify no gesture becomes ambiguous.

Prototype at both widths rather than reasoning about it.
