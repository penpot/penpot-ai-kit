---
name: penpot-audit-accessibility
description: "Audit a Penpot design against WCAG 2.1/2.2 AA (optionally AAA) and produce a structured severity report: color contrast, touch/target sizes, text alternatives, heading hierarchy, and keyboard/focus order. Proposes fixes — does not auto-apply. Also serves as the Evaluator in the brief-to-screen loop. Triggers: 'check accessibility', 'accessibility audit', 'WCAG check', 'contrast audit', 'a11y review', 'check color contrast', 'is this accessible'."
disable-model-invocation: false
version: 0.2.0
audiences: [design-system, product-designer, design-engineer, migration]
mode-default: suggest
requires:
  - shared/penpot-mcp-tool-reference.md
  - shared/plugin-api-gotchas.md
  - shared/naming-conventions.md
  - shared/modes-and-policies.md
---

# penpot-audit-accessibility — WCAG AA auditor

## 1. Title + How it works
`penpot-audit-accessibility` inspects a design and reports accessibility issues. Every mutation goes
through `execute_code` (this skill only reads); validate visually with `export_shape`; read structure
with `penpotUtils.shapeStructure` (full tool surface: `shared/penpot-mcp-tool-reference.md`). It reads the object tree
(`penpotUtils.shapeStructure`/`analyzeDescendants`), computes WCAG contrast from resolved fills, checks
sizes and semantic naming, and emits a severity-ranked report. **It proposes; it does not auto-fix.**

## 2. The One Rule That Matters Most
**Report, don't silently fix.** Every issue gets severity + impact + a concrete fix + confidence.
Acceptance criteria (AA contrast, target size) are gates — a screen isn't "done" until they pass.

## 3. Penpot MCP Tool Reference
Full surface: `shared/penpot-mcp-tool-reference.md`. Key calls: `execute_code` with
`penpotUtils.analyzeDescendants` (collect text/colors/sizes), `penpot.shapesColors(shapes)` if needed;
`export_shape` to capture evidence for the report.

## 4. Plugin API Essentials
Gotcha numbers refer to `shared/plugin-api-gotchas.md`:
- **#1** — read resolved colors from `shape.fills`/`shape.strokes` (arrays; items immutable). Text color is the Text shape's fill.
- **#5** — get dimensions from `shape.width`/`shape.height`/`shape.bounds` (read-only; this skill never resizes).
- Heading hierarchy depends on **semantic layer names** (h1…h6) — if layers are unnamed, recommend `penpot-rename-layers` first.
- Focus/keyboard order is inferred from layout order + interactions; this is heuristic, flag as such.
- Verify unfamiliar signatures with `penpot_api_info` before relying on them.

## 5. Token-Aware Brief Contract
- **Context** — what's being audited (page/selection/component); product surface.
- **Objective** — single: "audit X against WCAG 2.1 AA" (state AAA if requested).
- **Inputs** — target shapes, conformance level, any known exceptions.
- **Constraints** — read-only; no canvas mutation.
- **Acceptance Criteria** — every interactive element checked; contrast 4.5:1 (normal) / 3:1 (large & UI); targets ≥24×24 (WCAG 2.2; note 44×44 for primary); headings ordered; report complete.

Act as an **accessibility specialist**.

## 6. Mandatory Workflow
**Phase 0 — Inspection.** `high_level_overview`; collect data with `scripts/collectAccessibilityData.js` (`references/01-inspection.md`).

**Phase 1 — Contrast.** `scripts/checkColorContrast.js` (`references/02-contrast-checks.md`) — text vs background, UI component contrast.

**Phase 2 — Sizing.** `scripts/checkTouchTargets.js` (`references/03-sizing-checks.md`) — interactive target sizes.

**Phase 3 — Semantics.** Heading hierarchy, labels/alt (from semantic names), keyboard/focus order heuristics.

