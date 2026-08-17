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
  A session belongs to a **round**, and when a task is active, to that **task** as well.
- **Round** — a group of focus sessions; a **long break** follows every `cSessions` sessions
  (user-configurable, 2–8). Settings calls this "Sessions until long break".
- **Total / remaining** — block duration and time left, in seconds.
- **Preset** — a bundle of durations: `classic` (25/5/15), `focus` (50/10/20), `custom`.

### Task domain

- **Task** — a named thing to work on, with an estimate and a completion state. The main process
  owns the list; it renders either **docked** or **detached**. (not: "todo", "item")
- **Docked / detached** — where the task list lives. Docked is the inline panel below the timer
  in the island; detached is the list's own window. Detach is **exclusive**: while detached the
  island never renders the inline panel, and every route that used to open it focuses the window
  instead. Moving between the two is **pop out** / **pop in**. (not: "pinned" for this axis)
- **Pin** — always-on-top, and nothing else. It says where a window sits in the z-order, never
  where the task list lives.
- **Active task** — the one task a completed focus session is credited to. At most one, and
  possibly none: no active task is a normal state, not an error, and a session can run without
  one, crediting nothing.
- **Estimate / estimated sessions** — how many focus sessions a task is expected to take. It is
  a guess the user revises, not a commitment, so a task may exceed it (e.g. 8/7).
  (not: "planned sessions", "pomodoros")
- **Completed sessions** — focus sessions credited to a task so far. Distinct from a session's
  place in a **round** — the two counters are independent, and the receiver disambiguates them.

### Shortcuts

- **Shortcut (binding)** — a user-rebindable global accelerator mapped to one action:
  **show/hide** island, **play/pause**, **next** (skip to the next block). Defaults are the
  ⌘⌥-arrow family (↑ / ↓ / →; ⌘⌥← is reserved for a future prev/reset).
- **Unbound** — a shortcut with no accelerator assigned; that action has no global hotkey.
- **Open Settings** — reached via the ⌘, app-menu item (Preferences), not a global shortcut.
- **Trigger region** — the area whose hover expands the collapsed island to **Peek**. It is the
  visible island ink only; the transparent scaffolding (notch spacer, ears, menu-room slack) is a
  non-triggering dead zone, distinct from the larger window/layout box.

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

The **main process** owns the timer runtime, persisted **prefs** and the **task** list (single
source of truth). The renderer windows — the **island**, **Settings**, the snap overlay, and the
task list when **detached** — subscribe via IPC and render; all mutations flow back through IPC.
Changing accent/theme in Settings instantly reskins the island because every window reads the
same broadcast state. See `docs/adr/`.
