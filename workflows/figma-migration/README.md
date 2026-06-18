# Workflow: figma-migration

**Pattern:** pipeline. **When:** a team migrates a Figma file/library into Penpot and wants tokens and
accessibility reconciled afterward.

## Chain
1. `penpot-migrate` — analyze Figma → build IR → migrate tokens, components, screens; validate fidelity. ✋ per phase.
2. `penpot-foundations` — reconcile migrated tokens (tiers, themes, naming, off-grid cleanup). ✋ approve.
3. `penpot-audit-tokens` + `penpot-audit-accessibility` — governance + AA on the migrated result.
4. Final fidelity + quality report.

## Inputs
- Figma access (Figma MCP) or a pasted Figma export/JSON; mapping rules.

## Output
A migrated, on-system Penpot file + fidelity report + governance/AA reports.

## Failure modes
- Figma MCP absent → `penpot-migrate` degrades to pasted data.
- Skipping reconciliation → migrated tokens may not fit Penpot tiers; always run foundations after.
