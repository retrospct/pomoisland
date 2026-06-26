# Handoff — Dynamic Island Pomodoro

> For the next agent. **Read this first, then assess the codebase, then check in with the
> owner before building.** Do not start new feature work until you've confirmed the plan
> with them (see "Your charter" at the bottom).

## TL;DR

A macOS notch-aware Pomodoro timer: **Electron + React + TypeScript + Vite** (via
`electron-vite`). Two frameless windows — a draggable **Island** (collapsed / peek /
expanded) and an **880px Settings** card. The main process owns the timer state machine and
persisted prefs; renderers are thin and driven over IPC.

The core experience is built and the Settings panel was just rebuilt to match the correct
design (`SettingsPanel.dc.html`). Everything typechecks, lints, builds, and the Settings
panel was visually verified. **Latest commit:** `499fcd5`.

## How to run / verify

```bash
npm install
npm run dev         # launches electron-vite dev (island + tray; open Settings from the tray)
npm run typecheck   # tsc on app + node configs
npm run lint        # eslint
npm run build       # production build into out/
npm run package     # electron-builder --mac --dir  (unpacked .app)
```

Notes:
- `dev`/`preview` prepend `env -u ELECTRON_RUN_AS_NODE` — without this, `electron.app` is
  `undefined` in this shell environment. Keep it.
- The main process is **CommonJS** (no `"type": "module"`). This was deliberate (see ADR-0002 /
  prior ESM/CJS interop pain). Don't reintroduce `"type": "module"`.
- The Island snaps to the **top-center of the work area**, not the literal hardware notch.

## Architecture (where things live)

```
electron/        Main process (CJS)
  main.ts          app lifecycle, bootstrap (island + tray + timer)
  windows.ts       island + settings BrowserWindow factories, drag + magnetic snap, auto-resize
  timer.ts         timer state machine (250ms tick; playPause/reset/skip/switchMode/advance)
  store.ts         hand-rolled JSON prefs store (userData/prefs.json) + DEFAULT_PREFS
  ipc.ts           IPC handlers (timer actions, prefs get/set/change, island drag/resize, windows)
  preload.ts       contextBridge → window.api
  tray.ts          menubar tray + menu
src/shared/      Types + helpers shared by main and both renderers
  types.ts         Prefs, TimerState, IPC contract, PomApi  ← single source of truth
  accent.ts        ACCENT_HEX, accentHex(), lighten/darken, resolveAccent (focus/break/urgent)
  ripple.ts        RIPPLE_DEFS (burst/echo/heartbeat/bloom) — shared by island + settings preview
  tokens.css       Folio design tokens
  format.ts        time formatting
src/island/      Island renderer (derive.ts view-model, Island.tsx, Ring/SessionDots/Menu, chime.ts)
src/settings/    Settings renderer (SettingsApp.tsx tabs, sections.tsx, palette.ts, settings.css)
design-reference/  Original Claude Design handoff (.dc.html + Folio tokens) — the source of truth for UI
docs/adr/        ADR-0001..0004
docs/agents/     Issue-tracker / triage-label / domain conventions
.scratch/        Local markdown issue tracker
CONTEXT.md       Domain vocabulary
.cursor/plans/dynamic_island_pomodoro_82c041b5.plan.md   The original plan
```

## What was just done (this session)

The Settings panel had been built from the **wrong** handoff file (`Settings.dc.html`, a
4-section sidebar). It was rebuilt to the intended **`SettingsPanel.dc.html`**: an 880px card,
**General** + **Preferences** tabs, two-column grid per tab. This forced a prefs-model
reconciliation across main + island:

- Durations renamed → `cFocus / cShort / cLong / cSessions`; `dailyGoal` kept.
- `autoBreak` + `autoFocus` collapsed into a single `autoStart`; added `dnd`.
- `theme` gained `'system'` (was `'auto'`); `accent` is now a **key**
  (`teal/clay/blue/violet/rose/green`) resolved to hex via `accentHex()`.
