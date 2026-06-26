# Folio Design System

A warm, editorial design system for **professional-clean** product and document experiences. Folio pairs a literary serif (Fraunces) with a clean UI sans (Inter) and a precise monospace (IBM Plex Mono), set on warm paper neutrals with a deep-teal primary and burnt-clay secondary.

> **Provenance.** The palette, type pairing, and styling tokens were extracted from an uploaded reference document (`uploads/conversation-prep.html`). Only the *colors, styling, and design tokens* were lifted — none of that file's text or subject matter is part of this system. All product copy, naming ("Folio"), and UI here is original scaffolding to demonstrate the system.

There is no external Figma file or codebase backing this system — it is defined entirely in this project.

---

## CONTENT FUNDAMENTALS

How Folio writes.

- **Voice:** plain-spoken, declarative, second person ("you"). Calm and direct, never breathless. Sentences are short and load-bearing.
- **Tone:** confident and editorial. It reads like a thoughtful colleague, not marketing. Leads with substance; no hedging, no hype words.
- **Casing:** Sentence case for headings and buttons ("New document", "Set the frame first"). Mono **eyebrows and labels are UPPERCASE** with wide tracking ("SAY IT LIKE THIS", "01 — OPEN").
- **Numbers & sections:** numbered section kickers in mono ("01 — OPEN", "02 — THE ASK") give documents rhythm.
- **Punctuation:** curly quotes ("…") for spoken/example lines; em dashes for asides. Example scripts are quoted and set in the serif.
- **Emoji:** none. Folio never uses emoji. Iconography is restrained line work or simple unicode arrows where unavoidable.
- **Vibe:** "lead with the work." Specific, grounded, a little literary. Examples over adjectives.

Representative patterns: an **eyebrow** ("PREP · 1:1") above a serif **headline**, a one-line **lede**, then numbered sections each ending in a quoted **"say it like this"** callout.

---

## VISUAL FOUNDATIONS

**Color.** Warm paper neutrals, not cool grays — backgrounds are cream (`--paper #F5F5F1`), surfaces are a hair brighter (`--card #FCFCFA`), ink is near-black with warmth (`--ink #17191D`). The brand accent is a deep, slightly desaturated **teal** (`--teal #0F5E57`) used for eyebrows, links, primary actions, and bullet dots. **Clay** (`--clay #9A5316`) is the secondary — used sparingly for "don't" / cautionary states and as an occasional warm counterpoint. Tinted surfaces (`--teal-soft`, `--clay-soft`) back callout regions. A dark "anchor" surface (`--ink`) hosts the most important statement, with teal text shifting lighter (`--on-ink-teal #8FC8C0`) for contrast.

**Type.** Three families, clear roles:
- **Fraunces** (serif, opsz) — display, headings, and quote/callout bodies. Weight 500, tight tracking (−0.02em display, −0.015em headings), line-height 1.04–1.18.
- **Inter** (sans) — UI and prose body at 16.5px / 1.62, tracking −0.005em.
- **IBM Plex Mono** — eyebrows, labels, metadata, section numbers. Uppercase, tracking 0.10–0.16em.

**Spacing.** 4px base; editorial generosity at the page level (54px top inset, 90px bottom, 42px section rhythm, 26px card padding). Reading measure capped at 730px / ~54ch.

**Backgrounds.** Flat warm paper. **No gradients, no photographic hero imagery, no textures or patterns.** Depth comes from a single dark inset surface and tinted callout blocks, not from imagery.

**Borders.** Hairline `1px` dividers (`--line`) separate sections; `1.5px` in print. The signature device is a **3px teal left rule** on callout/quote cards (`--border-accent`). Borders do more work than shadows.

**Shadows / elevation.** Restrained and warm-tinted. Most cards rely on a `1px` border with **no shadow**; interactive cards lift to `--shadow-md` on hover. Never heavy, never colored glows.

**Corner radii.** 14px for cards/panels (`--radius-md`), 10px for small cards & inputs (`--radius-sm`), 6px for chips/dots, full pill for badges.

**Cards.** Cream surface, hairline `--line-strong` border, 14px radius, generous padding. Quote/callout cards add the teal left rule. The inverted card is dark ink with light text. No drop shadows at rest.

