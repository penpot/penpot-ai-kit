# Workflow: brief-to-screen

**Pattern:** Evaluator-Optimizer. **When:** a product designer wants a brief turned into a polished,
accessible screen. A **Generator** builds; an **Evaluator** audits; they loop until AA passes.

## Loop
1. **Generator** — `penpot-build-screen` builds/iterates the screen section by section, running the
   **visual self-review** (`shared/visual-self-review.md`) on each section's export *before* its
   checkpoint (the agent looks at its own render and fixes visible defects, max 2 iterations).
   ✋ approve direction (first pass).
2. **Evaluator** — `penpot-audit-accessibility` audits the result (contrast, targets, hierarchy) and
   emits the structured report (`shared/report-schemas/accessibility-report.schema.json`).
3. If the report's `highOrMedium > 0`, feed `findings` back to the Generator to fix; repeat. Diff
   `findings[].id` against the previous iteration — call out fixed, still-open, and newly introduced.
4. **Exit** when `highOrMedium == 0` (or max iterations reached). ✋ final approval.

## Inputs
- The brief (use `prompts/design-brief.md`), the active design system, target viewport.

## Exit conditions
- AA pass (no High/Medium a11y issues), or `maxIterations` reached → present remaining issues for a decision.

## Output
An on-system screen + a clean (or explained) accessibility report.

## Failure modes
- Infinite loop on an unfixable constraint → cap iterations, surface the blocker.
- Generator hardcoding to "pass" the evaluator → governance still applies (run `penpot-audit-tokens` if needed).
