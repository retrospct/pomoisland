# Context: PomoIsland

A macOS notch-aware Pomodoro timer. The UI lives as a "dynamic island" that hugs the
MacBook camera notch (or floats freely on external displays), glances small, and expands
on tap. Built from a Claude Design handoff (`design-reference/`).

## Glossary

Use these terms exactly; avoid the synonyms in parentheses.

- **Island** — the core widget. Renders one of three presentations. (not: "pill widget", "badge")
- **Collapsed** — the small glanceable presentation: a pill with ring, time, and session dots.
- **Peek** — the hover-revealed mid-size card showing task + progress + play/skip. Only when
  collapsed, snapped, and not dragging. (not: "hover card", "preview")
- **Expanded** — the full panel: large ring, time, micro-message, transport controls, ⋯ menu.
- **Notch** — the MacBook camera housing. Opaque hardware; UI sits below it or hugs its outline,
  never on top. When the island is "snapped" it docks top-center against the notch.
- **Snap / magnetic snap** — docking the island to the notch top-center when dragged near it.
- **Floating** — the island placed anywhere by dragging (Mode 2 / external displays).

### Timer domain

- **Status** — the runtime lifecycle: `idle` → `running` → `paused` → `complete`. (not: "phase")
- **Mode** — what is being timed: `focus` or `break`. A break can be short or long.
- **Session** — one focus block. (not: "pomodoro" in code; "pomodoro" is fine in user copy)
- **Round** — a group of focus sessions; a **long break** follows every `longEvery` sessions.
- **Total / remaining** — block duration and time left, in seconds.
- **Preset** — a bundle of durations: `classic` (25/5/15), `focus` (50/10/20), `custom`.

### Appearance domain

- **Accent** — the user-chosen highlight color; drives the ring, dots, and Settings theming.
  Focus uses the accent; break uses a warm clay; the final minute shifts to urgent amber.
  The swatches are pastels; on a light theme the accent (and break/urgent) is darkened for
  legibility — the same treatment in both the island and Settings windows.
- **Timer style** — the notch-native progress treatment (design handoff A–H, see
  `src/shared/NotchProgress.tsx` + ADR-0006). `below` is the pill below the notch (keeps the
  per-element placement model); `outline` / `glow` / `front` trace the notch outline as a
  filling bar; `converge` / `split` fill the outline from/to center; `underlight` and `comet`
  are ambient "running" cues that don't encode progress (they pair with the time readout).
- **Layout** — collapsed density: `split`, `minimal`, `compact`.
- **Micro-message / encouraging message** — the small serif nudge in the expanded panel.
- **Completion animation / "Done animation"** — the ripple that fires on finishing a block.
  Variants: `burst`, `echo`, `heartbeat`, `bloom` (the prototype's `confetti`/`none` were dropped).
- **Sound / voice** — the synthesized completion cue (`Sound` in `types.ts`): the clean built-ins
  `chime` / `bell` / `marimba` / `digital`, and the cinematic/pocket-synth set
  `halcyon` (Blade Runner pad) / `spice` (Dune sub+brass) / `pocket` (arcade arp) /
  `koto` (ASMR pluck) / `aurora` (sampled ambient clip from a Microcosm demo, synth fallback).
  Hand-rolled in Web Audio, with a
  master safety limiter and a silent offline validator (`npm run audio:check`) — see
  `docs/adr/0005-synthesized-sound-engine.md`.
- **Tick / ticking sound** — the per-second focus cue (`TickSound` in `types.ts`): `off`,
  `soft` (low woodblock), or `crisp` (brighter click). Synthesized by the same engine (routed
  fully dry — no reverb tail) and played once per second by the island while focusing+running
  (`playTick`).
  Note: a "transition-cue" mode (silent focus + last-30s fade-in + start woosh) was attempted
  and **pulled** due to an unreliable tick cadence — see
  `.scratch/ticking-sound/issues/01-ticking-cadence-unreliable.md`.

## Architecture in one breath

The **main process** owns the timer runtime and persisted **prefs** (single source of truth).
Two renderer windows — the **island** and **Settings** — subscribe via IPC and render; all
mutations flow back through IPC. Changing accent/theme in Settings instantly reskins the island
because both windows read the same broadcast state. See `docs/adr/`.
