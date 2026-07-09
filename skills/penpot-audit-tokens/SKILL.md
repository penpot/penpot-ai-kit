---
name: penpot-audit-tokens
description: "Audit a Penpot design for design-system / token GOVERNANCE issues (distinct from accessibility): hardcoded colors where a token exists, off-grid spacing, orphan/unresolved/unused tokens, duplicated values, and detached parts that should be component instances. Produces a severity report and suggests semantic-token swaps. Triggers: 'audit tokens', 'find hardcoded colors', 'token governance', 'check design system consistency', 'find off-grid spacing', 'detect raw values', 'are we using tokens correctly'."
disable-model-invocation: false
version: 0.2.0
audiences: [design-system, design-engineer]
mode-default: suggest
requires:
  - shared/penpot-mcp-tool-reference.md
  - shared/plugin-api-gotchas.md
  - shared/tokens-schema.json
  - shared/modes-and-policies.md
---

# penpot-audit-tokens — design-system governance auditor

## 1. Title + How it works
`penpot-audit-tokens` enforces token governance — a concern **separate from accessibility**. Every
mutation goes through `execute_code`; validate visually with `export_shape`; read structure with
`penpotUtils.shapeStructure` (full tool surface: `shared/penpot-mcp-tool-reference.md`). It collects
every fill/stroke/spacing/radius value, compares
against the active token system (`penpotUtils.tokenOverview()`), and reports hardcoded values, off-grid
spacing, orphan/unresolved tokens, and duplicates — each with a suggested semantic-token swap.

## 2. The One Rule That Matters Most
**Suggest, and only auto-swap exact equalities.** The single safe auto-fix is replacing a raw value
that is **exactly equal** to an existing token's resolved value with that token. Everything else
(near-matches, off-grid rounding, new tokens) is a suggestion for review.

## 3. Penpot MCP Tool Reference
Full surface: `shared/penpot-mcp-tool-reference.md`. Key calls: `execute_code` with
`penpotUtils.analyzeDescendants` (collect values) and `penpotUtils.tokenOverview()` /
`findTokenByName` (the token system to compare against).

## 4. Plugin API Essentials
- Read raw values from `shape.fills`/`shape.strokes` (hex), `shape.borderRadius*`, flex `rowGap`/`columnGap`/`*Padding`, layout margins.
- A shape's applied tokens are in `shape.tokens` (`{ property: tokenName }`). A property with a raw value but no entry there is "hardcoded".
- Token resolved values via `token.resolvedValue`. Use exact token `type` strings from `shared/tokens-schema.json`.
- Comparisons are read-only; the only mutation (exact-equality swap) uses `shape.applyToken` — **#2 in `shared/plugin-api-gotchas.md`**: async, chunked, verify in a later call.
- Verify unfamiliar signatures with `penpot_api_info` before relying on them.

## 5. Token-Aware Brief Contract
- **Context** — scope (page/selection/library), the active token system.
- **Objective** — single: "audit token governance of X".
- **Inputs** — target shapes, the 4px grid, the active token sets.
- **Constraints** — read-only except exact-equality auto-swaps (with explicit opt-in).
- **Acceptance Criteria** — all raw values reported; off-grid spacing listed; orphan/unused tokens found; each finding has a suggested token + confidence.

Act as a **design-system governance engineer**.

## 6. Mandatory Workflow
**Phase 0 — Inspection.** `high_level_overview`; collect usage with `scripts/collectStyleUsage.js` and the token system with `tokenOverview()` (`references/01-inspection.md`).

**Phase 1 — Hardcoded values.** `scripts/detectHardcodedValues.js` (`references/02-hardcoded-value-detection.md`) — raw fills/strokes vs tokens; mark exact-equal vs near-match.

**Phase 2 — Grid & orphans.** `scripts/checkGridAndOrphans.js` (`references/03-orphan-and-grid-checks.md`) — off-grid spacing; unresolved references; unused tokens; duplicates.

**Phase 3 — Report.** `scripts/generateTokenReport.js` (`references/04-report-generation.md`). ✋ Checkpoint: present findings; offer to auto-apply ONLY the exact-equality swaps (Apply-with-review), route the rest (new tokens, rounding) to `penpot-foundations`.

## 7. Critical Rules
1. Governance ≠ accessibility — keep scope to tokens/system consistency.
2. Only exact-equality raw→token swaps are auto-applicable (safe set).
3. Off-grid spacing → suggest nearest 4px token; never silently round.
4. New tokens are proposed, not created here (hand off to `penpot-foundations`).
5. Every finding: severity + impact + suggested token + confidence.
6. No silent scope cuts.

## 8. Domain Architecture
Findings map to `shared/tokens-schema.json` governanceRules: `noHardcodedColor`, `noOffGridSpacing`,
`noOrphanTokens`, `preferSemantic`. Report schema:
```
{ severity, rule, element, property, current, suggestedToken, exactMatch:bool, confidence }
```

The final report must ALSO be emitted as a JSON object per `shared/report-schemas/token-governance-report.schema.json` (findings carry `exactMatch` — only exact-equality swaps are safe-set) and mirrored to the run ledger.

## 9. Modes & Policies
Default **suggest**. The only auto-fix (per `shared/modes-and-policies.md` safe set) is the exact-equality
swap, and only with explicit opt-in at the checkpoint. Geometry, new tokens, detach: never auto.

## 10. State Management
Ledger under `RUN_ID`: `phase`, `findings:[...]`, `autoSwapped:[...]`, `sampled`.

## 11. User Checkpoints
| After phase | Artifacts | Ask |
|-------------|-----------|-----|
| 3 Report | governance report | Auto-apply exact swaps? Route the rest to foundations? |

## 12. Naming Conventions
`shared/naming-conventions.md` + `shared/tokens-schema.json` (dot-notation, real type strings).

## 13. Anti-Rationalization Table
| Excuse | Why it's wrong | Countermeasure (halt) |
|--------|----------------|------------------------|
| "This raw hex is basically the token." | "Basically" ≠ exact; silent swaps corrupt intent. | Auto-swap ONLY on exact equality; otherwise suggest with confidence. |
| "I'll just create the missing token and swap." | New tokens are a foundations decision. | Propose the token; route creation to `penpot-foundations`. |
| "Round 18px to 16px automatically." | Off-grid rounding can shift layout. | Suggest the nearest 4px token; require review. |
| "Skip orphan/unused token check." | Orphans are silent debt. | Run the full grid/orphan pass. |
| "It's a small file, eyeball it." | Misses systematic raw usage. | Walk the tree programmatically; report counts. |

## 14. Helper Code Snippets
```js
// Is a property hardcoded? (raw value present, no token bound)
function isHardcoded(shape, prop){
  const hasRaw = prop === 'fill' ? (shape.fills||[]).length>0 : shape[prop] != null;
  const bound = shape.tokens && shape.tokens[prop];
  return hasRaw && !bound;
}
return { ok: true };
```

## 15. Reference Resources
- `shared/tokens-schema.json` (governanceRules), `penpot_api_info('Shape','tokens')`, `penpot_api_info('Token','resolvedValue')`.

## 16. Supporting Files
**references/**: `01-inspection.md`, `02-hardcoded-value-detection.md`, `03-orphan-and-grid-checks.md`, `04-report-generation.md`.
**scripts/**: `collectStyleUsage.js`, `detectHardcodedValues.js`, `checkGridAndOrphans.js`, `generateTokenReport.js`.
