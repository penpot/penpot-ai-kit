# Workflows

A **workflow** is end-to-end orchestration — "when, with what data, what next, when to approve". It
*composes* skills; it is not itself a skill. Each workflow ships two files:

- **`README.md`** — prose the agent reasons over: when to run it, inputs, the skills it chains, the
  orchestration pattern, approval gates, failure modes, expected output.
- **`pipeline.json`** — a machine-readable step list: ordered steps referencing skill ids, each with
  `inputs`, a `checkpoint` flag, `next`, and `on_fail`, plus loop/exit conditions where relevant.

Prose carries nuance; JSON carries the deterministic dispatch. Approval gates follow
`../shared/modes-and-policies.md`.

## Catalog
| Workflow | Pattern | Chains | Primary audience |
|----------|---------|--------|------------------|
| `routing/` | Routing | dispatch only | all |
| `design-system-bootstrap/` | Sequential | foundations → component-factory → audit-tokens → rename-layers | DS teams |
| `brief-to-screen/` | Evaluator-Optimizer | build-screen ↔ audit-accessibility | product designers |
| `code-to-penpot-sync/` | Reconcile loop | build-from-code → design-to-code-review | design engineers |
| `figma-migration/` | Pipeline | migrate → foundations → audits | migrating teams |
| `accessibility-gate/` | Parallelization | audit-accessibility ∥ audit-tokens → aggregate → fix-with-review | all |

Skill ids referenced: `penpot-router`, `penpot-foundations`, `penpot-component-factory`,
`penpot-build-screen`, `penpot-build-from-code`, `penpot-audit-accessibility`, `penpot-audit-tokens`,
`penpot-design-to-code-review`, `penpot-migrate`, `penpot-rename-layers`.
