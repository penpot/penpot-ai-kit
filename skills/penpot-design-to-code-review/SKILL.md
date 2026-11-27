---
name: penpot-design-to-code-review
description: "Review a Penpot design against its implemented code (a source component or Storybook story) and emit a structured DRIFT report. Use when an engineer needs to confirm the build matches the design: extract HTML/CSS from a selection, map its tokens/structure/states to the code component, diff them, and list what each side is missing with severity and a reconciliation. Degrades gracefully to a design-system-token check when no code source is supplied. Triggers: 'design to code review', 'does my code match the design', 'design code parity', 'compare Penpot to my component', 'check this against Storybook', 'extract HTML/CSS from this selection', 'find design drift', 'design implementation diff'."
disable-model-invocation: false
version: 0.2.1
audiences: [design-engineer]
mode-default: suggest
requires:
  - shared/penpot-mcp-tool-reference.md
  - shared/plugin-api-gotchas.md
  - shared/tokens-schema.json
  - shared/naming-conventions.md
  - shared/state-management.md
  - shared/modes-and-policies.md
---

# penpot-design-to-code-review — does the build match the design?

Read a Penpot selection, compare it with the implemented code, and report the drift. Work as a
**senior design engineer who treats the design file as the spec of record and never accepts a
hardcoded value where a token exists**. The design side comes from the selection (`shape.tokens`, raw
styles, `penpot.generateMarkup` / `generateStyle`, an export); the code side — a component file, or a
Storybook story's DOM + CSS — is supplied by the user or by another tool. With no code source the
skill still runs, comparing the selection against the design-system tokens.

**The one rule: never one-shot a review, and never mutate during one.** Extract → normalize → map →
diff → report, one step per call with a checkpoint between phases. The only output is a structured
DRIFT report; fixes are handed to a write skill under its own checkpoints.

Tool surface: `shared/penpot-mcp-tool-reference.md`. API traps: `shared/plugin-api-gotchas.md`.

## Brief contract
- **Context** — what is reviewed (a component, a state set, a screen region), for which app and
  framework.
- **Objective** — specific: "confirm `<Button variant=primary size=md>` in `src/Button.tsx` matches the
  selection, including hover and disabled". Not "review the design".
- **Inputs** — the selection (empty → ask); the code source (file path, pasted code, a Storybook story,
  or explicitly none); the token set in play.
- **Constraints** — which side is authoritative for which dimension (usually: design for visual tokens,
  spacing and states; code for behavior and semantics); no canvas mutation.
- **Acceptance Criteria** —
  - every design property is classified `match` / `drift` / `code-only` / `design-only`;
  - every color / spacing / radius / type drift names the token involved, or says "no token bound";
  - color drifts give the hex delta and, where relevant, the contrast impact with its WCAG criterion;
  - spacing drifts give the px delta and whether the value is on the 4px grid;
  - state coverage is a matrix (design states × code states) with explicit gaps;
  - every finding has a severity.

## Workflow
**Phase 0 — Discovery (read-only).** `high_level_overview`; resolve `penpot.selection` (empty → stop and
ask); `penpotUtils.shapeStructure(shape, 4)` per selected shape; `penpotUtils.tokenOverview()`; confirm
the code source. ✋ Show structure, tokens and the code source; confirm scope and which side is
authoritative for what.

**Phase 1 — Extract.** `scripts/extractMarkupStyle.js`, one call: `generateMarkup`, `generateStyle`, and
a per-node map `{ id, name, type, tokens, rawFills, rawSpacing, radius, typography }`
(`references/01-extract-markup-style.md`). ✋ Show the trimmed markup and style and the token map.

**Phase 2 — Comparison image.** `scripts/exportForCompare.js` for ids and bounds, then `export_shape`
(PNG) per state board. Ask for a screenshot of the rendered code or story, or capture it with a
browser tool if one is available. ✋ Side by side; let the engineer flag deltas to prioritize.

**Phase 3 — Map design ↔ source.** Parse the code (props, CSS variables, state classes or variants)
and build the table `designNode → codeElement`, `designToken → codeVar`, `designState → codeState`
(`references/02-mapping-to-source.md`; Storybook stories: `references/03-storybook-compare.md`). No
code source → map against the design-system tokens only and leave the code column out.
✋ Show the mapping; correct mis-maps before diffing.

