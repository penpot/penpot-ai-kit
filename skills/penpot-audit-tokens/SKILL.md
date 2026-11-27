---
name: penpot-audit-tokens
description: "Audit a Penpot design for design-system / token GOVERNANCE issues (distinct from accessibility): hardcoded colors where a token exists, off-grid spacing, orphan/unresolved/unused tokens, duplicated values, and detached parts that should be component instances. Produces a severity report and suggests semantic-token swaps. Triggers: 'audit tokens', 'find hardcoded colors', 'token governance', 'check design system consistency', 'find off-grid spacing', 'detect raw values', 'are we using tokens correctly'."
disable-model-invocation: false
version: 0.3.0
audiences: [design-system, design-engineer]
mode-default: suggest
requires:
  - shared/penpot-mcp-tool-reference.md
  - shared/plugin-api-gotchas.md
  - shared/tokens-schema.json
  - shared/modes-and-policies.md
---

# penpot-audit-tokens — design-system governance auditor

Audit how well a design uses its token system, as a **design-system governance engineer**: hardcoded
colors where a token exists, off-grid spacing, orphan / unresolved / unused tokens, duplicated values,
and detached parts that should be component instances. This is a separate concern from accessibility
(`penpot-audit-accessibility`).

**The one rule: suggest, and auto-swap only exact equalities.** The single change this skill may apply
is replacing a raw value that is *exactly equal* to an existing token's resolved value with that
token — and only after the user opts in at the checkpoint. Near matches, off-grid rounding and new
tokens are suggestions for review.

Tool surface: `shared/penpot-mcp-tool-reference.md`. API traps: `shared/plugin-api-gotchas.md`.

## Brief contract
- **Context** — scope (page / selection / library) and the active token system.
- **Objective** — "audit token governance of X".
- **Inputs** — target shapes, the 4px grid, the active token sets (and the token source, if the file
  takes its tokens from a connected library — `penpot.library.tokensSource`).
- **Constraints** — read-only except opted-in exact-equality swaps.
- **Acceptance Criteria** — every raw value reported; off-grid spacing listed; orphan and unused
  tokens found; each finding has a suggested token and a confidence.

## Workflow
**Phase 0 — Inspection.** `high_level_overview`, then `scripts/collectStyleUsage.js` plus
`penpotUtils.tokenOverview()` (`references/01-inspection.md`). A property is *hardcoded* when it has a
raw value and no entry in `shape.tokens` (`{ property: tokenName }`).

**Phase 1 — Hardcoded values.** `scripts/detectHardcodedValues.js`
(`references/02-hardcoded-value-detection.md`): raw fills, strokes, radii and spacing against token
resolved values, each classified exact / near / none.

**Phase 2 — Grid and orphans.** `scripts/checkGridAndOrphans.js`
(`references/03-orphan-and-grid-checks.md`): off-grid spacing, unresolved references, unused tokens,
duplicates.

**Phase 3 — Report.** `scripts/generateTokenReport.js` (`references/04-report-generation.md`).
✋ Present the findings; offer to apply ONLY the exact-equality swaps, and route the rest (new tokens,
rounding) to `penpot-foundations`.

**Applying the opted-in swaps (#2).** In chunks of about 25–40 shapes per call. Guard every apply —
`if (shape.tokens[prop] !== tok.name) shape.applyToken(tok, [prop])` — because re-applying a bound
token removes the binding. Verify `shape.tokens` in the *next* call and retry only what is still
unbound. Never write a literal to a bound property: that drops the binding too.

## Rules
1. **Exact means exact.** Colors compare case-insensitively (Penpot returns lowercase hex) and nothing
   else is fuzzy: "basically the token" is a near match, reported with its confidence, never swapped.
2. **Off-grid spacing is suggested, never rounded.** Moving 18 → 16 can shift a layout; propose the
   nearest 4px token and leave the decision to review.
3. **New tokens are proposed, not created here** — creation is a `penpot-foundations` decision.
4. **Walk the tree programmatically** and report counts, even for a small file: eyeballing misses
   systematic raw usage. Run the orphan / unused pass every time; orphans are silent debt.
5. **Every finding:** severity, rule, element, property, current value, suggested token, `exactMatch`,
   confidence.
6. **No silent scope cuts.** If you sampled or capped, the report says so.

## Report and state
Findings map to the `governanceRules` in `shared/tokens-schema.json`: `noHardcodedColor`,
`noOffGridSpacing`, `noOrphanTokens`, `preferSemantic`. Per finding:
`{ severity, rule, element, property, current, suggestedToken, exactMatch, confidence }`. Emit the
report ALSO as JSON per `shared/report-schemas/token-governance-report.schema.json` and mirror it to
the run ledger (`RUN_ID`: `phase`, `findings`, `autoSwapped`, `sampled`).

Mode: **suggest** (`shared/modes-and-policies.md`). The exact-equality swap is the only safe-set item;
geometry, new tokens and `detach()` are never automatic.

## Supporting files
- **references/** — `01-inspection.md`, `02-hardcoded-value-detection.md`,
  `03-orphan-and-grid-checks.md`, `04-report-generation.md`.
- **scripts/** (paste into `execute_code`, all read-only) — `collectStyleUsage.js`,
  `detectHardcodedValues.js`, `checkGridAndOrphans.js`, `generateTokenReport.js`.

**Doctrine paths.** `shared/…` and `policies/…` resolve inside this bundle in native installs (vendored by the installer); in a Claude Code plugin install they live at the plugin root — `${CLAUDE_PLUGIN_ROOT}/shared/…`, two directories up from this file.
