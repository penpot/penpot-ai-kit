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
| `design-quality-report.schema.json` | `penpot-build-screen` (scored critique, `shared/design-quality.md` §8) | `brief-to-screen` (`generate.designQuality.belowThreshold`) |
| `deck-quality-report.schema.json` | `penpot-build-deck` (structural gate + scored critique, `references/07-critique-framework.md`) | `brief-to-deck` (`generate.deckQuality.belowThreshold`, `generate.deckQuality.structuralGate.pass`) |
| `slop-report.schema.json` | `penpot-anti-slop` diagnose (`shared/anti-slop.md` §3) | `brief-to-screen` / `brief-to-deck` `slop` step, only in strict mode (`slop.score`, `slop.pass`) |

## Derived fields used by pipeline branch conditions

- `highOrMedium` (accessibility report) = `count of findings where severity ∈ {High, Medium}`.
- `drift` (drift report) = `summary.drift + summary.designOnly + summary.codeOnly` (everything
  that is not a `match`).
- `belowThreshold` (design-quality and deck-quality reports) = `count of axes with score < 3`.
- `score` / `pass` (slop report) = the slop score from `scripts/slopScore.js` (0–100, lower is better) and `score <= 35`.
- `structuralGate.pass` (deck-quality report) = the `auditDeckQuality.js` verdict (dims, ≥ 1 visual
  per slide, type floor, safe area, flow wired, no consecutive identical archetypes).

These are **computed and included** in the report object by the producing skill so the branch
check is a field read, not a re-count.

## Diffing between iterations

Loop workflows (`brief-to-screen`, `brief-to-deck`, `code-to-penpot-sync`) should diff the current report's
`findings[].id` set against the previous iteration's (kept in the run ledger) and call out: fixed,
still-open, and **newly introduced** findings. A loop that only re-counts can silently trade one
violation for another.
