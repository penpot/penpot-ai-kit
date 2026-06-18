# 02 — Semantic Inference (Phase 1, analysis only)

> Loaded when Phase 1 runs. Goal: turn the Phase 0 inventory into a before→after rename map, each row bucketed (safe / review / ambiguous) with a confidence and a one-line reason. No writes happen here — inference is local reasoning over the cached inventory.

## How to apply the rules

For each layer, run the rule groups below in order (structural → interactive → text → media → list → fallback) and take the first confident match. Attach:
- `new` — the proposed name (semantic element verbatim, or kebab-case role name).
- `bucket` — `safe` if `nameStatus === "auto-generated"`; `review` if it already had a meaningful name and you are proposing a change; `ambiguous` if confidence < 0.6 or two rules tie.
- `confidence` — 0..1.
- `reason` — the signal that fired (e.g. "full-width, anchored top, contains nav links").

A layer with a `semantic` name that is already correct gets **no row** (it stays as-is). A `semantic` name that is *wrong* (e.g. an `h3`-named layer that is clearly a paragraph) becomes a `review` row.

## A. Structural containers

| Signals | Name |
|---------|------|
| Full page width, anchored at top, contains links/logo + actions | `header` (with `nav` child if a link cluster is present) |
| Full page width, anchored at bottom | `footer` |
| Full page width, large height, the primary content region | `main` |
| Full width, mid-page, groups related content under one heading | `section` |
| Self-contained card (moderate size, shadow or border, own heading + body) | `article` |
| Sidebar-like, vertical, secondary nav/links | `aside` (with `nav` child) |
| Absolutely positioned overlay, centered, dimmed backdrop sibling | `dialog` |
| Container of inputs + a submit button | `form` |
| Image + caption pair | `figure` (caption text → `figcaption`) |

Only **one** `main` per page. Only one `header` / `footer` per region.

## B. Interactive elements

| Signals | Name |
|---------|------|
| Small board (≤ ~220×60), solid fill, single text/icon child | `button` |
| Outline only (stroke present, fill empty/transparent), wide+short, placeholder-like text | `input` |
| Small square/circle with a check/dot child | `input` (checkbox/radio — note role in descriptor) |
| Wide field with a chevron/caret icon child | `select` |
| Pill + circle thumb child | `input` (switch) |
| Short text sitting directly above/left of an `input` | `label` |
| Underlined or link-colored standalone text | `a` |

When two buttons/links sit as siblings, disambiguate: `button-primary`, `button-ghost`, `a-terms`.

## C. Text → heading level (the a11y-critical part)

Font size alone is **not** sufficient — a hierarchy must read 1 → 2 → 3 by **visual prominence within its region**, not by raw px. Procedure:

1. Within each structural region (`header`, `main`, each `section`, each `article`), collect text layers.
2. Rank them by (fontSize, fontWeight) descending.
3. The single most prominent text in the page's primary region is `h1`. There should be **exactly one `h1`** per page.
4. Section titles become `h2`; sub-titles `h3`; and so on. Do not skip levels (no `h1` → `h3`).
5. Body copy (fontSize ~14–18, weight ~400, longer runs) → `p`.
6. Small/meta text (≤ ~13px) → `small` or `caption`.
7. Eyebrow/overline (uppercase, letter-spacing > 0, short) → `span`.

Rough size guide (only as a tiebreaker, never as the sole signal):

| Hint | Likely |
|------|--------|
| ≥ 36px, or ≥ 28px & weight ≥ 600, top of primary region | `h1` |
| ≥ 24px & weight ≥ 600 | `h2` |
| ≥ 20px & weight ≥ 500 | `h3` |
| 16–19px & weight ≥ 500 | `h4`/`h5` |
| 14–18px, weight ~400, long | `p` |
| ≤ 13px | `small` / `caption` |

If two regions each present a top-level title, the one in `main`/hero wins `h1`; the others are `h2`. Flag as `ambiguous` if you cannot tell which region is primary.

## D. Media & icons

| Signals | Name |
|---------|------|
| Rectangle/board with an **image fill** | `img` |
| Small vector/path (≤ ~32px) | `icon` (or `svg`); inside a button → `icon-{name}` |
| 16:9 / 4:3 rectangle, no text, play-glyph sibling | `figure` (video) |
| Thin full-width rectangle acting as a separator | `hr` |

## E. Lists & repetition

Repeated siblings with matching structure are a **list**, not standalone sections:

1. Detect: ≥ 3 siblings of the same `type`/size/child-shape under one container.
2. Name the container `ul` (or `ol` if ordered/numbered), and each child `li`.
3. If each `li` wraps a card, the child is `li` and its inner card is `article`: `ul > li > article`.
4. Nav link clusters → `nav > ul > li`; give named items descriptors: `li-home`, `li-pricing`.

## F. Fallback role names (no element fits)

Use **kebab-case** role names, never PascalCase, never `container`/`wrapper`:

`card-grid`, `button-group`, `field-row`, `avatar-stack`, `nav-list`, `hero-content`. Prefix purely decorative shapes `deco-` (`deco-divider`, `deco-blob`).

## Ambiguity handling

Mark `ambiguous` and surface with an `export_shape` thumbnail when:
- A frame has only an icon child (could be `button`, `a`, or `icon`).
- A shape reads as both `input` and `button` (similar size, fill + text).
- Image + text overlay (could be `figure`, `article`, or `img`).
- You cannot decide which region owns the `h1`.

Never silently pick — list the candidates and ask the user at the Phase 1 checkpoint.

## Output

```json
{
  "shape-id-1": { "old": "Frame 2", "new": "header", "bucket": "safe", "confidence": 0.9, "reason": "full-width, top, nav links" },
  "shape-id-7": { "old": "Hero copy", "new": "h1", "bucket": "review", "confidence": 0.85, "reason": "largest text in hero region" },
  "shape-id-9": { "old": "Group 4", "new": "icon", "bucket": "ambiguous", "confidence": 0.5, "reason": "icon-only frame; could be button" }
}
```

✋ Present grouped by bucket; get approval for `review` + `ambiguous` rows. Cache to `storage.run.renameMap`.
