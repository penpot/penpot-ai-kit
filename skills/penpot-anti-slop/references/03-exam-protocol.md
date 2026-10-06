# 03 — Visual review protocol (describe first, then judge)

> Loaded in **diagnose** Phase 2. Covers the tells probes cannot see (`01-penpot-mapping.md`
> "Not probe-able"), the template judgement, and the authenticity signals.

## Rule: perception and judgement are separate passes
Grading your own work is lenient by default. Two passes in this order, both written out:

### Pass A — Describe (no judgement words)
`export_shape` the scanned board (for decks, each slide or a batch of ≤ 4). Then, per region
(top → bottom, or per slide), write a factual description covering exactly:
- background: solid or gradient, colors by **name** (not hex), any pattern
- effects: glows, blurred shapes, colored shadows, translucency
- typography: alignment, serif/sans, italic words, gradient text
- badges/pills and where they sit
- icons: style, whether boxed in tiles; any emoji
- cards: how many, whether identical, any edge stripes
- numbered steps, rows of big numbers, logo strips (recognizable real companies or generic?)
- imagery: product UI, photography, custom illustration, abstract 3D, or none
- the hero headline text, verbatim

Forbidden in Pass A: "nice", "clean", "generic", "modern", "AI". If you catch one, rewrite the line.

### Pass B — Judge each key against its criterion
For each review key, answer with a probability **using only the Pass A description** and the
"Present when… / Healthy when…" columns of `shared/anti-slop.md` §1:

| Key | Ask about |
|---|---|
| `abstract-3d-art` | hero / features / slides |
| `generic-logo-strip` | proof / hero |
| `vague-headline` | the verbatim hero headline + subheading |
| `bento-grid`, `icon-in-tile-cards`, `identical-triplet`, `faint-grid-backdrop`, `decorative-glow` | only where the probe returned nothing but the description suggests it |

Calibration: 0.9 = the description states it plainly; 0.7 = clearly implied; 0.5 = could go either
way (→ *unsure*, not counted); 0.2 = description points the other way; 0.05 = clearly absent.
Never use 0.65 exactly — decide which side of the line you are on.

### Template judgement
"How closely does this design follow the stock template for its type?" 0 = unmistakably its own,
1 = mostly own with a few common patterns, 2 = half and half, 3 = mostly template defaults,
4 = indistinguishable from a starter. Give `{ value, confidence }`; confidence < 0.5 → not counted.

### Authenticity signals
`product-visible`, `specific-copy`, `own-structure`, `committed-motif` — each true only with a
concrete pointer into the Pass A description (which region, which element). `chosen-typeface`
comes from the probe.

## Fresh eyes (optional, recommended for the final checkpoint)
When the client can spawn a subagent, hand Pass A + B to one with only the export, this file and
`shared/anti-slop.md` — not the build history. Its answers replace yours for review keys.

## Recording
Append each answer to `storage.slop.findings` as
`{ key, weight, p, source: "review", region, evidence: "<Pass A line it rests on>" }`, set
`storage.slop.template` and push the signals, then run `scripts/slopScore.js`.