**Phase 4 — Report.** `scripts/generateReport.js` (`references/04-report-generation.md`) — severity-ranked, handoff-ready. ✋ Checkpoint: present findings; if asked to fix, route safe fixes to the owning skill (e.g. `penpot-foundations` for token swaps) with review.

## 7. Critical Rules
1. Read-only; never mutate the canvas in this skill.
2. Every issue: Severity (High/Med/Low) + Issue + Impact + Fix + Confidence.
3. Use exact thresholds: 4.5:1 / 3:1; targets ≥24×24 (AA 2.2).
4. If naming is missing, flag heading-hierarchy checks as unreliable and recommend renaming first.
5. Mark heuristic checks (keyboard order) as such; don't overstate confidence.
6. No silent scope cuts — if you sampled, say so.

## 8. Domain Architecture
Report schema per issue:
```
{ severity, criterion (e.g. "1.4.3 Contrast"), element, current, required, fix, confidence }
```
Plus a summary: counts by severity, pass/fail per criterion, and a handoff checklist.

The final report must ALSO be emitted as a JSON object per `shared/report-schemas/accessibility-report.schema.json` — including the derived `highOrMedium` count (findings with severity High or Medium; what the `brief-to-screen` workflow branches on) — and mirrored to the run ledger.

## 9. Modes & Policies
Default **suggest** (read-only). Any fix is delegated to the owning skill under Apply-with-review.

## 10. State Management
Ledger under `RUN_ID`: `phase`, `issues:[...]`, `sampled`. Lightweight; this skill is mostly read.

## 11. User Checkpoints
| After phase | Artifacts | Ask |
|-------------|-----------|-----|
| 4 Report | severity report + `export_shape` evidence | Fix now (route to owning skill) or hand off? |

## 12. Naming Conventions
`shared/naming-conventions.md` — semantic HTML names enable heading-hierarchy and label checks.

## 13. Anti-Rationalization Table
| Excuse | Why it's wrong | Countermeasure (halt) |
|--------|----------------|------------------------|
| "Contrast looks fine to me." | Eyeballing isn't WCAG. | Compute the ratio; compare to 4.5:1 / 3:1. |
| "I'll just fix it myself quietly." | This skill is read-only/advisory. | Report with severity; route fixes to the owning skill with review. |
| "Targets are probably big enough." | Guessing fails AA 2.2. | Measure width/height; compare to ≥24×24. |
| "Headings are obvious from size." | Visual size ≠ semantic order. | Check semantic names; if missing, recommend `penpot-rename-layers`. |
| "Skip keyboard order, hard to tell." | Silent gaps mislead. | Provide a heuristic order and flag confidence explicitly. |

## 14. Helper Code Snippets
```js
// WCAG relative luminance + contrast ratio
function lum(hex){const c=hex.replace('#','');const v=[0,2,4].map(i=>parseInt(c.substr(i,2),16)/255)
  .map(u=>u<=0.03928?u/12.92:Math.pow((u+0.055)/1.055,2.4));return 0.2126*v[0]+0.7152*v[1]+0.0722*v[2];}
function ratio(a,b){const L1=lum(a),L2=lum(b);const hi=Math.max(L1,L2),lo=Math.min(L1,L2);return (hi+0.05)/(lo+0.05);}
return { example: Number(ratio('#101114','#F7F8FA').toFixed(2)) }; // ~ AA pass
```

## 15. Reference Resources
- WCAG 2.1/2.2 SC 1.4.3 (contrast), 2.5.8 (target size), 1.3.1 (info & relationships), 2.4.3 (focus order).
- `penpot_api_info('Text')`, `penpot_api_info('Shape','fills')`.

## 16. Supporting Files
**references/**: `01-inspection.md`, `02-contrast-checks.md`, `03-sizing-checks.md`, `04-report-generation.md`.
**scripts/**: `collectAccessibilityData.js`, `checkColorContrast.js`, `checkTouchTargets.js`, `generateReport.js`.
