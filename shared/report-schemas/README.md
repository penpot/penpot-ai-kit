# Report schemas — structured outputs the workflows can actually branch on

The audit/review skills end with a structured report. Free prose is fine for the human, but the
workflow `branch` conditions (`"evaluate.highOrMedium == 0"`, `"review.drift == 0"`) need fields
with defined meanings — otherwise the loop's exit condition is vibes. These schemas define that
contract. Each producing skill emits **both**: the rendered Markdown for the user *and* a JSON
object matching its schema (returned from the final `execute_code` assembly step, and mirrored to
the run ledger per `shared/state-management.md`).

| Schema | Produced by | Consumed by |
|--------|-------------|-------------|
| `accessibility-report.schema.json` | `penpot-audit-accessibility` | `brief-to-screen` (`evaluate.highOrMedium`), `accessibility-gate` |
| `token-governance-report.schema.json` | `penpot-audit-tokens` | `design-system-bootstrap`, `figma-migration`, `accessibility-gate` |
| `drift-report.schema.json` | `penpot-design-to-code-review` | `code-to-penpot-sync` (`review.drift`) |

## Derived fields used by pipeline branch conditions

- `highOrMedium` (accessibility report) = `count of findings where severity ∈ {High, Medium}`.
- `drift` (drift report) = `summary.drift + summary.designOnly + summary.codeOnly` (everything
  that is not a `match`).

These are **computed and included** in the report object by the producing skill so the branch
check is a field read, not a re-count.

## Diffing between iterations

Loop workflows (`brief-to-screen`, `code-to-penpot-sync`) should diff the current report's
`findings[].id` set against the previous iteration's (kept in the run ledger) and call out: fixed,
still-open, and **newly introduced** findings. A loop that only re-counts can silently trade one
violation for another.