**Buttons & interactive.** Primary = filled teal; secondary = filled clay; outline = hairline border; ghost = teal text only. **Hover** darkens fill / raises card; **press** nudges `translateY(1px)` (cards) — a small, physical press, no bounce. Disabled = 45% opacity.

**Focus.** Teal border + 3px soft teal ring (`--focus-ring`).

**Motion.** Subtle and quick. Page elements rise-and-fade in (`translateY(8px)` → 0, ~0.5s, staggered ~40ms) — gated behind `prefers-reduced-motion`. Interactions use 120–200ms ease. **No infinite/looping decorative animation, no bounce.**

**Transparency / blur.** Used only for sticky headers — a `color-mix` paper tint with `backdrop-filter: blur(8px)`. Otherwise surfaces are opaque.

**Imagery.** None shipped. If used, keep it warm and quiet to match the paper neutrals. The system favors typography and whitespace over images.

---

## ICONOGRAPHY

Folio is **deliberately icon-light**. The reference design used zero icon assets — its visual markers are typographic (mono eyebrows, numbered kickers, teal bullet dots) and geometric (a 6px round bullet, the 3px left rule).

- **No icon font or SVG sprite** ships with this system.
- **Bullets** are CSS dots (6px, teal), not glyphs.
- **Arrows / chevrons**, where genuinely needed (e.g. a "← Library" back affordance), use **unicode characters** (`←`, `→`, `↑`) in the UI font rather than icon assets.
- **Emoji are never used.**
- **Brand mark:** a simple "F" monogram set in Fraunces inside a teal rounded square — see the Folio App sidebar. No separate logo file is required; it is drawn in CSS/markup.

If a richer icon set becomes necessary, substitute a thin, single-stroke open-source family (e.g. **Lucide**, ~1.5px stroke) to match the hairline aesthetic, and document the addition here. *(This would be a substitution — none is bundled today.)*

---

## VISUAL FOUNDATION — note on fonts

Fraunces, Inter, and IBM Plex Mono are loaded from **Google Fonts** via `tokens/fonts.css` (matching the reference document, which used the same three families from Google Fonts). No font binaries are bundled. If you need self-hosted webfonts, download the families and replace the `@import` in `tokens/fonts.css` with local `@font-face` rules pointing at `assets/fonts/`.

---

## INDEX / MANIFEST

Root files:
- `styles.css` — global entry point (import this one file). `@import`s only.
- `tokens/fonts.css` — webfont loading (Google Fonts).
- `tokens/colors.css` — base palette + semantic aliases.
- `tokens/typography.css` — families, scale, weights, leading, tracking.
- `tokens/spacing.css` — spacing, radii, borders, shadows, motion.
- `readme.md` — this guide.
- `SKILL.md` — Agent-Skill manifest for downloaded use.

Components (`components/core/`) — namespace `window.FolioDesignSystem_e1268b`:
- `Button` — primary / secondary / outline / ghost; sm / md / lg.
- `Eyebrow` — mono uppercase kicker; teal / clay / faint / invert.
- `Card` — paper / accent / invert surface; optional teal left rule.
- `Badge` — mono pill; teal / clay / neutral / outline.
- `Input` — labeled field with teal focus ring, hint/error.
- `Callout` — signature labeled serif quote block; accent / invert.

UI kits (`ui_kits/`):
- `folio_app/` — editorial writing workspace (Sidebar, LibraryScreen, ReaderScreen). Open `ui_kits/folio_app/index.html`.

Foundation specimen cards (`guidelines/*.card.html`): teal, clay, neutrals, text & lines; display / body / mono type; spacing scale, radii, elevation. Plus `components/core/core.card.html` for the component gallery.

---

## CAVEATS / OPEN QUESTIONS

- **Fonts are Google-hosted, not self-hosted** — flag if you need bundled binaries.
- **No real brand assets** (logo files, illustrations, photography) exist — the system is intentionally typographic. The "F" monogram is CSS-drawn.
- Product naming ("Folio") and all UI-kit copy are placeholder scaffolding, derived only from the reference *tokens*, not its content.
