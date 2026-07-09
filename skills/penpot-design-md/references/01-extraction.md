# Extraction recipes (Phases 0–2)

All read-only. One logical read per `execute_code` call; component sampling in batches of ≤5.

## Phase 0 — inventory
Run `scripts/extractDesignData.js`. It returns pages, token sets (name/active/count), themes,
library asset counts and names. Decide from it:
- **Scope:** which component families get deep entries (a good default: the ones with variant
  containers or dedicated pages).
- **Canonical theme:** if sets like `Mode/Dark` + `Mode/Light` exist, the ACTIVE one is canonical
  unless the user says otherwise. The inactive one is documented as a delta.
- **Output path:** ask; default `DESIGN.md` in the user's current project directory.

## Phase 1 — tokens & assets

**Color tokens** (per set; active sets first):
`set.tokens` where `type === "color"` → `{ set, name, value, resolvedValue }`. Keep `value` too —
a reference value (`"{color.brand.500}"`) reveals the tier structure, which maps to semantic names.

**Dimension-ish tokens:** types `spacing`, `dimension`, `sizing`, `borderRadius`, `borderWidth` →
feed `spacing:` and `rounded:` maps. Sort numerically and name by the format's scale names
(xs/sm/md/lg/xl/xxl/pill — see `references/04-designmd-template.md`); if the file has its own
names (`spacing.2`), keep the mapping table.

**Typography — three possible sources, in preference order:**
1. **Composite `typography` TOKENS** (type `"typography"`): their `value` is an object of
   references (`{fontSize: "{font.size.body-medium}", fontWeight: "{font.weight.regular}",
   textCase: "{text.case.uppercase}", ...}`) — resolve each reference against the `fontSizes`/
   `fontWeights`/`letterSpacing`/`number` (line-height) tokens to build the `typography:` map.
   `textCase: uppercase` inside a style is a system trait — surface it in the doc.
2. `library.local.typographies[]` (library assets).
3. Sample text shapes from representative pages (Phase 2 style) and cluster by size/weight.

**Library colors:** `library.local.colors[]` — dedupe by (`path`||group, name, value). Same short
name in different groups = different colors (e.g. `background/default` vs `border/default`).

**Theme delta:** for the non-canonical theme set, list only tokens whose resolvedValue differs
from the canonical one; that list becomes the "Dark/Light delta" subsection.

## Phase 2 — component sampling

For each in-scope component (`scripts/sampleComponentStyles.js`, ≤5 per call):
- `comp.mainInstance()` → root board: `fills[0].fillColor` (background), `strokes` (border color +
  width), `borderRadius*`, `flex` paddings/gaps, `shape.tokens` (bound tokens beat raw values —
  when a property has a bound token, document the token's semantic name, not the raw hex).
- First 2–3 text descendants: family/size/weight/lineHeight/letterSpacing + fill → match against
  the `typography:` map.
- **Variants:** if `comp.isVariant()`, read `comp.variants.properties` and each
  `variantComponents()[].variantProps` — safe to READ (gotcha #12 forbids mutation only). Each
  state/size combination that changes styling becomes its own `components:` entry
  (`button-primary-hover`), sampled from that variant's own main instance.
- Normalize: fontSize to px number, colors to lowercase hex in analysis; in the final YAML emit
  **quoted hex** (lowercase accepted), per the format contract.

## Visual grounding exports (Phase 3 input)
Export (separate `export_shape` tool calls): the Cover board, 1–2 component-sheet boards, and any
real screen. PNG. These are what the description/Overview/Do's & Don'ts prose must be written from.
