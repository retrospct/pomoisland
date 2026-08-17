# 19 — The + and ✓ resume controls

**What to build:** the stop from ticket 18 becomes a decision instead of a dead end.

Two controls take the progress bar's place while a task sits at its estimate. **+** starts another
session. **✓** finishes the task and starts the timer on the next one.

**Blocked by:** 15 (✓ relies on the done-path auto-advance), 17 (the bar's slot is where these
render), 18 (the stop is what summons them).

**Status:** ready-for-agent

**Why this shape:** see [ticket 04 Part B](04-pause-at-planned-boundary-and-timer-state.md).

- [ ] Both controls occupy the progress bar's slot while at estimate, swapping in via a crossfade
      guarded by the existing reduced-motion flag
- [ ] The slot's fixed height from ticket 17 means the swap never reflows — this matters most in
      Peek, which is hover-revealed, and where a card that changes height under the pointer is a
      known past bug in this codebase
- [ ] **+ starts a focus session and does not touch the estimate.** The task runs 5/4, 6/4, and
      the stop fires again at every subsequent boundary
- [ ] **✓ is mark-done plus a start, and owns no advance logic** — it inherits ticket 15's
      done-path auto-advance. Two code paths independently choosing "the next task" is how they
      drift
- [ ] With no incomplete task left, ✓ starts a focus block with no active task, crediting nothing
      at the end
- [ ] Neither control skips a break — by the time either is visible the break has already run
- [ ] Deselecting the active task while the controls are showing is a legitimate third exit: the
      predicate goes false, the controls vanish, the timer stays idle. No special-casing
- [ ] Tooltips are native, matching the rest of the app: + reads "Start another session"; ✓ reads
      "Finish task and start the next", falling back to "Finish task" when no incomplete task
      remains, so the copy never promises a next that doesn't exist
- [ ] The bar carries an over-estimate treatment while at estimate, and the controls pulse, both
      reduced-motion guarded
- [ ] How the controls degrade in the narrower of the two hosts is settled here, with the code in
      front of you — this is the part of [ticket 11](11-task-row-layout-under-pressure.md) that
      belongs to the controls
- [ ] Type-check and lint pass

**The nag loop is the feature, not a bug to design around.** + refusing to raise the estimate is
the whole point: the app keeps telling you that you are working past what you estimated, and the
way out is to open the list and revise the estimate deliberately. Raising it automatically would
silence the signal at the exact moment the signal is the product — under that design 10/4 costs
nothing because the number quietly rewrites itself.

**Deliberately not built:** a repeating audible cue until the user acts. The app has no precedent
for one — its alarms are one-shot, its notification is single and silent, and its only
"come look" mechanism shows the island without stealing focus. A repeating beep has no dismissal
short of interacting, which punishes exactly the person who stepped away from the desk. Most of
the weight already comes from the timer stopping and staying stopped. If the visual proves too
quiet in practice, a single extra escalation is a small follow-up; shipping it first is very hard
to walk back.
