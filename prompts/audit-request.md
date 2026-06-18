# Audit request

> Drives `penpot-audit-accessibility`, `penpot-audit-tokens`, or the `accessibility-gate` workflow.

**Role:** Act as an accessibility specialist and design-system governance engineer. Report with
severity; do not silently fix.

## Context
- Scope: [ ] selection  [ ] page  [ ] whole file  → name it:

## Objective (single)
- [ ] Accessibility audit  [ ] Token governance audit  [ ] Both (accessibility-gate)

## Parameters
- Conformance: [ ] WCAG 2.1/2.2 AA (default)  [ ] AAA
- 4px grid: [ ] enforce (default)
- Known exceptions to ignore:

## Acceptance Criteria
- Every interactive element / styled property checked (state any sampling).
- Contrast computed (4.5:1 / 3:1); targets measured (≥24×24); headings/semantics checked.
- For tokens: hardcoded values, off-grid spacing, orphans, duplicates.
- Output: severity-ranked report (Issue / Impact / Fix / Confidence). Offer only safe-set auto-fixes, with opt-in.
