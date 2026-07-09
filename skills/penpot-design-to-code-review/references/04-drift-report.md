# 04 — The DRIFT report: normalize, diff, classify, render

> Loaded during **Phase 4**. Goal: turn the extracted design data (`01`) and the mapping (`02`/`03`) into a structured, severity-classified report with a concrete reconciliation per finding.

## 1. Normalize both sides first (non-negotiable)

Never diff raw CSS strings. Reduce each side to a canonical map keyed by `(node, property)`:

| Property kind | Canonical form |
|---------------|----------------|
| color | lowercase 6-digit hex + separate `alpha` (0–1); `#FFF`→`#ffffff`, `rgb(0,102,255)`→`#0066ff` |
| length (size/spacing/radius) | integer px; `1rem`→`16px` (record root assumption); `0.5em` resolved against context |
| font-weight | numeric; `bold`→`700`, `normal`→`400` |
| font-family | first family, lowercased, quotes stripped |
| shorthand | expanded to longhand (`padding: 8px 16px` → top/right/bottom/left) |
| token reference | the dot-notation token name |

Diffing the canonical maps eliminates the entire class of false "drift" from unit/format differences.

## 2. The diff algorithm

For each mapped `(designNode, codeElement)` pair and each property:

```
status =
  designValue == null && codeValue != null  -> "code-only"
  designValue != null && codeValue == null  -> "design-only"
  normalize(designValue) == normalize(codeValue) -> "match"
  else -> "drift"
```

Then refine with token awareness:
- If both reference tokens → compare **token names** (a name mismatch is `drift` even if resolved values coincide today — they'll diverge under theming).
- If design has a bound token but code uses a matching literal → `match` *value-wise* but emit a separate `Minor` "code not using variable" finding.
- If design has a hardcoded value (no token) → always add a `Minor` "value not tokenized" finding regardless of match (see `01 §3`).

Compute `delta`:
- color: per-channel hex delta + the resulting WCAG contrast ratio against the mapped background (use the W3C relative-luminance formula; AA thresholds 4.5:1 normal / 3:1 large from `penpot-audit-accessibility`).
- spacing/radius/size: `codePx - designPx`, and `grid4px = designPx % 4 === 0`.
- typography: list the mismatched sub-properties.

## 3. Severity classification

| Severity | Trigger |
|----------|---------|
| **Critical** | A state exists on one side only for an interactive element (especially `Focus` → WCAG 2.4.7/2.4.11); a color drift drops contrast below WCAG 1.4.3 AA (4.5:1 normal / 3:1 large). |
| **Major** | Wrong semantic token bound vs code var; spacing delta ≥ 8px; font size/weight/family mismatch; a structural element present in design but missing in code (icon, label, divider) or vice versa. |
| **Minor** | Value not tokenized though it matches; ≤ 4px spacing delta; off-grid value (`grid4px:false`) even if code agrees; ordering/naming differences; decorative-only drift. |

Escalate a `Major` color drift to `Critical` whenever it crosses the contrast threshold — always cite the WCAG criterion and the before/after ratio.

## 4. Reconciliation phrasing

Every non-`match` finding carries a one-line, concrete reconciliation that names **which side changes**, per the authority table (`02 §4`):
- design-authoritative dimension, code wrong → *"Bind `--color-action-primary-bg` to design token `color.action.primary.bg` (#0066ff); code currently hardcodes #1a73e8 (contrast 3.9:1 < 4.5:1, fails WCAG 1.4.3)."*
- design hygiene (hardcoded in design) → *"Tokenize the design fill #0066ff to `color.action.primary.bg` (hand off to penpot-foundations)."*
- off-grid spacing → *"Round 18px to the nearest grid token `spacing.4` (16px) or `spacing.5` (20px); update both sides."*
- design-only state → *"Code is missing the `:focus-visible` style present in `State=Focus`; add it (Critical, WCAG 2.4.7)."*

Reconciliations are **proposals** — this skill does not mutate. Edits hand off to `penpot-foundations` (token work) / `penpot-build-from-code` (structural rebuilds) under their checkpoints.

## 5. Report schema (what `generateDriftReport.js` returns)

```
{
  runId, scope, codeSource: "file"|"storybook"|"none",
  authoritative: { visual:"design", behavior:"code" },
  rootPxAssumption: 16,
  summary: { match, drift, codeOnly, designOnly, critical, major, minor },
  findings: [ {
    id, dimension, designNode, codeElement,
    designValue, codeValue, token, status,
    delta, grid4px, wcag, severity, reconciliation
  } ],
  stateMatrix: { rows:[...], cells:[ { state, design:bool, code:bool } ] },
  notes: [ "..." ]   // degradation, low-confidence mappings, capped scope
}
```

## 6. Rendered Markdown (what the user sees)

```markdown
# Design ↔ Code Drift Report
**Scope:** Button (selection: btn/label/icon)   **Code source:** src/Button.tsx
**Authoritative:** visual→design, behavior→code   **rem base:** 16px

## Summary
| status | count |   | severity | count |
|--------|-------|---|----------|-------|
| match | 11 |   | Critical | 1 |
| drift | 3  |   | Major    | 2 |
| design-only | 1 |  | Minor | 2 |
| code-only | 0 |

## Findings
### ❌ Critical — color — btn (fill)
design token `color.action.primary.bg` (#0066ff) vs code #1a73e8
contrast on white drops to 3.9:1 (< 4.5:1, WCAG 1.4.3 AA)
→ Update `--color-action-primary-bg` to #0066ff (bind to the token).

### ⚠️ Major — spacing — btn (padding-x)
design `spacing.inset.md` = 16px vs code 12px (Δ −4px, on-grid)
→ Set code horizontal padding to 16px / `--spacing-inset-md`.

### 💡 Minor — color — label (fill, not tokenized)
design fill #111827 has no bound token though it matches code.
→ Tokenize to `color.text.default` (hand off to penpot-foundations).

## State coverage
| state | design | code |
|-------|--------|------|
| Default | ✅ | ✅ |
| Hover   | ✅ | ✅ |
| Focus   | ✅ | ❌ |  ← Critical (WCAG 2.4.7)
| Disabled| ✅ | ✅ |

## Notes
- Layers `Rectangle 12`/`Group 4` reduced structure-mapping confidence; recommend penpot-rename-layers.
- Code source rendered from static CSS (no browser MCP); cascade not fully resolved.
```

## 7. Discipline
- Report capped/sampled scope explicitly in `notes` — no silent truncation.
- Never assert "no drift" off a single un-normalized comparison or an empty `generateStyle` (re-extract first; `01 §7`).
- Keep `execute_code` returns small and structured; render the Markdown in Claude's context, not inside `execute_code`.
