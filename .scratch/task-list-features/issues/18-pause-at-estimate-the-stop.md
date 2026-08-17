# 18 — Pause at estimate: the stop

**What to build:** your estimate finally means something.

Say a task will take four sessions, work four sessions, and today nothing happens — the counter
rolls on to 5/4, 8/4, 12/4 and the app never asks whether that was the plan.

After this ticket: when a task reaches its estimate, the break runs exactly as normal, and then
the timer **stops** at the start of what would be the next focus session instead of rolling on.
The stop beats Auto-start. You resume with play.

**Blocked by:** 14 — the condition reads the renamed count fields.

**Status:** ready-for-agent

**Why this shape:** see [ticket 04 Part A](04-pause-at-planned-boundary-and-timer-state.md) and
`docs/adr/0008-derived-state-over-modelled-state.md`.

**The two resume controls are deliberately not in this ticket** — see 19. The stop on its own is
verifiable and usable: the timer stops, you press play. Shipping both together does not fit one
context window.

- [ ] The stop lands at the break-to-focus boundary, **not** at the end of the final focus block —
      both resume controls start a focus session, so pausing earlier would make finishing a task
      the one path through the app that silently eats a break
- [ ] **No new `Status`.** The lifecycle stays as it is; at the stop the timer is `idle` at a
      focus boundary, which is what `idle` already means. Reusing `paused` would make the tray say
      "Focus paused" and the panel say "Paused, pick it back up", neither of which is true
- [ ] At-estimate is a **derived predicate**, never stored, never broadcast, never persisted —
      a pure function of status, mode, active task and the new pref
- [ ] The predicate lives in the pure module from ticket 13 and is **injected into the timer as a
      getter**, in the same shape as the existing prefs getter, so the timer never imports the
      task store and stays constructible from a plain Node script
- [ ] The condition is at-or-past the estimate, not equality — equality would fire once at 4/4 and
      never again at 5/4, because ticket 19's + never raises the estimate
- [ ] It is evaluated **only at the focus boundary**, never at mutation time, so the estimate
      stepper can never itself stop a running timer
- [ ] Lowering an estimate below the completed count fires at the next boundary, and reactivating
      an already over-estimate task means the next session ends at the stop — both correct, both
      deliberately un-special-cased
- [ ] The completion path is untouched: flourish, sound, notification and bring-to-front all still
      fire. Only the scheduled advance is replaced
- [ ] Precedence over Auto-start lives in the advance function's break-to-focus branch, before the
      auto-start pref is read
- [ ] A long-break boundary changes nothing — the focus-to-break branch is untouched, so by the
      time the check runs the break has already happened
- [ ] The global play/pause shortcut and the tray item start a session from the stop; making a
      global control silently inert based on task state is invisible from the background
- [ ] Reset, skip and switch-mode leave no residue, because there is no state to leave
- [ ] The break-completion notification branches its body when the stop is about to land. Title
      stays "Break over"; body becomes "You've hit your estimate. Pick up where you left off, or
      finish the task."
- [ ] A new Tasks pref, default **on**, toggles the whole behaviour. There is no third
      "respects Auto-start" control — that is this pref's off-branch
- [ ] Timer check-script cases: the stop lands after the break; it beats Auto-start; status is
      `idle` and mode is `focus` at the stop; the completion event still fires for the final
      session; a long-break boundary changes nothing
- [ ] Reducer check-script cases: the predicate is true at and beyond the estimate, false below,
      false with no active task, false with the pref off
- [ ] Type-check and lint pass

**Accepted consequence:** the predicate cannot tell "stopped because you hit your estimate" from
"idle for any other reason", so an over-estimate active task shows the stop after Reset and at app
launch. This is correct — if the active task is over its estimate and the timer sits at a focus
boundary, the question is the right one however you arrived. Do not add a flag to suppress it.

**This overturns a deliberate existing decision** — the task store currently documents that tasks
are never auto-completed at estimate and "keeps counting, e.g. 8/7". The stop asks; it still never
auto-completes.
