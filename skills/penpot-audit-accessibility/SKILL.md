---
name: penpot-audit-accessibility
description: "Audit a Penpot design against WCAG 2.1/2.2 AA (optionally AAA) and produce a structured severity report: color contrast, touch/target sizes, text alternatives, heading hierarchy, and keyboard/focus order. Proposes fixes — does not auto-apply. Also serves as the Evaluator in the brief-to-screen and brief-to-deck loops (scope:deck = slide contrast rules). Triggers: 'check accessibility', 'accessibility audit', 'WCAG check', 'contrast audit', 'a11y review', 'check color contrast', 'is this accessible'."
disable-model-invocation: false
version: 0.4.0
audiences: [design-system, product-designer, design-engineer, migration]
mode-default: suggest
requires:
  - shared/penpot-mcp-tool-reference.md
  - shared/plugin-api-gotchas.md
  - shared/naming-conventions.md
  - shared/modes-and-policies.md
---

# penpot-audit-accessibility — WCAG AA auditor

Inspect a design and report its accessibility issues as an **accessibility specialist**: contrast
computed from resolved fills, target sizes measured, heading order and labels read from semantic layer
names, focus order inferred. The skill reads; it never changes the canvas.

**The one rule: report, don't silently fix.** Every issue carries severity, impact, a concrete fix and
a confidence. The acceptance criteria are gates — a screen is not "done" until they pass — but the fix
belongs to the skill that owns the thing being fixed, behind its own review.

Tool surface: `shared/penpot-mcp-tool-reference.md`. API traps: `shared/plugin-api-gotchas.md`.

## Brief contract
- **Context** — what is audited (page / selection / component) and the product surface.
- **Objective** — "audit X against WCAG 2.1/2.2 AA" (say AAA if requested).
- **Inputs** — target shapes, conformance level, known exceptions.
- **Constraints** — read-only.
- **Acceptance Criteria** — every interactive element checked; contrast ≥ 4.5:1 for normal text and
  ≥ 3:1 for large text and UI components; targets ≥ 24×24 (WCAG 2.2 SC 2.5.8; note 44×44 for primary
  actions); headings ordered; the report complete.

**`scope:deck`** (slides built by `penpot-build-deck`; the evaluator in `brief-to-deck`). The scope is
the deck page and every top-level board named `NN-…` is one slide. Text ≥ 24 px, or ≥ 18.67 px with
`fontWeight ≥ 700`, is *large* → 3:1; smaller text → 4.5:1. On gradient or glass surfaces average the
stops and flag the result as heuristic. Skip target-size checks (a deck has no controls beyond
navigation). Heading hierarchy = exactly one `h1` per slide. Report `scope` as the deck page name and
name the slide in every finding.

## Workflow
**Phase 0 — Inspection.** `high_level_overview`, then `scripts/collectAccessibilityData.js`
(`references/01-inspection.md`). Read colors from `shape.fills` / `shape.strokes` (a Text's color is its
fill) and sizes from `width` / `height` / `bounds`.

**Phase 1 — Contrast.** `scripts/checkColorContrast.js` (`references/02-contrast-checks.md`): text
against its effective background, and UI component contrast.

**Phase 2 — Sizing.** `scripts/checkTouchTargets.js` (`references/03-sizing-checks.md`).

**Phase 3 — Semantics.** Heading hierarchy, labels and text alternatives (from semantic layer names),
keyboard / focus order (from layout order and interactions).

**Phase 4 — Report.** `scripts/generateReport.js` (`references/04-report-generation.md`): severity-ranked
and handoff-ready, with `export_shape` evidence of the affected boards (export a board, not `"page"`).
✋ Present the findings and ask: fix now, or hand off? Fixes are routed to the owning skill (for
example `penpot-foundations` for a token change) under its Apply-with-review.

## Rules
1. **Read-only.** No mutation here, not even an "obvious" one — an audit that edits what it measures
   cannot be trusted as evidence.
2. **Compute, never eyeball.** A ratio is calculated and compared with 4.5:1 / 3:1; a target is
   measured and compared with 24×24. Composite any opacity below 1 over the background first.
3. **Every issue:** severity (High / Medium / Low), criterion, element, current vs required, fix,
   confidence.
4. **Heading checks need semantic names** (`h1`…`h6`). Visual size is not semantic order: when layers
   are auto-named, flag those checks as unreliable and recommend `penpot-rename-layers` first.
5. **Say what is heuristic.** Focus order, and contrast over gradients or images, are estimates —
   label them as such.
6. **No silent scope cuts.** If you sampled or capped, the report says so.

## Report and state
Per issue: `{ severity, criterion (e.g. "1.4.3 Contrast"), element, current, required, fix, confidence }`,
plus a summary: counts by severity, pass/fail per criterion, and a handoff checklist. Emit it ALSO as
JSON per `shared/report-schemas/accessibility-report.schema.json`, including the derived
`highOrMedium` count — the number `brief-to-screen` and `brief-to-deck` branch on — and mirror it to
the run ledger (`RUN_ID`: `phase`, `issues`, `sampled`).

Mode: **suggest** (`shared/modes-and-policies.md`).

## Supporting files
- **references/** — `01-inspection.md`, `02-contrast-checks.md`, `03-sizing-checks.md`,
  `04-report-generation.md`.
- **scripts/** (paste into `execute_code`, all read-only) — `collectAccessibilityData.js`,
  `checkColorContrast.js` (WCAG luminance + ratio), `checkTouchTargets.js`, `generateReport.js`.
- WCAG criteria used: 1.4.3 contrast, 1.4.11 non-text contrast, 2.5.8 target size, 1.3.1 info and
  relationships, 2.4.3 focus order.

**Doctrine paths.** `shared/…` and `policies/…` resolve inside this bundle in native installs (vendored by the installer); in a Claude Code plugin install they live at the plugin root — `${CLAUDE_PLUGIN_ROOT}/shared/…`, two directories up from this file.
