# PomoIsland — Dynamic Island Pomodoro

A macOS notch-aware Pomodoro timer built with Electron + React + TypeScript (Vite).

See `CONTEXT.md` for domain vocabulary and `docs/adr/` for architectural decisions.

## Agent skills

### Issue tracker

Issues and PRDs live as local markdown under `.scratch/<feature-slug>/` (no remote tracker). External PRs are not a triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles map 1:1 to their default strings (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context repo: one `CONTEXT.md` + `docs/adr/` at the root. See `docs/agents/domain.md`.

## Learned User Preferences

- Don't start new feature work without first assessing current state and checking in (often via the `/grill-with-docs` interview) on whether to tune what exists or change the plan.
- Sound/alarm design aesthetic: synthesized, ambient "Blade Runner 2049 / Dune / pocket-synth" voices rather than a single generic chime (see ADR-0005).
- Drives work through the Matt Pocock skill flow (`/grill-with-docs`, `/handoff`, `/to-prd`, `/to-issues`, `/implement`).
- When changing/toggling a sound setting, play a short audible preview (~5 beats/ticks) and ALWAYS stop any currently-playing audio before starting the next.
- Ticking should not run continuously during focus; the desired feel is a subtle transition cue — ticks fading in over the last ~30s of a cycle plus a distinct start sound (woosh/crisp click) — rather than ticks the whole cycle.
- Clicking outside the island in any expanded or peek state should retract it to the minimized notch view.
- For new `/implement` sessions, always switch to a feature worktree off `main` first before starting file edits.
- Default collapsed island: mode label + timer countdown + session dots below the notch; progressive ring off by default (outline timer style shows progress around the notch).
- Element placement semantics: Left/Right flank the notch on the same row (vertically centered); Below sits directly under the notch; content pills should hug the notch tightly.
- Each collapsed element (ring, mode label, countdown, dots) is independently Off/Left/Below/Right — per-element visibility replaced the old Notch layout presets (split/minimal/compact).
- When mode label and countdown are both Below, stack them vertically (label above countdown).

## Learned Workspace Facts

- After any change, run `npm run typecheck && npm run lint && npm run build` and visually verify UI work before considering it done.
- `src/shared/types.ts` is the single source of truth for the prefs model; bind UI and timer to it rather than duplicating shape.
- `design-reference/` is the visual source of truth for UI fidelity.
- All animations are intentionally un-tuned; tuning their feel (durations/easing/choreography + `prefers-reduced-motion`) is a deliberate later-stage pass, not part of normal feature work.
- Global show/hide shortcut is wired to ⌘⌥P.
- Use `pnpm run <script>` (not `npm run`) inside worktrees; pnpm v9+ blocks dependency postinstall scripts by default — approve builds for `electron` and `esbuild` (electron's postinstall downloads its binary `dist`, and skipping it breaks `dev`).
- The repo uses linked git worktrees for parallel `cursor/`-prefixed branches off `main` (never commit or push directly to `main`; sibling `pomisland-<slug>` dirs or in-repo `.worktrees/<slug>/`); push the branch to origin first, then use `move_agent_to_root` so file edits land in the correct tree. If `move_agent_to_root` fails (e.g. because `main` is already locked by the primary worktree), skip the root switch and work directly at the worktree path — point all Shell commands and file edits at the absolute worktree path.
- When snapped, the island intentionally floats above the macOS menu bar on all displays (ADR-0006) so it emerges from the notch and left/right element clusters can flank the camera.
- Electron UA stylesheet bleeds through `<button>` elements on hover: keep `background: transparent` as an inline style AND use `!important` on CSS hover rules, or the browser UA background shows through.
- Product name is "PomoIsland" (capital I); the git repo/remote and npm package name stay all-lowercase (`pomisland`/`pomoisland`) — the rename is display-name-only and in-repo.
- Multi-option settings use a three-button segmented control matching the Theme/color-picker pattern (e.g. Ticking sound Off/Soft/Crisp), not a binary toggle.
- Linear is now used to track outstanding work items/tickets (alongside the local `.scratch/` markdown convention).

## Cursor Cloud specific instructions

- Node/pnpm: the base image ships `/exec-daemon/node` (v22), which shadows the required Node 24 on `PATH`. A login shell auto-selects Node 24 via nvm (wired into `~/.bashrc`); in a non-login shell run `. "$HOME/.nvm/nvm.sh" && nvm use 24` first. `pnpm` (pinned `pnpm@11.9.0`) is provided by corepack under Node 24, not a global — `corepack enable pnpm` if `pnpm: command not found`.
- Electron binary: pnpm's build gating can skip electron's postinstall, leaving `node_modules/electron/dist/electron` missing (so `dev`/`preview` fail). The startup update script fetches it; if it's ever absent, run `node node_modules/electron/install.js`.
- This is a macOS app but it DOES run here for dev/manual testing under Electron on X11. Launch the GUI with `DISPLAY=:1 pnpm dev` (renders on the desktop the computerUse tooling sees). Standard scripts (`dev`/`build`/`typecheck`/`lint`, plus `audio:check`/`tick:check`/`placement:check`/`notch:check`) are in `package.json` / README.
- Benign on this headless Linux VM: startup logs `Failed to connect to the bus` (no dbus), `Add _NET_WM_WINDOW_TYPE_PANEL` (macOS `type:'panel'` window), and `Gtk: gtk_widget_add_accelerator ... assertion failed`. The app still launches and works.
- macOS-only behaviors are inert on Linux: notch detection reports `hasNotch=false` so the island snaps to the top-center of the screen instead of wrapping a notch; dock/menu-bar-float/panel semantics don't apply. The island (collapsed/peek/expanded), timer state machine, and Settings still render and are testable.
