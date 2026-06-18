# Workflow: accessibility-gate

**Pattern:** parallelization & aggregation. **When:** a pre-handoff quality gate — run accessibility
and token-governance audits concurrently, aggregate, then apply only safe fixes with review.

## Steps
1. **Parallel audits** — `penpot-audit-accessibility` and `penpot-audit-tokens` run independently on the same scope.
2. **Aggregate** — merge both reports; de-duplicate overlapping findings (e.g. a low-contrast hardcoded color appears in both); rank by severity.
3. **Fix with review** — present the aggregate. Auto-apply ONLY safe-set fixes (exact-equality token swaps, layer renames) with opt-in; route everything else to the owning skill.

## Inputs
- Scope (page/selection/file), conformance level (AA default).

## Output
A single aggregated report (a11y + governance) + a list of applied safe fixes + items routed for review.

## Failure modes
- Double-counting overlapping findings → de-duplicate at aggregation.
- Auto-applying non-safe fixes → never; only the safe set, only with opt-in.
