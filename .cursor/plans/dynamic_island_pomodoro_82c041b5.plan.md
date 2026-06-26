---
name: Dynamic Island Pomodoro
overview: "Build the Dynamic Island Pomodoro as an Electron + React + TypeScript (Vite) macOS desktop app, recreating the Claude Design handoff pixel-perfectly: a notch-aware island (collapsed / peek / expanded across the full session lifecycle) plus a fully themed Settings window, with a main-process timer engine and persisted preferences. Deep OS hooks (real screen-share detection, system idle, launch-at-login, global shortcut) are scaffolded as persisted prefs and deferred to a follow-up."
todos:
  - id: repo-init
    content: git init the pomisland repo; run setup-matt-pocock-skills with local-markdown issue tracker (.scratch/), default triage labels, single-context docs; write the Agent skills block + docs/agents/*.md.
    status: completed
  - id: adrs
    content: Write CONTEXT.md (domain vocabulary) + docs/adr/ADR-0001..0004 (stack, main-process-owned timer/prefs, two-window auto-resize, deferred OS integrations).
    status: completed
  - id: scaffold
    content: Scaffold electron-vite (React+TS) multi-renderer project (island + settings entries), add electron-store, electron-builder, @fontsource fonts, eslint/prettier; import handoff into design-reference/.
    status: completed
  - id: tokens
    content: Port Folio tokens (colors/typography/spacing) + island dark palette and accent/micro-message logic into src/shared (tokens.css, format.ts, types.ts).
    status: completed
  - id: main-windows
    content: "Main process: island window (frameless/transparent/always-on-top, top-center, content auto-resize) + settings window (780x600 frameless) + tray + lifecycle."
    status: completed
  - id: store
    content: electron-store schema + defaults mirroring Settings state; prefs:get/set/changed IPC.
    status: completed
  - id: timer
    content: Main-process timer state machine ported from the canvas (tick/play/pause/reset/skip/complete/advance/switchMode) driven by prefs; broadcast timer:state.
    status: completed
  - id: preload
    content: Preload contextBridge exposing typed window.api (timer, prefs, island resize/drag, window/app actions).
    status: completed
  - id: island-ui
    content: "Island renderer: pixel-perfect collapsed/peek/expanded (Ring, SessionDots, Glyphs, Menu), animations (breathe/ripple/confetti/pop/urgent), micro-messages, layouts."
    status: completed
  - id: drag-snap
    content: Island drag + magnetic notch snap (window move via IPC, snap glow + drop hint).
    status: completed
  - id: settings-ui
    content: "Settings renderer: titlebar + 4 sections matching Settings.dc.html, live theme/accent theming, all controls wired to persisted prefs."
    status: completed
  - id: wire-actions
    content: "Wire actions end-to-end: open Settings from menu, switch mode, quit/tray, live theme+accent to island, basic completion chime + volume."
    status: completed
  - id: docs-verify
    content: Add README + scripts; run dev and verify lifecycle, drag/snap, live reskin, and persistence across restart against design-reference.
    status: completed
isProject: false
---

# Dynamic Island Pomodoro — Implementation Plan

## Goal

Recreate the handoff (`Dynamic Island Pomodoro.dc.html` + its imports `Island`, `Settings`, `NotchConcept`, `RippleConcept`) as a real Electron desktop app in the empty `pomisland/` workspace. Match the visual output exactly; do not copy the prototype's `DCLogic`/`dc-import` plumbing.

## Architecture

```mermaid
flowchart TD
  subgraph main [Electron main process]
    timer[timer engine\nstate machine]
    store[electron-store\npersisted prefs]
    win[window + tray mgr]
    ipc[IPC bridge / broadcast]
  end
  subgraph islandwin [Island window\nframeless, transparent, always-on-top]
    island[React: Island\ncollapsed / peek / expanded]
  end
  subgraph setwin [Settings window\n780x600]
    settings[React: Settings\nTimer / Sounds / Appearance / Behavior]
  end
  preload[preload\ncontextBridge window.api]
  timer --> ipc
  store --> ipc
  ipc --> preload
  preload --> island
  preload --> settings
  island -->|"play/pause, drag-snap, open settings, quit"| preload
  settings -->|"set prefs (live)"| preload
  win --> islandwin
  win --> setwin
```



State ownership:

- Main process owns the **timer runtime** (`status, mode, total, remaining, sessionIndex`) and **persisted prefs** (everything in the Settings window). Both windows subscribe via IPC and render; all mutations go back through IPC. This is why a single accent/theme change in Settings instantly reskins the island.

## Stack & scaffolding

- `electron-vite` (Vite + React + TS, multi-renderer), `electron-builder` for packaging, `electron-store` for persistence.
- Fonts bundled offline via `@fontsource/fraunces`, `@fontsource/inter`, `@fontsource/ibm-plex-mono` (handoff loads these three from Google Fonts in `tokens/fonts.css`).
- Two renderer entries: `index.html` (island) and `settings.html` (settings).

## Design tokens (ported verbatim)

Port the Folio tokens from the bundle into `src/shared/tokens.css` — colors (`colors.css`), typography (`typography.css`), spacing/radii/motion (`spacing.css`). Add the island's own dark palette + accent logic extracted from `Island.dc.html` `renderVals`:

- focus accent `#8FC8C0` (overridden by user accent), break `#E2A24A`, final-minute urgent `#ECB24E`; `accentBright`/`accentSoft` derivations; island surface `#17191D`, text `#F2F1EC`.

## Files to create

### Main process (`electron/`)

- `main.ts` — app lifecycle, create island window + tray, register IPC.
- `windows.ts` — factories:
  - island: `frame:false, transparent:true, alwaysOnTop:true, skipTaskbar:true, resizable:false, hasShadow:false`, pinned top-center; **auto-resizes** to fit content (collapsed pill ≈ small, peek 266px, expanded 320px) via a `resize` IPC from a renderer `ResizeObserver`.
  - settings: `780×600` (design hint), frameless, draws the titlebar/traffic-lights from `Settings.dc.html` wired to real close/minimize/zoom.
- `timer.ts` — state machine ported from `Dynamic Island Pomodoro.dc.html` (250ms tick, `playPause/reset/skip/complete/advance/switchMode`, long break every `longEvery`), driven by persisted durations; broadcasts state on change.
- `store.ts` — `electron-store` schema + defaults mirroring `Settings.dc.html` state (durations, presets, automation, sounds, appearance, behavior toggles, `theme`, `accent`).
- `ipc.ts` — channels: `timer:state` (broadcast), `timer:action`, `prefs:get/set/changed`, `island:resize`, `island:drag/snap`, `window:settings.open`, `app:quit`.
- `preload.ts` — `contextBridge` exposing typed `window.api`.

### Shared (`src/shared/`)

- `types.ts` — `TimerState`, `Prefs`, IPC contracts.
- `tokens.css` — ported Folio tokens + island palette.
- `format.ts` — `mm:ss`, `frac`, accent resolution, micro-message selection (ported from `Island.dc.html`).

### Island renderer (`src/island/`)

- `main.tsx`, `IslandApp.tsx` — subscribe to `timer:state` + `prefs`, host drag/snap, render `Island`.
- `Island.tsx` — three modes pixel-matched to `Island.dc.html`:
  - **collapsed** pill (min-height 44px, gap 11px; layouts `split`/`minimal`/`compact` toggle ring/time/dots per `showRing`/`showTimeText`),
  - **peek** card (266px, task + progress bar + play/skip),
  - **expanded** panel (320px, 64px ring, 38px time, micro-message, reset/play/skip + ⋯ menu).
- `Ring.tsx`, `SessionDots.tsx`, `Glyphs.tsx`, `Menu.tsx` (switch mode / settings / quit + "encouraging messages" toggle).
- `animations.css` — `islandBreathe`, `islandRipple A/B/C`, `islandGlow`, `islandPop`, `islandConfetti`, urgent amber; completion animation switched by the `anim` pref (`ripple`/`bloom`/`heartbeat`/`confetti`/`none`) using `RippleConcept` timings.
- Drag + **magnetic snap**: dragging moves the island window; near top-center shows the snap glow + "DROP TO SNAP" hint and snaps to the notch (logic ported from `startDrag/onDrag/endDrag`).

### Settings renderer (`src/settings/`)

- `main.tsx`, `SettingsApp.tsx` — sidebar (Timer / Sounds & Alerts / Appearance / Behavior) + titlebar, all themed off `theme` + `accent` CSS vars exactly as `Settings.dc.html` `palette()`/`windowStyle`.
- Section components matching `Settings.dc.html`: presets (classic/focus/custom with editable steppers), long-break-after, auto-start toggles; alarm list + volume + ticking + completion-animation chips + notify; theme segmented + accent swatches + timer-style (circular/outline/bar) + collapsed-layout (split/minimal/compact) + dots/micro-message toggles; behavior toggles + global-shortcut display + daily-goal.
- Every control writes through `prefs:set` (live), persisted by `store.ts`.

### Reference + meta

- Extract the handoff into `pomisland/design-reference/` (read-only source of truth) and keep `Dynamic Island Pomodoro Static.html` for visual diffing.
- `README.md` (run/build), `package.json`, `tsconfig`, `electron.vite.config.ts`, `electron-builder.yml`, eslint/prettier.

## Wired end-to-end in this pass

Timer lifecycle; collapsed/peek/expanded; drag + notch snap; full Settings with live theme/accent + persistence; menu actions (switch mode, open Settings, quit); tray; always-on-top; basic Web-Audio completion chime + volume.

## Deferred (persisted as prefs, no OS behavior yet)

Real screen-share detection (`hideShare`), system-idle pause (`pauseIdle`), launch-at-login (`launchLogin`), global shortcut, native notifications, packaged alarm sound files, and the exploratory NotchConcept variants beyond circular/outline/bar.

## Verification

`npm run dev` launches the island pinned to the notch + Settings; tick a focus block to completion (ripple), pause/reset/skip, drag away and snap back, switch focus/break, change accent+theme in Settings and confirm the island reskins live and prefs survive restart. Spot-check dimensions/colors against `design-reference`.