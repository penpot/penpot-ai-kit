---
name: penpot-design-md
description: "Extract a DESIGN.md design-documentation file from a Penpot file: a portable markdown spec (YAML frontmatter with colors/typography/rounded/spacing/components token maps + prose sections: Overview, Colors, Typography, Layout, Shapes, Components, Do's & Don'ts, Iteration Guide, Known Gaps) in the design-md format, grounded in the file's real tokens, library assets, and sampled component styles — never invented. Read-only on the canvas; writes one local markdown file. Triggers: 'generate DESIGN.md', 'create a design.md', 'document the design system as markdown', 'export design guidelines', 'extract design documentation', 'design system spec file', 'make a style guide file from this design'."
disable-model-invocation: false
version: 0.2.0
audiences: [design-system, design-engineer, product-designer]
mode-default: suggest
requires:
  - shared/penpot-mcp-tool-reference.md
  - shared/plugin-api-gotchas.md
  - shared/tokens-schema.json
  - shared/naming-conventions.md
  - shared/state-management.md
  - shared/modes-and-policies.md
  - shared/visual-self-review.md
---

# penpot-design-md — Extract a DESIGN.md spec from a Penpot file

## 1. Title + How it works
This skill turns a Penpot file into a **DESIGN.md**: a single, portable markdown document that lets any human or
LLM reproduce the design system without opening Penpot — YAML frontmatter carrying the token maps
(`colors`, `typography`, `rounded`, `spacing`, `components`) plus prose sections that explain how
the system *behaves* (Overview, per-domain sections, Do's & Don'ts, Iteration Guide, Known Gaps).
Every mutation goes through `execute_code`; validate visually with `export_shape`; read structure
with `penpotUtils.shapeStructure` (full tool surface: `shared/penpot-mcp-tool-reference.md`) — but
this skill performs **no canvas mutation at all**: it only reads (tokens, library assets, sampled
component styles, exported images) and writes **one local markdown file** on the agent's
filesystem. It is multimodal by design: the aesthetic prose (frontmatter `description`, Overview,
Do's & Don'ts) must be written *after looking at real exports*, not from token names alone.

---

## 2. The One Rule That Matters Most
**Every value in the DESIGN.md must be traceable to something you read or saw in the file — never
invented, never "typical".** A hex that appears in `colors:` was read from a token, a library
color, or a sampled shape fill. A padding in `components:` was read from a real component's
layout. A "Don't" was observed (the file never does it), not imagined. When something cannot be
extracted, it goes in **Known Gaps** — an honest gap beats a plausible fabrication, because
downstream agents will *build* from this file.

---

## 3. Penpot MCP Tool Reference
Full surface: `shared/penpot-mcp-tool-reference.md`. The calls this skill leans on (all read-only):

| Need | Call (inside `execute_code` unless noted) |
|------|-------------------------------------------|
| Pages inventory | `penpotUtils.getPages()`, `penpotUtils.getPageByName(name)` |
| Token sets, themes, tokens | `penpot.library.local.tokens` → `sets[]`, `themes[]`, `set.tokens[]` (`name`, `type`, `value`, `resolvedValue`) |
| Library assets | `penpot.library.local` → `components[]`, `colors[]`, `typographies[]` |
| Component style sampling | `component.mainInstance()` then walk children: `fills`, `strokes`, `borderRadius*`, `flex` (padding/gap), text `fontFamily/fontSize/fontWeight/lineHeight/letterSpacing`, `shape.tokens` |
| Structure of a page/board | `penpotUtils.shapeStructure(shape, depth)` |
| Visual grounding | `export_shape` (**separate MCP tool**) on the cover, key component boards, and 1–2 representative screens |

Verify any unfamiliar signature with `penpot_api_info` before relying on it.

---

## 4. Plugin API Essentials
The gotchas that bite **this** skill (full list: `shared/plugin-api-gotchas.md`):

