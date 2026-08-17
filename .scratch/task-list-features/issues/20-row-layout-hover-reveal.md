# 20 — Task row layout: opacity hover-reveal and the edit pencil

**What to build:** rows stop moving under your pointer.

Hover-revealed controls are currently **unmounted** rather than hidden, so a row physically
reflows the moment you hover it — and the row is about to carry more, not less. Switch the reveal
to opacity so the fade *is* the fix, then settle the whole hover-revealed set at once so the row
has one rule rather than four.

The edit pencil joins the hover set as part of this.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

**Why this shape:** see [ticket 11](11-task-row-layout-under-pressure.md), whose open questions
are answered here with the code in front of you.

Note the file overlap: tickets 15 and 23 also edit the task list and will conflict on merge, but
neither gates this one.

- [ ] Hover-revealed controls fade rather than unmount; rows do not change size on hover
- [ ] Decide and document whether the space is reserved permanently (row always as wide as its
      hover state) or only while hovered
- [ ] The edit pencil is hover-revealed, joining the estimate steppers
- [ ] One rule governs the whole set — which controls are always visible and which are
      hover-revealed is settled together, not per control
- [ ] The row still fits its docked width with everything it now carries: checkbox, title, pencil,
      estimate stepper and delete
- [ ] Every control still stops its click from reaching the row, which is the set-active target
- [ ] No gesture becomes ambiguous — verify against ticket 15's row-click toggle
- [ ] Type-check and lint pass

**Already settled, do not re-open:** the segmented progress bar does **not** come to the task
rows. Rows keep their numeric count, because a list is a comparison context — "3/5" and "1/8"
compare instantly as numbers and poorly as bars of differing segment counts. That is one less
thing to fit.

**Not in this ticket:** the drag handle (ticket 22) and the truncation popover (ticket 21). Both
land on the layout this ticket settles.
