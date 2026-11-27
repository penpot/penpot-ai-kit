---
name: penpot-design-md
description: "Extract a DESIGN.md design-documentation file from a Penpot file: a portable markdown spec (YAML frontmatter with colors/typography/rounded/spacing/components token maps + prose sections: Overview, Colors, Typography, Layout, Shapes, Components, Do's & Don'ts, Iteration Guide, Known Gaps) in the design-md format, grounded in the file's real tokens, library assets, and sampled component styles — never invented. Read-only on the canvas; writes one local markdown file. Triggers: 'generate DESIGN.md', 'create a design.md', 'document the design system as markdown', 'export design guidelines', 'extract design documentation', 'design system spec file', 'make a style guide file from this design'."
disable-model-invocation: false
version: 0.2.1
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

# penpot-design-md — extract a DESIGN.md spec from a Penpot file

Turn a Penpot file into a **DESIGN.md**: one portable markdown document from which a human or another
agent can reproduce the design system without opening Penpot — YAML frontmatter with the token maps
(`colors`, `typography`, `rounded`, `spacing`, `components`) plus prose on how the system behaves.
Work as a **senior design-systems documentarian whose reader will rebuild the system from this file
alone**. The skill never changes the canvas; its only write is one local markdown file.

**The one rule: every value is traceable to something you read or saw in the file — never invented,
never "typical".** A hex in `colors:` came from a token, a library color or a sampled fill; a padding
in `components:` came from a real component's layout; a "Don't" was observed. What cannot be extracted
goes in **Known Gaps** — downstream agents will *build* from this file, so an honest gap beats a
plausible fabrication.

Tool surface: `shared/penpot-mcp-tool-reference.md`. API traps: `shared/plugin-api-gotchas.md`.

## Brief contract
- **Context** — which file and pages, what the product is, who consumes the DESIGN.md.
- **Objective** — e.g. "produce `DESIGN.md` covering tokens, type, shape language and the Button /
  Input / Modal families".
- **Inputs** — token sets and themes, library components / colors / typographies, pages to sample, the
  output path.
- **Constraints** — scope (whole system or named components); which theme is canonical; the format is
  the contract in `references/02-designmd-format.md` — no alternative section names.
- **Acceptance Criteria** —
  - every `colors:` entry has a hex read from the file, with its source noted;
  - every `typography:` entry has fontFamily / fontSize / fontWeight / lineHeight / letterSpacing read
    from a typography asset or a sampled text;
  - `components:` covers the agreed list, values interpolated through `{colors.*}` /
    `{typography.*}` / `{rounded.*}` (no raw hex where a mapped color exists);
  - Overview and Do's & Don'ts cite only observed behavior, written after looking at ≥ 1 export;
  - Known Gaps lists every domain that could not be extracted.

## Workflow
**Phase 0 — Discovery (read-only).** `high_level_overview`, then `scripts/extractDesignData.js`: pages,
token sets (with themes and active state), library components / colors / typographies, counts
(`references/01-extraction.md`). ✋ Show the inventory and agree scope, canonical theme and output
path — and which sections will be rich and which will land in Known Gaps.

**Phase 1 — Tokens and assets.** One `execute_code` per group: color tokens (name → resolved value,
per theme where sets differ), spacing / radius / dimension tokens, typography assets, library colors.
Derive the semantic map (`canvas`, `surface-*`, `ink-*`, `primary`, hairline, `semantic-*`) from token
names and tiers; in a token-poor file, from library-color groups and usage sampling
(`references/03-inference.md`). ✋ Show the draft maps and anything unmapped; confirm the names.

**Phase 2 — Component sampling.** `scripts/sampleComponentStyles.js`, at most 5 components per call:
background, text, border, radius, padding, typography, bound tokens, and variant axes
(`variants.properties`, `variantProps`) — states become separate entries (`button-primary-hover`).
Interpolate through the Phase 1 maps. ✋ Show 2–3 sample entries for tone and depth before the rest.

**Phase 3 — Visual character.** `export_shape` the cover and 1–3 representative boards (a specific
board, not `"page"`), and **look at them**. Then write the frontmatter `description` (one dense
paragraph: surfaces, accent use, type character, shape language, rhythm), the Overview with its Key
Characteristics, and the Do's & Don'ts. ✋ Show the exports next to the prose.

**Phase 4 — Assemble, check, write.** Assemble from `references/04-designmd-template.md` in the fixed
section order of `references/02-designmd-format.md`, run its self-check (frontmatter parses as YAML,
every `{ref}` resolves, no raw hex in `components:` where a `colors:` entry exists, Known Gaps
non-empty unless truly complete), and write the file. Overwriting an existing DESIGN.md needs explicit
confirmation, with a diff summary first. ✋ Present the file for final approval.

## Rules
1. **Read-only on the canvas.** No shape, token or library change; the only write is the markdown file.
2. **No invented values.** Sample the real `mainInstance()` before writing any component entry — "a
   standard button, 8px radius" is fabrication. Unknown → Known Gaps.
3. **Look before you describe.** No aesthetic prose before an export has been viewed: token names do
   not say whether a design is dense or airy, flat or elevated.
4. **Do's & Don'ts document this system**, not design folklore: each one traces to a token structure,
   a sampled style or a viewed export.
5. **Interpolate, don't repeat.** Raw values appear once, in the frontmatter maps; prose and
   `components:` reference them.
6. **Themes are explicit.** Document the canonical theme in the maps and the other as a delta
   subsection; never mix or average values from both.
7. **Curate, then disclose.** A 100-token file is summarized into semantic groups — and the collapse
   is stated ("107 global tokens → 14 semantic colors").
8. **Dedupe library colors by group** (`color.path`): the same short name in two groups is two colors.
9. **Normalize text metrics** to px numbers (`fontSize` can be a string).
10. **One extraction step per call.** Reading variants is always safe; record their `Property=Value`
    matrices.

More excuses and countermeasures: `references/05-anti-rationalization.md`.

## Mode, state and naming
Mode **suggest**, always: nothing on the canvas to apply (`shared/modes-and-policies.md`).

State (`shared/state-management.md`, `RUN_ID` such as `designmd-2026-07-09-a`): the session cache
`storage.run` holds `inventory`, `maps`, `componentEntries`, `exportsViewed`, `gaps` (data only). No
plugin data is written unless the user asks for a pointer to the generated doc
(`designmd.lastGenerated`). If the cache is gone, re-run Phase 0 — extraction is cheap.

Naming: frontmatter keys are kebab-case semantic names in the design-md idiom (`ink-muted`,
`surface-2`, `display-xl`, `button-primary-hover`). Record the mapping from Penpot's dot-notation
tokens (`color.text.muted → ink-muted`) in the Colors section so the doc stays traceable.

## Supporting files
- `references/01-extraction.md` — what to read where: sets and themes, assets, sampling recipes,
  variant axes, theme handling.
- `references/02-designmd-format.md` — the contract: frontmatter schema, section order, interpolation
  rules, tone, the self-check list.
- `references/03-inference.md` — semantic maps without tokens.
- `references/04-designmd-template.md` — the fill-in skeleton.
- `references/05-anti-rationalization.md` — excuses and countermeasures.
- `scripts/extractDesignData.js` (Phase 0) · `scripts/sampleComponentStyles.js` (Phase 2) — both
  read-only.

**Doctrine paths.** `shared/…` and `policies/…` resolve inside this bundle in native installs (vendored by the installer); in a Claude Code plugin install they live at the plugin root — `${CLAUDE_PLUGIN_ROOT}/shared/…`, two directories up from this file.
