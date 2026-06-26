# Context: Pomisland

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
- **Timer style** — how progress is drawn: `circular` (ring), `outline` (notch outline), `bar`.
- **Layout** — collapsed density: `split`, `minimal`, `compact`.
- **Micro-message / encouraging message** — the small serif nudge in the expanded panel.
- **Completion animation** — the burst on finishing a block: `ripple`, `bloom`, `heartbeat`,
  `confetti`, `none`.

## Architecture in one breath

The **main process** owns the timer runtime and persisted **prefs** (single source of truth).
Two renderer windows — the **island** and **Settings** — subscribe via IPC and render; all
mutations flow back through IPC. Changing accent/theme in Settings instantly reskins the island
because both windows read the same broadcast state. See `docs/adr/`.
