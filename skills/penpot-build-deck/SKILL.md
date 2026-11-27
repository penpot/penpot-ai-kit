---
name: penpot-build-deck
description: "Design a presentation / slide deck in Penpot from a brief, as a senior presentation designer: 1920x1080 slide boards built one slide per call from an approved outline, a committed deck style, varied slide archetypes (cover, agenda, section, content, big-number, comparison, grid, bento, quote, timeline, image-bleed, closing), tokenized, wired into a playable View-mode flow and exportable to PDF. NOT for app screens (use penpot-build-screen). Triggers: 'create a presentation', 'build a slide deck', 'design slides in Penpot', 'pitch deck', 'keynote', 'make slides for this talk', 'turn this outline into slides'."
disable-model-invocation: false
version: 0.3.0
audiences: [product-designer, design-system]
mode-default: review
requires:
  - shared/penpot-mcp-tool-reference.md
  - shared/plugin-api-gotchas.md
  - shared/tokens-schema.json
  - shared/naming-conventions.md
  - shared/state-management.md
  - shared/modes-and-policies.md
  - shared/visual-self-review.md
  - shared/design-quality.md
  - shared/visual-effects.md
  - shared/anti-slop.md
  - shared/report-schemas/deck-quality-report.schema.json
---

# penpot-build-deck — brief to a playable slide deck

Turn a brief into a presentation that lives in Penpot as real, editable design: one **1920×1080 Board
per slide** on a dedicated page, tokenized through a `deck.*` set, wired into a **flow** so it plays in
View mode (←/→, Shift+F), and exportable to PDF. Penpot has no slides mode — this skill is the deck
tooling. Work as a **senior presentation designer** who makes a real scale difference, uses the full
canvas, varies the anchor from slide to slide, and never ships a text-only slide.

**The one rule: plan the whole outline, then build one slide per call.** Slides 1–3 are the **style
freeze** — everything after inherits their decisions. Build the rest in batches of 3–5, and export and
*look at* every slide before its checkpoint.

Tool surface: `shared/penpot-mcp-tool-reference.md`. API traps: `shared/plugin-api-gotchas.md` (the
`#n` below). Verify with `penpot_api_info` before first use: `Page.createFlow`,
`Shape.addInteraction`, `Board.backgroundBlur`, `GridLayout`, `Gradient`.

## Brief contract
- **Context** — audience, occasion, duration, venue / screen, language.
- **Objective** — the *one* message the audience must leave with, and the ask.
- **Inputs** — outline (one line per slide), facts and figures **with sources**, attributed quotes,
  image URLs (or "placeholders"), existing tokens, components and fonts to reuse.
- **Constraints** — no fabricated numbers; fonts must exist in `penpot.fonts.all`; every slide has a
  visual; the tells in rule 9 are refused; `deck.*` tokens only (gradients, shadows and glass are
  ledgered literals); with strict anti-slop on, also the keys the direction step refused.
- **Acceptance Criteria** — every slide a 1920×1080 board named `NN-archetype-slug`; ≥ 1 visual per
  slide; no two consecutive identical archetypes and none above 40% of the deck; type floor 20px,
  body ≥ 28px; contrast ≥ 3:1 for large text (≥ 24px, or ≥ 18.67px bold) and 4.5:1 below; flow `Deck`
  wired click → next; deck-quality score ≥ 3 on all seven axes or the weak axes named; with strict
  anti-slop on, slop score ≤ 35 over the deck page.

## Workflow
Before every ✋ checkpoint, run the export → look → fix loop of `shared/visual-self-review.md` on each
slide built since the last one (max 2 self-fixes) — per slide, never the whole page.

