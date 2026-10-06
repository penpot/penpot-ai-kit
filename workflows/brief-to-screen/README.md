# Workflow: brief-to-screen

**Pattern:** Evaluator-Optimizer. **When:** a product designer wants a brief turned into a polished,
accessible screen. A **Generator** builds; two **Evaluators** gate the exit — accessibility (AA)
and design quality (plus a third, anti-slop, when the user opts in) — so a screen can't ship merely compliant-but-bland, nor pretty-but-inaccessible.

## Loop
1. **Generator** — `penpot-build-screen` builds/iterates the screen section by section, running the
   **visual self-review** (`shared/visual-self-review.md`) on each section's export *before* its
   checkpoint (the agent looks at its own render and fixes visible defects, max 2 iterations).
   Its assemble phase ends with the **scored critique** (`shared/design-quality.md` §8): the final
   export scored 1–5 on seven axes, emitted as a structured report
   (`shared/report-schemas/design-quality-report.schema.json`). ✋ approve direction (first pass).
2. **Evaluator (a11y)** — `penpot-audit-accessibility` audits the result (contrast, targets,
   hierarchy) and emits the structured report (`shared/report-schemas/accessibility-report.schema.json`).
3. **Evaluator (anti-slop, opt-in)** — only when the user opted in at Phase 0
   (`prefs.antiSlop == "on"`, `shared/anti-slop.md` §0): `penpot-anti-slop` diagnose scores the
   screen 0–100 (tree probes + describe-then-judge review) per
   `shared/report-schemas/slop-report.schema.json`. Gate: `slop.score <= 35`.
4. If `evaluate.highOrMedium > 0` **or** `generate.designQuality.belowThreshold > 0` **or** (strict
   mode on and `slop.score > 35`), feed the findings sets (a11y findings, weak axes, `slop.topFixes`)
   back to the Generator to fix; repeat. Diff `findings[].id` (both reports) against
   the previous iteration — call out fixed, still-open, and newly introduced.
5. **Exit** when every active gate passes (or max iterations reached). ✋ final approval.

## Inputs
- The brief (use `prompts/design-brief.md`), the active design system, target viewport.

## Exit conditions
- AA pass (no High/Medium a11y issues) **and** design-quality pass (no axis scoring < 3) **and**,
  with strict anti-slop mode on, slop score ≤ 35 — or
  `maxIterations` reached → present remaining issues and weak axes for a decision.

## Output
An on-system screen + a clean (or explained) accessibility report + the design-quality report
(profile, skeleton, seven axis scores, findings) + the slop report when strict mode is on.

## Failure modes
- Infinite loop on an unfixable constraint → cap iterations, surface the blocker.
- Generator hardcoding to "pass" the evaluator → governance still applies (run `penpot-audit-tokens` if needed).
- Generator inflating its own design scores → every score must cite evidence visible in the export
  (`shared/design-quality.md` §8: "a 3 without evidence of competence is a 2"); the user sees the
  same export at the checkpoint and can contest the scores.
