# 07 — Error recovery

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `addToken` throws on `type` | Wrong type string (e.g. `border-radius`). | Use exact strings from `shared/tokens-schema.json` (`borderRadius`, `fontSizes`, …). |
| Token created but shape unchanged | Token application is async; you read back too soon. | Apply in one `execute_code` call, verify in a later one. |
| Duplicate tokens after re-run | No idempotency check. | Look up by name before `addToken`/`addSet`. |
| `resolvedValue` is empty/undefined | Reference points to a missing token. | Ensure the referenced primitive exists and the set is active. |
| Reference `{...}` not resolving | Wrong path or inactive set. | Match the exact primitive name; activate the set (`set.toggleActive()` if needed — verify with `penpot_api_info`). |
| Theme toggle has no effect | Semantic values not overridden per theme. | Provide per-theme overrides for the semantic tokens (see `04-themes-modes.md`). |
| Lost track mid-run after truncation | No ledger. | Read the `RUN_ID` ledger, re-derive with `tokenOverview()`, continue from `ledger.phase`. |

When in doubt, stop and read the real API with `penpot_api_info` rather than guessing.
