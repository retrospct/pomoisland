# Pomoisland — Dynamic Island Pomodoro

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

## Learned Workspace Facts

- After any change, run `npm run typecheck && npm run lint && npm run build` and visually verify UI work before considering it done.
- `src/shared/types.ts` is the single source of truth for the prefs model; bind UI and timer to it rather than duplicating shape.
- `design-reference/` is the visual source of truth for UI fidelity.
- All animations are intentionally un-tuned; tuning their feel (durations/easing/choreography + `prefers-reduced-motion`) is a deliberate later-stage pass, not part of normal feature work.
- Global show/hide shortcut is wired to ⌘⌥P.
- pnpm v9+ blocks dependency postinstall scripts by default; approve builds for `electron` and `esbuild` (electron's postinstall downloads its binary `dist`, and skipping it breaks `dev`).
- The repo uses multiple linked git worktrees for parallel `cursor/` branches; push the branch to origin first, then use `move_agent_to_root` so file edits land in the correct tree.
- Electron UA stylesheet bleeds through `<button>` elements on hover: keep `background: transparent` as an inline style AND use `!important` on CSS hover rules, or the browser UA background shows through.
- Product name is "Pomoisland" (double "o"); the git repo/remote stays `pomisland` (single "o") — the rename is product-name-only and in-repo.
- Multi-option settings use a three-button segmented control matching the Theme/color-picker pattern (e.g. Ticking sound Off/Soft/Crisp), not a binary toggle.
- New work goes on a `cursor/`-prefixed branch; never commit or push directly to the default branch (`main`).
- Linear is now used to track outstanding work items/tickets (alongside the local `.scratch/` markdown convention).
