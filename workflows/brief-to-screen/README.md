# Workflow: brief-to-screen

**Pattern:** Evaluator-Optimizer. **When:** a product designer wants a brief turned into a polished,
accessible screen. A **Generator** builds; an **Evaluator** audits; they loop until AA passes.

## Loop
1. **Generator** — `penpot-build-screen` builds/iterates the screen section by section. ✋ approve direction (first pass).
2. **Evaluator** — `penpot-audit-accessibility` audits the result (contrast, targets, hierarchy).
3. If the Evaluator reports High/Medium issues, feed them back to the Generator to fix; repeat.
4. **Exit** when the Evaluator reports no High/Medium issues (or max iterations reached). ✋ final approval.

## Inputs
- The brief (use `prompts/design-brief.md`), the active design system, target viewport.

## Exit conditions
- AA pass (no High/Medium a11y issues), or `maxIterations` reached → present remaining issues for a decision.

## Output
An on-system screen + a clean (or explained) accessibility report.

## Failure modes
- Infinite loop on an unfixable constraint → cap iterations, surface the blocker.
- Generator hardcoding to "pass" the evaluator → governance still applies (run `penpot-audit-tokens` if needed).
