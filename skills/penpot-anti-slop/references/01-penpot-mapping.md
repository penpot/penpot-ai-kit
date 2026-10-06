# 01 — How each tell maps onto the Penpot shape tree

> Loaded in **diagnose** Phase 1. The authoritative list of tells, weights and fixes is
> `shared/anti-slop.md` §1; this file explains how `scripts/scanSlopProbes.js` measures them and where
> the probe stops and the visual review has to take over.

## Why probes first
The builder judging its own export is the weakest evaluator available. Anything that can be
**measured** on the tree is measured, returns p = 1, and outranks any visual answer for the same key.
The review pass (`03-exam-protocol.md`) only covers what geometry and properties cannot show.

## Region detection
Regions are the direct child boards of the scanned root (or of a single `main` wrapper), classified
by **semantic layer name** (`shared/naming-conventions.md`): `hero|masthead|cover` → hero,
`nav|header` → nav, `logo|testimonial|quote|proof` → proof, `feature` → features, `pricing|plan` →
pricing, `stat|metric|kpi` → stats, `step|process` → steps, `cta|signup` → cta, `footer` → footer,
anything else → content. In `MODE = "deck"` every direct child board is a `slide`, and the first one
plays the hero/cover role. No region named hero? The region holding the largest text within the top
~1100 px becomes the hero. Badly named files degrade gracefully — but running
`penpot-rename-layers` first measurably improves region-scoped tells.

## Measurement per key

| Key | What the probe reads | Known blind spots → review |
|---|---|---|
| `violet-gradient` | every `fills[].fillColorGradient` / `strokes[].strokeColorGradient` stop → HSL; hue 232–320°, chroma ≥ 0.11 | gradients baked into an uploaded image |
| `gradient-headline` | a `text` whose fill carries a gradient | text converted to paths |
| `decorative-glow` | `blur.value > 0` (layer blur), radial gradients with a stop at opacity ≤ 0.1, drop shadows with a chromatic color and blur ≥ 8 | glows inside images |
| `frosted-glass` | `backgroundBlur.value > 0` plus any fill with `fillOpacity < 1` | — |
| `faint-grid-backdrop` | in hero regions: ≥ 6 hairline rects/paths (≤ 2 px), or a ≥ 50 %-wide layer named grid/dots/pattern | pattern images → review |
| `dark-neon-default` | root solid fill L < 12 % and any chromatic fill with s ≥ 0.6, L ≥ 0.45 in green–cyan or violet–magenta | brief asked for dark → mark `accepted` |
| `sparkle-ai-marker` | ✨ ✦ ✧ ⭐ 🌟 💫 ⚡ in text; non-text layers named sparkle/stars/magic | icon drawn without a name → review |
| `emoji-as-icon` | Extended_Pictographic at the start of a line, or a text that is only an emoji — excluding © ® ™ ‼ ⁉, which Unicode also classes as pictographic | — |
| `icon-in-tile-cards` | a flex/grid board with ≥ 3 board children whose top-left-most child is a 24–64 px square with radius / ellipse / "icon" name | — |
| `centered-hero-stack` | ≥ 2 of the 3 largest hero texts `align === "center"` and button boards (name button/btn/cta) centered on the hero ±12 px | unnamed buttons: text-only check |
| `pill-above-headline` | a non-text shape ≤ 40 px tall, ≤ 360 px wide, radius ≥ h/2, ending ≤ 120 px above the headline | — |
| `serif-accent-word` | a text ≥ 28 px (or mixed size, ≤ 120 chars) whose `fontFamily` or `fontStyle` is `"mixed"` | false positive when mixing two sans weights of different families — say so in evidence |
| `identical-triplet` | a flex/grid board with exactly 3 visible board children, equal size ±2 px and identical child-type signature | three identical *texts* columns → review |
| `bento-grid` | grid board, ≥ 4 children, some `layoutCell.rowSpan/columnSpan > 1`, ≥ 3 rounded | flex-faked bento → review |
| `single-edge-accent` | a board ≥ 120×60 holding a chromatic rect ≤ 4 px thick spanning ≥ 80 % of one side | — (Penpot strokes are uniform, so a one-side border is always a child shape) |
| `numbered-steps-default` | ≥ 3 texts matching "1 / 01 / Step 1 / Paso 1" sharing a grandparent | — |
| `round-number-stats` | ≥ 3 texts ≥ 24 px matching the round-stat pattern ("10k+", "99.9%", "5x", "24/7") sharing a grandparent | — |
| copy keys | all `characters` joined: em-dash rate, buzzwords (EN + ES, whole-word), placeholders (a **labeled** placeholder — ALL-CAPS label + dash, e.g. `FOOTER — …`, or `TBD` — is exempt), three-beat slogans, not-X-but-Y | tone and vagueness → review (`vague-headline`) |
| `default-typeface` / `trend-typeface` | primary family = most characters set in it (texts with `fontFamily === "mixed"` are tallied per character via `getRange(i, i+1).fontFamily`, ≤ 300 chars); matched case-insensitively against the lists | if the family appears in an active `fontFamilies`/`typography` token → `status: "inherited"` |

## Not probe-able (review only)
`abstract-3d-art`, `generic-logo-strip`, `vague-headline`, the template judgement, and every
authenticity signal except `chosen-typeface`.

## Performance
The scan visits every visible descendant once plus one pass per region; a 1440 × 6000 landing with
~1500 shapes runs in one call. For pages with many screens, scan one board per call — never the
whole page in one go when it holds more than one screen.

## Live validation (2026-10-06)
Run on a real Penpot file with `fixtures/sloppy-landing.state.json` rebuilt section by section:
probes found **15/15** planted tells (+ `slogan-triads`), review added `generic-logo-strip` and
`vague-headline` → score **100 / ai-default**. A deliberate counter-example (split hero with a
product table, typeset feature list, IBM Plex) returned **0 probe findings** and all 5 signals →
**0 / genuine**. A `fontFamilies` token with Inter turned `default-typeface` into `inherited`. Deck mode
on a 3-slide trap deck found `violet-gradient`, `emoji-as-icon`, `centered-hero-stack`,
`identical-triplet`, `default-typeface`. Three regressions surfaced live and are now unit-tested:
© read as an emoji, a serif accent hidden inside a `mixed` text, and a labeled placeholder counted as residue.
