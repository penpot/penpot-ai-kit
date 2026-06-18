# Workflow: design-system-bootstrap

**Pattern:** sequential, checkpoint-gated. **When:** a DS team is standing up (or substantially
extending) a design system in Penpot from scratch.

## Chain
1. `penpot-foundations` — primitives → semantic tokens → (themes). ✋ approve tokens.
2. `penpot-component-factory` — build core components with full variant matrices, bound to the tokens. ✋ approve components.
3. `penpot-audit-tokens` — governance pass: confirm no hardcoded values crept in; consolidate duplicates. ✋ approve.
4. `penpot-rename-layers` — semantic naming pass for handoff readiness.

## Inputs
- Brand palette / type ratio / spacing grid (defaults: Minor Third 1.2, 4px grid).
- The set of core components to build (Button, Input, Card, …).

## Approval gates
After tokens, after components, after the governance audit (see `../../shared/modes-and-policies.md`).

## Output
A token system (primitives/semantic/themes), a set of tokenized components with complete variants, a
clean governance report, semantic layer names. Final structured report of what was created.

## Failure modes
- Trying to build components before tokens exist → always run foundations first.
- One-shotting the whole system → each phase is its own set of small `execute_code` steps.
