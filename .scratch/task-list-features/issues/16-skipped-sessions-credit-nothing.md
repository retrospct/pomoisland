# 16 — Skipped sessions credit nothing, plus the Count skipped sessions toggle

**What to build:** pressing Next no longer counts as having done the work.

Today, ending a block early with Next credits both the task and your daily total — so four taps
of the global Next shortcut fully complete a four-session task, inflate your daily count, and can
earn you a milestone ring for work you didn't do.

After this ticket, a skipped block credits neither by default. A new Behavior setting restores the
old behaviour for anyone who used Next as a "done early" button.

**Blocked by:** 13 — credit is reducer behaviour and is proved through that seam.

**Status:** ready-for-agent

**Why this shape:** see [ticket 04 §A3](04-pause-at-planned-boundary-and-timer-state.md). A
session is one focus block; a block you cut short is not one. Both counters get the **same**
answer — splitting them would let a task and the day disagree about the same minute.

- [ ] The focus-complete hook receives the completion reason as an argument; it takes none today,
      so the credit path cannot tell an elapsed block from a skipped one even though the reason
      already exists on the completion event
- [ ] Task credit stays on the focus-complete channel — do **not** move it onto the general
      completion channel, which would reorder it after notifications and bring-to-front
- [ ] A skipped block credits neither the task's completed sessions nor the daily total
- [ ] An elapsed block credits both, exactly as today
- [ ] A new Behavior pref, default **off**, restores crediting for skipped blocks
- [ ] The pref sits in Behavior alongside the existing auto-start and pause-when-idle switches,
      **not** in the Tasks section — it governs what counts as a session at all, moving the daily
      total, the daily-goal reveal and the milestone rings, not just task counters
- [ ] Toggle copy: title "Count skipped sessions", description "A session you end early with Next
      still counts toward your task estimate and daily goal."
- [ ] Check-script cases: elapsed credits both, skipped credits neither, skipped credits both with
      the pref on
- [ ] Type-check and lint pass

**Call out in the release notes:** this changes behaviour for existing users, whose skips credit
today. It is the right default, but it is a change and should not pass as a new-feature default.