**Phase 0 — Discovery and outline (read-only).** `high_level_overview`; `tokenOverview()`;
`penpot.fonts.all.map(f => f.name)`; `penpotUtils.getPages()`; `penpot.version`. Analyse the brief
(`references/01-deck-brief-analysis.md`): slide budget, the one message, the outline table
`n | archetype | title | key content | visual | tone`, tonal arc, motif. Pick a deck style
(`references/02-deck-styles.md`) and run the variety pre-check (`references/03-slide-archetypes.md`).
**Anti-slop opt-in:** read the stored preference (`penpot-anti-slop` → `scripts/antiSlopPrefs.js`);
unset and unanswered by the brief → ask the `shared/anti-slop.md` §0 question once, in the user's
language, and store it. When `on`, run the direction step (`penpot-anti-slop`
`references/02-direction-playbook.md` + `04-deck-tells.md`) *before* picking the style.
✋ Approve outline + style + tonal arc + slide count (+ the direction block when strict).

**Phase 1 — Deck system.** `scripts/createDeckPage.js` with `PHASE="create"`, then `PHASE="verify"` in
the next call — no board is created until verify returns `ok: true`. `scripts/setupDeckSystem.js`: the
`deck` token set (aliasing brand tokens where they exist), font resolution, optional master
components. New tokens are proposed here, never invented silently. ✋ Approve tokens and fonts.

**Phase 2 — Style freeze.** `01-cover-…`, `02-agenda-…` and the first content slide with
`scripts/buildSlide.js` (plus `scripts/applyDeckEffects.js` for the background device), one slide per
call, each exported and reviewed. ✋ **Style-freeze checkpoint** — a later style change reopens it.

**Phase 3…N — Batches.** 3–5 slides per batch, one per call. After the batch, export each slide and
check the variety rule against its predecessor. Image URLs are uploaded by `applyDeckEffects.js` and
verified in the following call (`references/05-visuals-and-effects.md`). ✋ Per batch.

**Phase N+1 — Wire, gate, critique.** `scripts/wireDeckFlow.js` (order, flow `Deck`, click → next,
optional auto-advance and section flows; `references/06-flow-and-playback.md`).
`scripts/auditDeckQuality.js` — a gate that is not `pass` blocks "done". Then the scored critique
(`references/07-critique-framework.md`): seven axes plus the monotony check; any axis below 3 → a
targeted revision (max 2 passes); report as Markdown + JSON per
`shared/report-schemas/deck-quality-report.schema.json`, mirrored to the ledger. Strict mode on: run
`penpot-anti-slop` diagnose (`MODE = "deck"`) on the deck page and include the slop score. Give the
PDF-export and share-link steps. ✋ Final checkpoint.

## Rules
1. **One slide per `execute_code` call.** A one-shot deck is unauditable and every slide comes out the
   same.
