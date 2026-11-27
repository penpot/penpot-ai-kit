# 04 — Typography and grid

Loaded during Phase 1 (`setupDeckSystem.js`) and consulted by every `buildSlide.js` call. Numbers
first; the craft behind them is `shared/design-quality.md` §2.

## Stage

| Measure | Value |
|---|---|
| Board | 1920 × 1080, `clipContent = true` |
| Safe margin | 96 on all four sides (`deck.space.margin`) |
| Content area | 1728 × 888 |
| Columns | 12 × 100 px, gutter 48 (`deck.space.gutter`) |
| Spans | 2 = 248 · 3 = 396 · 4 = 544 · 5 = 692 · 6 = 840 · 7 = 988 · 8 = 1136 · 9 = 1284 · 12 = 1728 |
| Rows | 2 rows with a 48 gap = 420 each; 3 rows = 264 each |
| Spacing steps | 24 (`deck.space.stack`, inside a block) · 48 (between blocks) · 96 (margin, between regions) |
| Contact grid on the page | slide `i` (0-based) at x = (i % 4) · 2080, y = ⌊i / 4⌋ · 1240 |

Anything outside the 96 margin is either a deliberate bleed (image, motif, edge shape — absolute
child, page coords, gotcha #14) or a defect. `auditDeckQuality.js` reports the latter as `offSafeArea[]`.

## Type scale

| Role | Layer | Size | Token | Weight | Line-height | Tracking | Case |
|---|---|---|---|---|---|---|---|
| Stat | `stat` | 140–200 | `deck.font.size.stat` = 180 | 600–700 | 1.0 | −2 % | numerals |
| Title | `h1` | 72–96 (Bold-editorial cover/section/closing up to 120) | `deck.font.size.title` = 88 | 600–800 | 1.05–1.15 | −2 % | sentence |
| Section label / card label | `h2` | 40–48 | `deck.font.size.section` = 44 | 500–600 | 1.15–1.25 | −1 % | sentence |
| Body | `p` | 28–36 | `deck.font.size.body` = 32 | 400 | 1.3–1.45 | 0 | sentence |
| Caption / source / eyebrow | `eyebrow`, `caption` | 20–24 | `deck.font.size.caption` = 22 | 400–500 | 1.2–1.3 | 0 (+4 % if all-caps eyebrow) | sentence; caps only for eyebrow |
| Floor | any | **20** — nothing smaller, ever | — | — | — | — | — |

- Adjacent levels differ by ≥ 2 steps of this scale or a weight jump ≥ 200 — "real scale
  difference, not a polite step": 44 over 32 needs the weight jump; 88 over 32 does not.
- Max 2 families (`deck.font.family.display`, `deck.font.family.body`; they may be the same family)
  and 3 weights per deck.
- Sentence case everywhere; ALL-CAPS only on the eyebrow, tracked +4 %, muted color. Never justify.
  Never italic titles.
- Center-align only on `cover`, `quote`, `closing`. Body text is left-aligned (right-aligned only as a
  stated editorial device on a `right` anchor).

## Measure and density

- ≤ 60 characters per body line. At ≈ 0.5 em per character: 32 px → 960 px → a body text box is
  ≤ 7 col (988); at 36 px ≤ 8 col (1136); at 28 px ≤ 6 col (840). Cap the text box, not the container.
- Titles ≤ 8 words, ≤ 2 lines at 88. A title that needs 3 lines is a subtitle problem: split into
  `h1` + `body[0]`.
- Density limits per archetype live in `03-slide-archetypes.md`; the response to overflow is a
  second slide, never a smaller size.

## Token mapping

| Property | Token | Bound with |
|---|---|---|
| Text size | `deck.font.size.stat|title|section|body|caption` | `text.applyToken(tok, ["fontSize"])`, then verify next call (gotcha #2) |
| Family | `deck.font.family.display|body` | value = exact family name; applied via `font.applyToText` (below) |
| Margin | `deck.space.margin` | `board.applyToken(tok, ["paddingTop"])` … per side; 2.16 fallback = numeric mirror + exception |
| Gutter | `deck.space.gutter` | `["rowGap"]` / `["columnGap"]` |
| Stack | `deck.space.stack` | gap inside cards and lists |
| Radius | `deck.radius.card` | the four explicit corner properties |
| Colors | `deck.text.on-dark|on-light|muted`, `deck.bg.*` | `["fill"]` — inconsistent on Text (gotcha #2): verify and retry |

## Text craft rules

```js
// exact family, never findByName (#13b)
const fam = penpot.fonts.all.find(f => f.name === "Inter");
if (!fam) throw new Error("font-missing: Inter");           // → fallback list in 09-error-recovery.md
const variant = fam.variants.find(v => v.fontWeight === "600" && v.fontStyle === "normal") ?? fam.variants[0];
const h1 = penpot.createText("Onboarding v2 doubled retention");
h1.name = "h1";
body.appendChild(h1);
fam.applyToText(h1, variant);
h1.fontSize = 88; h1.lineHeight = 1.1; h1.letterSpacing = -1.76;   // re-assert AFTER applyToText
h1.resize(1136, 10);                                                // width = span
h1.growType = "auto-height";                                        // AFTER resize (#3)
h1.align = "left";
```

- `resize()` forces `growType = "fixed"` — set `auto-height` after every resize, or the box clips.
- `letterSpacing` is absolute px: −2 % of 88 = −1.76; of 180 = −3.6.
- Set `fontSize`, `lineHeight`, `letterSpacing` after `applyToText`; the variant application can
  reset them (#13b). Bind the size token afterwards; read `text.fontSize` next call to confirm.
- Mixed emphasis inside one text (accent on two words) → `text.getRange(start, end)` and set
  `fills`/`fontWeight` on the range; do not split into two text shapes.
- Measure by reading `text.height` after `await board.waitForLayoutUpdate()` (#17): a title taller
  than 2 × 88 × 1.1 ≈ 194 has wrapped to 3 lines → shorten or split.
- `auditDeckQuality.js` reports `minFontSize` per slide and `belowTypeFloor[]`; both are structural
  gates, not suggestions.

## Contrast thresholds (slides)

| Text | Threshold | Typical case |
|---|---|---|
| ≥ 24 px, or ≥ 18.67 px at weight ≥ 700 | ≥ 3:1 | all titles, body, stats |
| < 24 px regular | ≥ 4.5:1 | captions, sources, eyebrows at 20–22 |
| Muted text (`deck.text.muted-on-dark` / `-on-light` — one grey cannot pass on both tones; `buildSlide.js` picks by tone) | must still meet the row above | 60 % alpha on `#F2F2F2` over `#121214` ≈ 6.9:1 — passes; 40 % does not |
| Text on image / glass | measured against the overlay or blurred surface, worst case | overlay ≥ 55 % dark for on-dark text |

Measured by `penpot-audit-accessibility` with `scope:deck` (same thresholds, no target-size
checks, exactly one `h1` per slide). Fix by changing the token value, not by adding a text shadow.
