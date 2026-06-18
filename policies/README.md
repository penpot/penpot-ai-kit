# Policies

How operating modes map to skills, and what may change without asking. Background:
`../shared/modes-and-policies.md`.

## Modes
- **Suggest** — propose only; no canvas mutation.
- **Apply-with-review** — make the change, then checkpoint (show `export_shape` + summary) for approval.
- **Auto-fix** — apply without asking; permitted **only** for the enumerated safe set.

**Global default: Suggest → Apply-with-review.** Auto-fix is opt-in per change type, never per skill.

## Files
- `modes.json` — per-skill default mode + the global `safeSet` and `neverAutofix` lists.
- `approval-checkpoints.md` — the shared checkpoint matrix and the "looks good ≠ future approval" rule.

## Per-skill defaults (summary)
| Skill | Default |
|-------|---------|
| penpot-router | suggest |
| penpot-foundations | review |
| penpot-component-factory | review |
| penpot-build-screen | review |
| penpot-build-from-code | review |
| penpot-audit-accessibility | suggest |
| penpot-audit-tokens | suggest |
| penpot-design-to-code-review | suggest |
| penpot-migrate | review |
| penpot-rename-layers | autofix (safe-set only) |
