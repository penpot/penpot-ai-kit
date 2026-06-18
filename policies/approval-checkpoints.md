# Approval checkpoints

Shared checkpoint rules across all skills/workflows.

## The core rule
**"Looks good" approves only the phase just shown — never a future phase.** Always name the next phase
explicitly before proceeding.

## At every checkpoint, show
1. **Evidence** — an `export_shape` (`'selection'` or `'page'`) of what changed, and/or a structured
   read (`shapeStructure` / `tokenOverview`).
2. **Summary** — what was created/changed, tokens used, anything proposed, assumptions.
3. **The ask** — a specific question ("Approve these tokens? Next I'll build components.").

## Checkpoint matrix (typical)
| Skill | Hard checkpoints (require approval) |
|-------|--------------------------------------|
| penpot-foundations | after primitives, after semantic, after themes, before applying to shapes |
| penpot-component-factory | after axis matrix, after base, after variants, before combining |
| penpot-build-screen | after direction, after frame, after each section, after assemble |
| penpot-build-from-code | after discovery, after each section |
| penpot-migrate | after scope/mapping, after IR, after tokens, after components, per screen |
| penpot-audit-* | after the report (before any fix) |
| penpot-rename-layers | none for safe-set renames; review for meaningful names |

## Destructive / irreversible actions
Always require explicit approval, regardless of mode: `detach()`, deleting/renaming shared assets,
deleting shapes, restructuring variants. Record the rationale in the run report.
