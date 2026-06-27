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

## Learned Workspace Facts

- After any change, run `npm run typecheck && npm run lint && npm run build` and visually verify UI work before considering it done.
- `src/shared/types.ts` is the single source of truth for the prefs model; bind UI and timer to it rather than duplicating shape.
- `design-reference/` is the visual source of truth for UI fidelity.
- All animations are intentionally un-tuned; tuning their feel (durations/easing/choreography + `prefers-reduced-motion`) is a deliberate later-stage pass, not part of normal feature work.
- Global show/hide shortcut is wired to ⌘⌥P.
- Git remote: `git@github.com:retrospct/pomisland.git`.
- pnpm v9+ blocks dependency postinstall scripts by default; approve builds for `electron` and `esbuild` (electron's postinstall downloads its binary `dist`, and skipping it breaks `dev`).
- "chip" is shorthand for splitting work into small, independently-shippable tasks/chunks.
- Product name is "Pomoisland" (double "o"); the git repo/remote stays `pomisland` (single "o") — the rename is product-name-only and in-repo.
- Multi-option settings use a three-button segmented control matching the Theme/color-picker pattern (e.g. Ticking sound Off/Soft/Crisp), not a binary toggle.