- **#1 style arrays** — read `fills[0].fillColor` etc.; never attempt to write (this skill doesn't mutate).
- **Variant reading is safe** (#12 forbids *mutation* only) — read `variants.properties`, `variantComponents()[].variantProps` freely to document the variant axes.
- **Library color duplicates** — `library.local.colors` can hold several entries with the same short name (`default`, `hover`) belonging to different groups; disambiguate by `color.path`/group before mapping to semantic names, or fall back to value-based grouping.
- **Text metrics live on the shape** — `fontSize` is a string in some builds; normalize to px numbers when emitting `typography:`.
- **`mainInstance()` of a heavy component can be slow** — sample components one `execute_code` call per batch of ~5, not all in one blast.
- Verify unfamiliar signatures with `penpot_api_info` before use.

---

## 5. Token-Aware Brief Contract
Before extracting, restate the request. **Act as a senior design-systems documentarian: your
reader is another agent that will rebuild this system from your file alone.**

- **Context** — which Penpot file/pages, what the product is, who consumes the DESIGN.md (humans, coding agents, both).
- **Objective (single)** — e.g. *"Produce `DESIGN.md` for the Pencil design system covering tokens, type, shape language, and the Button/Input/Modal component families."*
- **Inputs** — the file's token sets + themes, library components/colors/typographies, the pages to sample, the output path for the file.
- **Constraints** — scope (whole system vs. named components); which theme is canonical (light/dark) and how to document the other; format is the design-md contract (see `references/02-designmd-format.md`) — do not invent alternative section names.
- **Acceptance Criteria (quantitative)** —
  - every `colors:` entry has a hex read from the file, and its source (token/library color/sampled fill) is noted in the body or Known Gaps;
  - every `typography:` entry carries fontFamily/fontSize/fontWeight/lineHeight/letterSpacing read from a typography asset or a sampled text shape;
  - `components:` covers the agreed component list, each with values interpolated from `{colors.*}`/`{typography.*}`/`{rounded.*}` (no raw hex where a mapped color exists);
  - Overview and Do's & Don'ts cite only observed behavior; ≥1 export was actually looked at before writing them;
  - Known Gaps lists every domain that could not be extracted (responsive behavior, motion, elevation, …).

---

## 6. Mandatory Workflow

> **Visual grounding (mandatory):** this skill's variant of `shared/visual-self-review.md` — you
> cannot write the `description`, Overview, or Do's & Don'ts before exporting and **looking at**
> the cover / key screens. Aesthetic prose written from token names alone is fabrication.

### Phase 0 — Discovery (read-only)
- **Goal:** inventory what the file offers before deciding the extraction plan.
- **Steps:**
  1. `high_level_overview` (once per session).
  2. `execute_code`: run `scripts/extractDesignData.js` → pages, token sets (+ themes, active state), library components/colors/typographies, counts. Cache in `storage.run.inventory`.
  3. Decide with the user: scope (which components to document in depth), canonical theme, output path.
- **Exit criterion:** an inventory + an agreed scope and output path.
- ✋ **Checkpoint:** show the inventory summary and the proposed DESIGN.md scope (which sections will be rich, which will land in Known Gaps).

### Phase 1 — Token & asset extraction
- **Goal:** the raw material for the frontmatter maps.
- **Steps:** `execute_code` per group: dump color tokens (name → resolvedValue, per theme where sets differ), dimension/spacing/radius tokens, typography assets, library colors (deduped by group/path). Derive the **semantic mapping** (`canvas`, `surface-*`, `ink-*`, `primary`, hairline, semantic-*) from token names/tiers where they exist; from library-color groups and usage sampling where they don't (see `references/03-inference.md`).
- **Exit criterion:** draft `colors:`, `typography:`, `rounded:`, `spacing:` maps with a source note per entry.
- ✋ **Checkpoint:** show the draft maps + anything unmapped. Confirm semantic names before they ossify into the doc.

### Phase 2 — Component sampling
- **Goal:** the `components:` map + the Components body section.
- **Steps:** for each in-scope component (batches of ≤5 per `execute_code`): resolve `mainInstance()`, read background/text/border/radius/padding/typography and bound tokens; capture variant axes (`variants.properties`, `variantProps`) — states become separate entries (`button-primary-hover`, …). Interpolate values through the Phase 1 maps.
- **Exit criterion:** every in-scope component has a frontmatter entry + body bullets; unresolved values are flagged.
- ✋ **Checkpoint:** show 2–3 sample component entries for tone/format approval before doing the full list.

### Phase 3 — Visual character pass
- **Goal:** the honest aesthetic prose.
- **Steps:** `export_shape` the cover and 1–3 representative boards/screens. **Look at them.** Write: frontmatter `description` (one dense paragraph: dominant surfaces, accent usage, type character, shape language, rhythm), Overview (+ Key Characteristics bullets), and Do's & Don'ts (only rules the file itself demonstrates or its token structure implies).
- **Exit criterion:** prose grounded in what was seen; each Don't traceable to an observation ("no pill buttons anywhere", "single accent hue").
- ✋ **Checkpoint:** show the exports next to the drafted prose.

### Phase 4 — Assemble, self-review, write
- **Goal:** the deliverable.
- **Steps:** assemble per `references/02-designmd-format.md` (section order fixed); run the format self-check (frontmatter parses as YAML, every `{ref}` resolves to a frontmatter key, no raw hex in `components:` where a `colors:` entry exists, Known Gaps non-empty unless truly complete); write the file to the agreed path.
- **Exit criterion:** file written; self-check clean.
- ✋ **Checkpoint:** present the file (or its outline + key excerpts) for final approval.

---

## 7. Critical Rules
1. **Read-only on the canvas.** No shape, token, or library mutation — ever. The only write is the local markdown file.
2. **No invented values.** Every hex/px/weight is read from the file. Unknown → Known Gaps.
3. **Interpolate, don't repeat.** Body prose and `components:` reference `{colors.x}`/`{typography.y}`/`{rounded.z}`; raw values appear once, in the frontmatter maps.
4. **Look before you describe.** No aesthetic prose before at least one `export_shape` has been viewed (Phase 3).
5. **Themes are explicit.** If the file has light/dark sets, document the canonical theme in the maps and the other as a delta subsection — never silently mix values from both.
6. **Dedupe library colors by group** before semantic mapping; identical short names across groups are different colors.
7. **Curate, then disclose.** A 100+-token file is summarized into semantic groups — say what was collapsed ("107 Global tokens → 14 semantic colors; full set names in Known Gaps") — no silent truncation.
8. **One extraction step per `execute_code` call**; component sampling in batches of ≤5.
9. **Variant axes are documentation gold** — record `Property=Value` matrices for components that have them; reading them is safe.
10. **The output must lint as the format** — section order and frontmatter keys exactly per `references/02-designmd-format.md`.

---

## 8. Domain Architecture
**The DESIGN.md contract (summary — full spec in `references/02-designmd-format.md`):**

```
--- (YAML frontmatter)
version, name, description        # description = one dense aesthetic paragraph
colors:      { semantic-name: "#hex", ... }          # canvas/surface-*/ink-*/primary/hairline/semantic-*
typography:  { style-name: {fontFamily,fontSize,fontWeight,lineHeight,letterSpacing}, ... }
rounded:     { xs..pill: Npx }
spacing:     { xxs..section: Npx }
components:  { component-or-state: {backgroundColor,textColor,typography,rounded,padding,...}, ... }
---
## Overview                      # prose + **Key Characteristics** bullets
## Colors                        # Brand & Accent / Surface / Text / Semantic subsections, sources cited
## Typography                    # Font Family / Hierarchy / Principles / substitutes note
## Layout                        # Spacing System / Grid & Container / Whitespace Philosophy
## Elevation & Depth             # shadows/borders ladder (or "flat by design")
## Shapes                        # Border Radius Scale + shape language
## Components                    # per component: **`name`** + purpose + property bullets with {refs}
## Do's and Don'ts               # observed rules only
## Responsive Behavior           # only if derivable from the file; else Known Gaps
## Iteration Guide               # how a future agent should edit designs with this doc
## Known Gaps                    # everything not extractable — mandatory honesty section
```

**Run ledger keys** (see §10): `inventory`, `maps`, `componentEntries`, `exportsViewed`, `gaps`.

---

## 9. Modes & Policies
See `shared/modes-and-policies.md`. This skill is **`suggest`** and stays there: it never mutates
the canvas, so there is no safe-set and nothing to auto-apply. The single side effect — writing the
markdown file — happens at the Phase 4 checkpoint with the path the user approved in Phase 0.
Overwriting an existing DESIGN.md requires explicit confirmation (show a diff summary first).

---

## 10. State Management
See `shared/state-management.md`. `RUN_ID` slug example: `designmd-2026-07-09-a`. Session cache in
`storage.run.*` (inventory, maps, componentEntries, exports viewed, gaps). This skill is read-only,
so it does **not** write `setSharedPluginData` unless the user asks to persist a pointer to the
generated doc (`designmd.lastGenerated` = path + date). Resume: re-read `storage.run`; if gone,
re-run Phase 0 (extraction is cheap and idempotent).

---

## 11. User Checkpoints

| After phase | Artifacts shown | What we ask |
|-------------|-----------------|-------------|
| 0 Discovery | Inventory (pages, sets, themes, assets) + proposed scope & output path | "Confirm scope, canonical theme, and where to write the file." |
| 1 Tokens | Draft frontmatter maps + unmapped values | "Approve the semantic names / flag mis-mappings." |
| 2 Components | 2–3 sample component entries | "Right tone and depth? Then I'll complete the list." |
| 3 Visual | Exports + drafted description/Overview/Do's & Don'ts | "Does this prose match what you see?" |
| 4 Assemble | The written file (outline + excerpts) | "Final approval — anything to add to Known Gaps?" |

---

## 12. Naming Conventions
See `shared/naming-conventions.md`. Frontmatter keys are **kebab-case semantic names** in the
design-md idiom (`ink-muted`, `surface-2`, `display-xl`, `button-primary-hover`) — map
Penpot's dot-notation tokens onto them and record the mapping (`color.text.muted → ink-muted`) in
the Colors section so the doc stays traceable back to the file. Component entries use the
component's kebab-cased name plus `-hover/-pressed/-disabled/-selected` state suffixes derived
from variant values.

---

## 13. Anti-Rationalization Table

| Excuse the LLM makes | Why it's wrong | Deterministic countermeasure |
|----------------------|----------------|------------------------------|
| "The file has no tokens, so I'll write a typical palette." | Fabricated values poison every downstream consumer of the doc. | Stop. Sample real shape fills (`references/03-inference.md`), map what exists, put the rest in Known Gaps. |
| "I can describe the aesthetic from the token names." | `color.primary = #00d1b8` doesn't tell you whether the design is dense or airy, flat or elevated. | Halt Phase 3 until ≥1 `export_shape` has been viewed. Prose cites what was seen. |
| "107 tokens is too many; I'll just list them all raw." | A raw dump is not documentation — the format demands curated semantic groups. | Curate into the semantic map, then disclose the collapse explicitly in Colors + Known Gaps. |
| "This component is obvious — a standard button, 8px radius." | "Standard" is fabrication; this file's button may be 6px with a hairline border. | Sample the actual `mainInstance()` before writing any component entry. |
| "Do's & Don'ts are generic best practices anyway." | The section documents THIS system's rules, not design folklore. | Each Do/Don't must trace to an observation (token structure, sampled styles, or a viewed export). |
| "Light and dark values differ; I'll average or pick per-property." | Mixed-theme values describe a design that doesn't exist. | Pick the canonical theme (Phase 0 decision); document the other as a delta subsection. |

---

## 14. Helper Code Snippets

Inventory (Phase 0 — or use `scripts/extractDesignData.js`):
```js
const lib = penpot.library.local;
return {
  pages: penpotUtils.getPages().map(p => p.name),
  sets: (lib.tokens.sets || []).map(s => ({ name: s.name, active: s.active, count: (s.tokens||[]).length })),
  themes: (lib.tokens.themes || []).map(t => ({ group: t.group, name: t.name })),
  components: (lib.components || []).length, colors: (lib.colors || []).length,
  typographies: (lib.typographies || []).map(t => t.name)
};
```

Dump color tokens with resolution (Phase 1):
```js
const out = [];
for (const s of penpot.library.local.tokens.sets || []) {
  if (!s.active) continue; // canonical theme only — dump inactive sets separately as the delta
  for (const t of s.tokens || []) if (t.type === "color")
    out.push({ set: s.name, name: t.name, value: t.value, resolved: String(t.resolvedValue) });
}
return { count: out.length, tokens: out };
```

Sample one component's style (Phase 2):
```js
const comp = penpot.library.local.components.find(c => c.name === "REPLACE-ME");
const root = comp.mainInstance();
const texts = penpotUtils.findShapes(s => s.type === "text", root).slice(0, 3);
return {
  name: comp.name,
  bg: root.fills && root.fills[0] ? root.fills[0].fillColor : null,
  radius: root.borderRadius ?? null,
  padding: root.flex ? [root.flex.topPadding, root.flex.rightPadding, root.flex.bottomPadding, root.flex.leftPadding] : null,
  gap: root.flex ? [root.flex.rowGap, root.flex.columnGap] : null,
  boundTokens: root.tokens || {},
  text: texts.map(t => ({ family: t.fontFamily, size: t.fontSize, weight: t.fontWeight, lh: t.lineHeight, ls: t.letterSpacing, fill: t.fills && t.fills[0] && t.fills[0].fillColor })),
  variantAxes: comp.isVariant && comp.isVariant() ? comp.variantProps : null
};
```

---

## 15. Reference Resources
- `penpot_api_info("TokenCatalog")`, `("LibraryComponent", "mainInstance")`, `("Variants")`, `("LibraryTypography")` — verify before Phase 1/2.
- `shared/penpot-mcp-tool-reference.md` (tool surface), `shared/plugin-api-gotchas.md` (traps), `shared/tokens-schema.json` (tiers, Penpot token type strings).
- The format's canonical skeleton: `references/04-designmd-template.md` (self-contained — no external corpus needed).

---

## 16. Supporting Files

### References (progressive disclosure — load when that phase runs)

| File | Read during | Covers |
|------|-------------|--------|
| `references/01-extraction.md` | Phases 0–2 | What to read where: token sets/themes, library assets, component sampling recipes, variant axes, theme handling |
| `references/02-designmd-format.md` | Phases 3–4 | The full DESIGN.md contract: frontmatter schema, section order, interpolation rules, tone, the self-check list |
| `references/03-inference.md` | Phase 1 (token-poor files) | Deriving semantic maps without tokens: library-color groups, fill-frequency sampling, surface-ladder detection |
| `references/04-designmd-template.md` | Phase 4 | The fill-in DESIGN.md skeleton (agnostic, self-contained) — copy, fill with extracted values, delete the guidance lines |

### Scripts (paste into an `execute_code` call; replace placeholders)

| Script | Use for |
|--------|---------|
| `scripts/extractDesignData.js` | Phase 0 — one-call read-only inventory: pages, sets, themes, assets, counts |
| `scripts/sampleComponentStyles.js` | Phase 2 — batch-sample ≤5 components' resolved styles + bound tokens + variant axes |