**Phase 4 — Diff and report.** Apply `references/04-drift-report.md` (normalization, severity rubric,
reconciliation phrasing) and assemble with `scripts/generateDriftReport.js`. ✋ Present the report; if
fixes are wanted, hand off — token work to `penpot-foundations`, layer names to
`penpot-rename-layers`, structural rebuilds to `penpot-build-from-code`.

## Rules
1. **Read-only on the canvas.** No mutating call, not even to "fix" an obvious fill.
2. **Pass arrays and verified options.** `penpot.generateMarkup(shapes, { type: "html" | "svg" })` and
   `penpot.generateStyle(shapes, { type: "css", withPrelude?, includeChildren? })` take an **array** of
   shapes (`penpot.selection` already is one). An unknown option key silently yields default output and
   a false "no drift": confirm the keys with `penpot_api_info("Penpot", "generateStyle")`, and when the
   output looks too short suspect the options or a non-array argument first.
3. **Never string-compare raw CSS.** `generateStyle` states the design's intent and knows nothing of
   the code's class names. Normalize both sides first — units → px, colors → lowercase hex, shorthands
   expanded, properties sorted; map code variables onto dot-notation
   (`--color-action-primary-bg` ↔ `color.action.primary.bg`).
4. **Name the token in every visual finding.** Read `shape.tokens` first; match raw hex against the
   token set only when nothing is bound.
5. **An untokenized value is a finding even when it matches the code** — Minor, "value not tokenized".
6. **Spacing findings state the px delta and the grid alignment;** a value off the 4px grid is flagged
   whether or not the code matches it.
7. **State coverage is a matrix,** every (design state × code state) cell reported.
8. **Degrade, don't guess.** No code source → say so in the report header (`codeSource: "none"`) and
   report design-side findings only; never fabricate the code side.
9. **Auto-named layers lower confidence.** Mapping relies on semantic names (`button`, `label`,
   `icon`); a selection full of `Rectangle 12` → recommend `penpot-rename-layers` and say the
   structural diff is less reliable.

More excuses and countermeasures: `references/05-anti-rationalization.md`.

## Report
```
{ runId, scope, codeSource: "file" | "storybook" | "none",
  authoritative: { visual: "design", behavior: "code", … },
  summary: { match, drift, codeOnly, designOnly, critical, major, minor },
  findings: [{ id, dimension: "color" | "spacing" | "typography" | "radius" | "structure" | "state",
               designNode, codeElement, designValue, codeValue, token,
               status: "match" | "drift" | "design-only" | "code-only",
               delta, grid4px, wcag, severity: "Critical" | "Major" | "Minor", reconciliation }],
  stateMatrix: { design: […], code: […], cells: [{ state, design, code }] } }
```
Formalized in `shared/report-schemas/drift-report.schema.json`; include the derived top-level `drift`
count (`summary.drift + summary.designOnly + summary.codeOnly`), which `code-to-penpot-sync` branches on.

Severity, in short (full rubric in `references/04-drift-report.md`): **Critical** — a state missing on
one side of an interactive element, or a color drift that drops contrast below WCAG AA; **Major** — a
mismatch users will notice (wrong semantic token, spacing off by ≥ 8px, type mismatch, a missing
element); **Minor** — hygiene (untokenized but matching, ≤ 4px delta, naming).

## Mode and state
Mode **suggest**, always (`shared/modes-and-policies.md`): there is nothing to auto-apply.

State (`shared/state-management.md`, `RUN_ID` such as `d2c-2026-06-05-a`): plain data in
`storage.run` — `scope`, `tokens`, `extracted`, `mapping`, `report`. Nothing is written into the file
unless the user asks to persist the report (`${RUN_ID}.driftReport`). In a new session, re-run Phase 0
rather than trusting a stale report.

## Supporting files
- `references/01-extract-markup-style.md` · `02-mapping-to-source.md` · `03-storybook-compare.md` ·
  `04-drift-report.md` · `05-anti-rationalization.md`.
- `scripts/extractMarkupStyle.js` (Phase 1) · `scripts/exportForCompare.js` (Phase 2) ·
  `scripts/generateDriftReport.js` (Phase 4) — all read-only.

**Doctrine paths.** `shared/…` and `policies/…` resolve inside this bundle in native installs (vendored by the installer); in a Claude Code plugin install they live at the plugin root — `${CLAUDE_PLUGIN_ROOT}/shared/…`, two directories up from this file.
