# 02 — Direction playbook (prevent the look before building it)

> Loaded in **direction** mode, i.e. at Phase 0 of `penpot-build-screen` / `penpot-build-deck` when
> `prefs.antiSlop === "on"`. Doctrine: `shared/anti-slop.md` §4. Output: one block at the Phase 0
> checkpoint and extra **Constraints** in the brief contract.

## Step 1 — Write down the defaults (the attractor)
Before deciding anything, list what you would produce for this brief on autopilot. Be honest; the
point is to make the attractor visible:

| Axis | Autopilot answer for this brief |
|---|---|
| Layout / skeleton | e.g. centered hero → logo strip → 3 feature cards → testimonials → pricing → CTA |
| Hero / cover treatment | e.g. gradient background, pill badge, two centered buttons |
| Accent | e.g. indigo→violet, used on buttons, icons, borders and the headline |
| Typeface | e.g. Inter everywhere |
| Imagery / proof | e.g. abstract 3D shape, grey logo row, "10k+ users" |

## Step 2 — Replace each one with a reason from the brief
For every row, choose a replacement **and name the brief fact that justifies it**. Useful sources:

- **The product's material.** What does the product actually show — a calendar, a ledger, a map, a
  code diff, a recipe? Let that object shape the hero (a cropped real UI fragment, a large table, a
  single strong figure) instead of decoration.
- **The audience's context.** Who reads this, where, with what in their head? An accountant at a
  desk wants density and precision; a parent on a phone wants one action and calm.
- **The content's shape.** One strong number → a big-number composition. A long list → a typeset
  list, not cards. A comparison → a two-column table. A process that matters → screens of each
  state, not "1-2-3".
- **The brand constraints the user gave.** Honor them literally; refine around them.

Patterns that usually beat the default (pick, don't stack):

| Instead of… | Try… |
|---|---|
| centered hero stack | left-aligned type-led hero on the grid; or split copy/product with an asymmetric ratio (5/7, 4/8) |
| gradient + glow atmosphere | a flat surface token and one strong typographic or photographic element |
| three equal cards | one dominant item + two supporting; a typeset list with hairline rules; a comparison table |
| icon tile on every card | a cropped product fragment per item, or no icon at all |
| pill badge above headline | put the news in the headline, or a plain text line under it |
| grey logo strip | one named customer quote supplied by the brief — or omit proof |
| round-number stats row | the single metric from the brief, with its source line |
| "1-2-3" steps | the actual states of the product, captioned |
| cards everywhere | spacing + hairline rules; one surface level |

## Step 3 — Typeface (system first)
1. File has type tokens (`fontFamilies` / `typography`)? Use them. If they are on the default/trend
   list, report it once as `inherited` and offer a proposal — do not swap.
2. No type tokens? Run `scripts/listFontCandidates.js` (optionally with `QUERY`) and shortlist 2–3
   families outside both lists whose character fits the brief (precise / editorial / warm /
   technical). Propose **one** as a `fontFamilies` token (name + value + tier per
   `shared/tokens-schema.json`) — the human approves it (AGENTS.md §5).
3. One family is enough for most screens; a second only with a role (figures in a mono, a display
   face for one line).

## Step 4 — Check the counter-default trap
Read the ledger's previous `antiSlop.direction` entries for this file. If your picks match the
previous run on layout **and** accent role **and** typeface, change at least one and say which.
Also refuse the fashionable anti-AI kit (warm cream + italic serif accent word + muted sage/olive)
unless the brief itself asks for it.

## Step 5 — Present at the Phase 0 checkpoint
```
Direction (anti-slop on)
- Defaults I'm avoiding: centered gradient hero, 3 icon cards, indigo accent, Inter, 3D blob
- Instead:
  · Hero: split 5/7, headline left, cropped invoice-table UI right — the product IS the table
  · Accent: one orange (brand) reserved for "Start free trial"; everything else neutral
  · Structure: features as a typeset list with hairlines; one customer quote from the brief
  · Type: propose font.family.base = "IBM Plex Sans" (precise, tabular figures) — needs approval
- Will refuse: violet-gradient, centered-hero-stack, identical-triplet, icon-in-tile-cards, round-number-stats
```
Record `{ defaults, picks, typefaceProposal, refused }` under `antiSlop.direction` in the ledger.
