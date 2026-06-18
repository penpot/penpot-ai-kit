# 03 — Orphan & grid checks

## Off-grid spacing (noOffGridSpacing)
For every spacing/padding/gap/radius raw value, check `value % 4 === 0`. Flag off-grid values and
suggest the nearest 4px-grid token (e.g. 18 → `spacing.4` (16) or the next step). Never auto-round.

## Orphan / unresolved tokens (noOrphanTokens)
- **Unresolved reference** — a token whose `value` is `{ref}` but `ref` doesn't exist (empty/invalid `resolvedValue`).
- **Unused token** — defined but applied to no shape (cross-reference token names against all `shape.tokens` values).
- **Duplicate values** — multiple tokens of the same type resolving to the same value (consolidation candidate).

## Detached parts (preferSemantic, optional)
Raw shapes that replicate a component visually but aren't instances → suggest converting to instances
(route to `penpot-component-factory`).

## Output
Each finding carries severity, the rule key, the element/token, and a concrete suggestion.
