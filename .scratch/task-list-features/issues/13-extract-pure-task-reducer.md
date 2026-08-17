# 13 — Extract the pure task reducer, with a characterization check script

**What to build:** nothing a user can see. This is the prefactor that makes every ticket after
it testable.

Task logic currently lives behind a shell that imports Electron at module load to resolve the
user-data path, so it cannot be driven from a plain Node script. Pull the dependency-free logic
out into its own module — pure functions over task state, taking state in and returning state
out, with no filesystem, no Electron, no listeners. The persistence and broadcast shell stays
where it is and calls through to the extracted functions.

Then write an assertion script covering **today's** behaviour, so the extraction is provably
behaviour-preserving. It is the safety net tickets 14 through 22 land on top of.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

**Why this shape:** see the map's *Testing seams* standing decision. This is the one new seam in
the whole effort; everything else reuses what exists. The timer is deliberately **not** touched —
it is already constructible from plain functions and already has an assertion script.

- [ ] The pure module has no Electron, no `node:fs`, and no listener registry — it can be
      imported by a script run directly with `node`
- [ ] The persistence and broadcast shell keeps its current public surface; no caller outside it
      changes
- [ ] Add task, update task, delete task, clear completed and set active all route through the
      pure functions
- [ ] Focus-complete credit routes through the pure functions
- [ ] A new check script asserts current behaviour: adding auto-activates when nothing is active
      and remembers the estimate as the default; deleting the active task falls through to the
      first remaining incomplete one; clear-completed does the same; the daily total resets on
      date rollover
- [ ] The script prints per-case pass/fail lines and exits non-zero on failure, matching the
      existing check scripts
- [ ] It is registered as a `*:check` package script alongside the existing four
- [ ] Type-check and lint pass
