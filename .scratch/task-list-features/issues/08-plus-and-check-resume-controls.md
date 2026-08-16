# 08 — The + and ✓ resume controls

Type: grilling
Status: resolved via 04 — see that ticket's "Resolution — Part B"
Blocked by: 04 (closed 2026-08-16)

Q1–Q4 and Q6 are answered in 04 §B1–B4. Q5 (where the buttons render per host, and whether
the pause state degrades in narrow views) was deferred to **ticket 11**.

## Question

When pause-at-estimate fires, two buttons occupy the progress bar's slot: **+** (add and
start another session) and **✓** (complete this task, start the timer on the next one).
Ticket 04 decides *when* they appear; this decides what they do.

1. **What does + mutate?** Increment `estimatePomodoros` by 1 and start a focus block — or
   start a session without touching the plan, letting the task run 5/4? The former keeps
   the bar honest; the latter preserves the existing "keeps counting" spirit.

2. **What does ✓ do, in order?** Mark done → clear/advance `activeTaskId` → start a focus
   block. Note ticket 05 may already make the done path auto-advance, in which case ✓ is
   partly a no-op wrapper over existing behaviour — check before specifying new code.

3. **Do either of them skip the break?** Depends on ticket 04's boundary answer. If the
   pause lands *before* the break, both buttons starting a focus block means the user never
   breaks. If *after*, the break has already run and starting focus is natural.

4. **"If there are no more incomplete tasks then it starts a timer with no active tasks."**
   Confirm this means ✓ falls into ticket 05's no-task mode *and* starts running — a state
   where the timer runs with `activeTaskId === null`.

5. **Where do they render, in each host from ticket 03?** Two icon buttons must fit
   wherever the bar fits, including the narrowest collapsed cluster. If they cannot fit
   there, does the pause state degrade in narrow views?

6. **Tooltip copy** for both — native `title=""`, consistent with the rest of the app.

Motion in scope: the bar→buttons swap crossfade, `rm`-guarded.