2. **Page targeting (#15) — this skill's critical failure mode.** The deck lives on its own page, and a
   board created on the wrong page cannot be moved. `await penpot.openPage(page)` and assert
   `penpot.currentPage.id` before any `createBoard()`; if it does not match, stop and ask the user to
   open the page — never build on the wrong one.
3. **Slide boards:** 1920×1080, named `NN-archetype-slug`, `showInViewMode = true`,
   `clipContent = true`, on the page's 4-column contact grid (x = (i % 4)·2080, y = ⌊i/4⌋·1240). Root
   flex column with padding bound to `deck.space.margin` (96), then `safe-area` containers on a
   12-column grid (4 = 544, 6 = 840, 8 = 1136), and a hidden `notes` text layer for speaker notes.
4. **Fill policy (#11).** The slide board is the surface: `fills = []`, then bind `deck.bg.<tone>`.
   Grouping containers stay `fills = []`; only real cards and panels bind `deck.surface.*`.
5. **Tokens first:** `deck.*` for color, type sizes and families, spacing, radius. Verify bindings in a
   later call and never re-apply a bound token (#2). Gradients, glass fills and shadows cannot bind —
   each is a ledger `exceptions` entry naming the tokens it derives from.
6. **At least one visual per slide** — a shape, an image or placeholder, a stat numeral ≥ 140px, a
   chart placeholder, a component instance. A text-only slide fails the gate: add the archetype's
   visual or change archetype.
7. **Variety:** consecutive slides differ on at least one of archetype, anchor and tone; never the
   same archetype twice running; none above 40% of the deck. Consistency is the style; monotony is the
   layout.
8. **Type:** floor 20px, body ≥ 28px, titles 72–96px (`references/04-typography-and-grid.md`) — 24px
   body is illegible from the back of a room. At most 2 families and 3 weights; sentence case; body
   left-aligned. Fonts by exact name (`penpot.fonts.all.find(f => f.name === "Inter")`, #13b), then
   re-assert `fontSize` and `lineHeight`.
9. **Refuse the tells:** accent lines under titles, decorative bars or stripes, centered body text,
   default blue, cream backgrounds, purple gradient on white, identical layouts back to back. Hierarchy
   comes from scale and weight; center only cover, quote and closing.
10. **Honest content:** numbers only from the brief, each with a source line; quotes attributed; no
    lorem, no "Item 1" (`shared/design-quality.md` §6).
11. **Images:** labeled placeholders unless the user supplied the URL (#18); uploads verified in the
    next call; failures reported, never swapped silently.
12. **Per slide:** `clearFlip(slide)` before returning (#16 — the mirror is invisible to
    `shapeStructure` and unmissable in the export); `await board.waitForLayoutUpdate()` before reading
    geometry (#17); edge decorations are absolute children in **page** coordinates, and the board's
    clipping is the bleed (#14).
13. **The flow is part of "done":** no final checkpoint before `wireDeckFlow.js` has run.
14. **A failed call may have run (#19):** read the page before retrying; slides are found by name.

More excuses and countermeasures: `references/08-anti-rationalization.md`. Failures and fixes:
`references/09-error-recovery.md`.

## Mode, state and naming
Mode **review** (`shared/modes-and-policies.md`). Safe set: renaming a slide board to the
`NN-archetype-slug` convention. Geometry, tokens, effects, flow wiring and uploads are
Apply-with-review; "looks good" approves only the batch just shown.

Ledger under `RUN_ID` (`deck-<date>-<slug>`, `shared/state-management.md`): `phase`, `deckPageId`,
`deckStyle`, `tonalArc`, `motif`, `outline`, `slides: [{ n, id, name, archetype, done }]`,
`styleFrozen`, `flowName`, `exceptions`, `capabilities`, `deckQuality`, and `antiSlop` (`pref`,
`direction`, `reports`) when strict mode is on — the opt-in itself is file-wide plugin data
`penpot-ai` → `prefs.antiSlop`. `storage.deck` mirrors the ids (data only). Resume: read the ledger,
run `createDeckPage.js` with `PHASE="verify"`, re-derive the slide list by name (`^\d{2}-`), continue
from the first slide not `done`.

Naming (`shared/naming-conventions.md`): boards `01-cover-launch`, `07-big-number-retention`; layers
`h1`, `h2`, `eyebrow`, `p`, `stat`, `caption`, `img-placeholder`, `card`, `safe-area`, `notes`; tokens
`deck.bg.dark`, `deck.text.on-dark`, `deck.accent`, `deck.font.size.title`, `deck.space.margin`; flows
`Deck` and `Section: <name>`.

## Supporting files
- **references/** — `01-deck-brief-analysis.md`, `02-deck-styles.md`, `03-slide-archetypes.md`
  (catalogue and per-archetype recipes), `04-typography-and-grid.md`, `05-visuals-and-effects.md`,
  `06-flow-and-playback.md` (View mode, share link, PDF export), `07-critique-framework.md`,
  `08-anti-rationalization.md`, `09-error-recovery.md`.
- **scripts/** (paste into `execute_code`) — `createDeckPage.js` (create, then verify),
  `setupDeckSystem.js`, `buildSlide.js` (one slide), `applyDeckEffects.js`, `wireDeckFlow.js`,
  `auditDeckQuality.js`.
- **shared/** — `visual-effects.md` (gradients, glass, shadows, images, `clearFlip`),
  `design-quality.md` (type craft, color, content honesty, tells, scoring).

**Doctrine paths.** `shared/…` and `policies/…` resolve inside this bundle in native installs (vendored by the installer); in a Claude Code plugin install they live at the plugin root — `${CLAUDE_PLUGIN_ROOT}/shared/…`, two directories up from this file.