- Completion animation is now `ripple` with variants `burst/echo/heartbeat/bloom`, shared via
  `src/shared/ripple.ts` so the island and the Settings live preview render identically
  (the old `confetti`/`none` variants were dropped).
- Settings window is an 880px **frameless** card with an in-card **Close** button; the header
  is the drag region.
- **Accent-aware chrome** (added after first pass at owner's request): the panel's primary
  (`--sp-teal`, segmented fill, toggles, tint) follows the chosen accent — the pastel directly
  on dark, a `darken(base, 0.55)` version on light, with luminance-based text ink so any
  accent stays legible. Accent swatches still show their true colors.
- **Global show/hide shortcut** (owner request): `⌘⌥P` / `Ctrl+Alt+P` toggles the island via
  `electron/shortcuts.ts` (registered on ready, unregistered on quit; also shown as the tray
  item's accelerator). The accelerator is **hard-coded** for now — making it user-configurable
  is a follow-up. This is separate from the start/pause "⌥ Space" shortcut shown in Settings,
  which is still deferred.

> **Animations are intentionally un-tuned (later-stage task).** Every animation in the app
> (island breathe/peek/expand transitions, the completion ripples, urgent-amber, the Settings
> ripple preview) is a direct port of the design prototype's timings. **Fine-tuning their feel
> — durations, easing curves, choreography — is deliberately deferred to a later stage.** Don't
> treat the current timings as final; flag animation polish as its own pass.

## Decisions & deviations worth knowing

- `alwaysTop` and `magnetic` remain in `Prefs` (read by main for window behavior) but are
  **not surfaced** in `SettingsPanel.dc.html`, so there's no UI toggle for them anymore.
- The Settings "primary follows accent" behavior is a **deliberate enhancement** over the
  static-teal design. Owner explicitly wanted this.
- Completion chime is a single synthesized Web-Audio tone; the `sound` selection
  (chime/bell/marimba/digital/custom) is persisted but not yet mapped to distinct sounds.

## Known gaps / not yet wired (see `docs/adr/0004-defer-os-integrations.md`)

Persisted as prefs but **no OS behavior yet**: launch-at-login, do-not-disturb,
hide-during-screen-sharing, pause-when-idle, global shortcut, native notifications, ticking
sound, real bundled alarm sound files.

UI options persisted but **not yet rendered on the island**: `timerStyle` (outline/bar — the
island always draws the circular ring) and the alternate `layout` nuances.

⚠️ **Not re-verified live:** the **island** was rebound to the new prefs model but hasn't been
run end-to-end since the rework (timer/animations/drag). Worth a smoke test before trusting it.

## Open questions for the owner (raise these)

1. **Island fidelity:** smoke-test the island now, or proceed assuming it's fine?
2. **timerStyle / notch-layout:** implement the outline + progress-bar renderings on the
   island, or leave circular-only and drop those options from Settings?
3. **Distinct alarm sounds:** bundle real sound files for the `sound` picker, or keep one chime?
4. **Which deferred OS feature is highest value first** (native notifications, launch-at-login,
   pause-when-idle)? — the global **show/hide** shortcut is now wired; making it (and a
   start/pause shortcut) user-configurable is the natural follow-up.
5. **Notch literal-wrap:** is top-center snapping acceptable, or do we want true notch-outline
   wrapping?
6. **Packaging:** is a runnable `.app`/`.dmg` wanted soon, or keep iterating in `dev`?

## Your charter (next agent)

1. **Assess** the current state against `design-reference/` and the plan
   (`.cursor/plans/dynamic_island_pomodoro_82c041b5.plan.md`). Run `dev` and look at the
   island + both Settings tabs.
2. **Check in with the owner** on tuning vs. changing the plan, using the open questions above.
   Do **not** start a new feature until they've chosen a direction.
3. Keep the prefs model in `src/shared/types.ts` as the single source of truth; main + both
   renderers must stay consistent with it.
4. After any change: `npm run typecheck && npm run lint && npm run build`, and visually verify
   UI work (the prior agent used a temporary `capturePage` harness in `main.ts` gated by an
   env var, then removed it).
