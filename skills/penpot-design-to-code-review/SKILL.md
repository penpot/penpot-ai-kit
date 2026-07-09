---
name: penpot-design-to-code-review
description: "Review a Penpot design against its implemented code (a source component or Storybook story) and emit a structured DRIFT report. Use when an engineer needs to confirm the build matches the design: extract HTML/CSS from a selection, map its tokens/structure/states to the code component, diff them, and list what each side is missing with severity and a reconciliation. Degrades gracefully to a design-system-token check when no code source is supplied. Triggers: 'design to code review', 'does my code match the design', 'design code parity', 'compare Penpot to my component', 'check this against Storybook', 'extract HTML/CSS from this selection', 'find design drift', 'design implementation diff'."
disable-model-invocation: false
version: 0.2.0
audiences: [design-engineer]
mode-default: suggest
requires:
  - shared/penpot-mcp-tool-reference.md
  - shared/plugin-api-gotchas.md
  - shared/tokens-schema.json
  - shared/naming-conventions.md
  - shared/state-management.md
  - shared/modes-and-policies.md
---

# penpot-design-to-code-review — Close the design↔code bridge in the READ direction

## 1. Title + How it works
This skill reads a Penpot selection and compares it to the engineer's implemented code, then reports the drift. Every mutation goes through `execute_code`; validate visually with `export_shape`; read structure with `penpotUtils.shapeStructure` (full tool surface: `shared/penpot-mcp-tool-reference.md`). It reads tokens with `penpotUtils.tokenOverview`, extracts the design's HTML/CSS with `penpot.generateMarkup(shapes, opts)` and `penpot.generateStyle(shapes, opts)` (both invoked **through** `execute_code`), and produces a visual for side-by-side comparison with the separate `export_shape` tool. This skill is **read-only on the canvas** by default (`mode: suggest`) — it never mutates the design; it emits a report and, only on explicit request, proposes reconciliation steps. The code side (a React/Vue/etc. component file, or a rendered Storybook story / its DOM+CSS) is **supplied by the user or by another MCP** (filesystem, Storybook, a browser tool). If no code source is available, the skill degrades gracefully and compares the selection against the design-system tokens instead.

---

## 2. The One Rule That Matters Most

**Never one-shot a review, and never mutate during one.** Extract → normalize → map → diff → report, one logical `execute_code` call per step, with a read or `export_shape` between phases. A drift report that was assembled in a single blast is unverifiable and almost always wrong about token names. This is a `suggest`-mode skill: the canvas is not touched. The only thing you produce is a structured DRIFT report; reconciliation edits, if requested, are handed off to a write-capable skill (`penpot-foundations` for token work, `penpot-rename-layers`, or `penpot-build-from-code` for structural rebuilds) under their own checkpoints.

---

## 3. Penpot MCP Tool Reference

Full surface: see `shared/penpot-mcp-tool-reference.md`. The calls this skill leans on:

| Need | Call (inside `execute_code` unless noted) |
|------|-------------------------------------------|
| Resolve the selection | `penpot.selection` (array of shapes) |
| Read the object tree of the selection | `penpotUtils.shapeStructure(shape, maxDepth)` |
| Read active tokens (names → resolved values) | `penpotUtils.tokenOverview()` |
| Find a token referenced by a raw value | `penpotUtils.findTokensByName(name)` / `findTokenByName(name)` |
| Generate the design's HTML | `penpot.generateMarkup(shapes, opts)` |
| Generate the design's CSS | `penpot.generateStyle(shapes, opts)` |
| Inspect a shape's bound tokens | `shape.tokens` (map of property → token) |
| Inspect raw style values | `shape.fills`, `shape.strokes`, `shape.shadows`, `shape.borderRadius`, geometry via `shape.width`/`height`/`bounds` |
| Produce a comparison image | `export_shape` (**separate MCP tool**, not JS) — one call per state board |

Verify any unfamiliar signature with `penpot_api_info` (e.g. `penpot_api_info("Page", "generateMarkup")`, `penpot_api_info("Shape", "tokens")`) before relying on it.

---

## 4. Plugin API Essentials

Gotcha numbers refer to `shared/plugin-api-gotchas.md`. What bites **this** skill:

- **`generateMarkup` / `generateStyle` take an array of shapes**, not a single shape, and accept an `opts` object. Confirm the exact `opts` keys with `penpot_api_info("Penpot", "generateMarkup")` / `("Penpot", "generateStyle")` before passing options — guessing option names silently produces default output and you will wrongly conclude "no drift". Pass `penpot.selection` (already an array) directly.
- **#1 Style arrays are immutable item-by-item** — fine for reading (`shape.fills[0].fillColor`); never attempt to "fix" a fill here — this skill does not mutate.
- **#5 `width`/`height`/`parentX`/`parentY` are read-only** — read geometry for the diff; no `resize()`/`setParentXY()` here.
- **#2 Token application is async (~100 ms)** — irrelevant to reading, but if a reconciliation hand-off applies a token, do not read it back in the same call (don't assert false failures).
- **`shape.tokens`** is the authoritative map of which design tokens are bound to which properties. Prefer it over guessing tokens from raw hex. A raw value with **no** bound token is itself a drift finding ("design uses a hardcoded value, not a token").
- **`generateStyle` emits the design's notion of CSS** — it does not know your code's class names or variables. Treat its output as the design's *intent*, then normalize both sides (see `references/04`) before diffing. Do not string-compare raw CSS.
- **Verify, don't guess.** When `generateMarkup`/`generateStyle` return something unexpected, the first hypothesis is a wrong `opts` key or a non-array argument — re-check with `penpot_api_info`, not a retry with a different guess.

---

## 5. Token-Aware Brief Contract

Before extracting anything, restate the request as a contract. **Act as a senior design-engineer who treats the design file as the spec of record and never accepts a hardcoded value where a token exists.**

- **Context** — what is being reviewed (a single component, a state set, a screen region) and for whom (which app/library, which framework the code is in).
- **Objective** — single and specific: *"Confirm `<Button variant=primary size=md>` in `src/Button.tsx` matches the Penpot selection, including hover/disabled states."* Not "review the design."
- **Inputs** —
  - the Penpot **selection** (resolve it; if empty, ask the user to select or name the board);
  - the **code source**: a file path / pasted component code, OR a Storybook story (URL or rendered DOM+CSS), OR explicitly *none*;
  - the **token set** in play (`tokenOverview()`), and which tier semantic tokens should resolve to.
- **Constraints** — which side is authoritative for which dimension (usually: design authoritative for visual tokens, spacing, states; code authoritative for behavior/a11y semantics); tokens-only on the 4px grid; forbidden to mutate the canvas in this skill.
- **Acceptance Criteria (quantitative)** —
  - every design property is classified as `match` / `drift` / `code-only` / `design-only`;
  - every color/spacing/radius/type drift names the **token** involved (or flags "no token bound");
  - color drifts report a hex-level delta and, where relevant, the WCAG contrast impact;
  - spacing drifts report the px delta and whether the value is on the 4px grid;
  - state coverage is reported as a matrix (design states × code states) with explicit gaps;
  - severity assigned to every finding (Critical / Major / Minor) per the rubric in §8.

---

## 6. Mandatory Workflow

### Phase 0 — Discovery (read-only)
- **Goal:** know what you're reviewing and what tokens exist before reading any style.
- **Steps:**
  1. `high_level_overview` (once per session).
  2. `execute_code`: resolve `penpot.selection`; if empty, stop and ask the user to select the component/board. Return ids, names, types, count.
  3. `execute_code`: `penpotUtils.shapeStructure(sel[0], 4)` for each top-level selected shape — capture the tree (names, types, nesting).
  4. `execute_code`: `penpotUtils.tokenOverview()` — capture token sets, names, resolved values.
  5. Confirm the **code source** with the user (file path / pasted code / Storybook / none).
- **Exit criterion:** you can name the design's structure, its tokens, and the code source (or confirmed absence).
- ✋ **Checkpoint:** show the structure summary + token inventory + the code source you'll diff against. Ask the user to confirm scope and which side is authoritative for which dimension.

### Phase 1 — Extract markup & style from the design
- **Goal:** turn the selection into normalized HTML + CSS + a token map.
- **Steps:** use `scripts/extractMarkupStyle.js` — one `execute_code` call that runs `penpot.generateMarkup(sel, opts)`, `penpot.generateStyle(sel, opts)`, walks `shape.tokens` for each node, and returns `{ markup, style, perNode:[{id,name,type,tokens,rawFills,rawSpacing,radius,typography}] }`.
- **Exit criterion:** you have the design's HTML, CSS, and a per-node token/raw-value map.
- ✋ **Checkpoint:** show the extracted markup + style (trimmed) and the token map. Confirm before mapping.

### Phase 2 — Capture a comparison image
- **Goal:** a visual the engineer can eyeball against the rendered code.
- **Steps:** run `scripts/exportForCompare.js` to gather the shape id, bounds, and metadata; then call the **`export_shape`** MCP tool with `'selection'` (or the captured id), `format: png`. For multi-state components, export each state board separately. Ask the engineer for a screenshot of the rendered code/story (or capture it via a browser MCP if available).
- **Exit criterion:** design image(s) in hand, paired with the code render(s).
- ✋ **Checkpoint:** present side-by-side; let the engineer flag obvious visual deltas to prioritize.

### Phase 3 — Map design ↔ source
- **Goal:** establish the correspondence between design nodes/tokens/states and code elements/variables/props. See `references/02`.
- **Steps:** parse the supplied code (props, CSS/var usage, state classes/variants); build a mapping table `designNode → codeElement`, `designToken → codeVar`, `designState → codeState`. If the code is a Storybook story, derive states from the story's args/controls (see `references/03`). **If no code source:** map design tokens to the design-system token set only and skip the code column (graceful degradation).
- **Exit criterion:** a mapping table with every design property associated to a code counterpart or marked unmapped.
- ✋ **Checkpoint:** show the mapping table; correct mis-maps before diffing.

### Phase 4 — Diff & emit DRIFT report
- **Goal:** the deliverable.
- **Steps:** run the comparison logic from `references/04`, assemble with `scripts/generateDriftReport.js` (structured output), classify each finding (`match`/`drift`/`code-only`/`design-only`), assign severity, and suggest a reconciliation for each non-match. Cite the WCAG number for any contrast-impacting color drift.
- **Exit criterion:** a complete report covering tokens, structure, spacing, typography, and states, with severities and reconciliations.
- ✋ **Checkpoint:** present the report. If the user wants fixes applied, hand off to the appropriate write skill — do **not** mutate here.

---

## 7. Critical Rules

1. **Read-only on the canvas.** This skill never calls a mutating method. Reconciliation is a hand-off, gated by the downstream skill's own checkpoints.
2. **Never string-compare raw CSS.** Normalize both sides (units → px, colors → lowercase hex, shorthand expanded, properties sorted) before diffing. See `references/04`.
3. **A hardcoded value with no bound token is a finding**, even if it visually matches the code. Report it as `Minor` design-hygiene drift ("value not tokenized").
4. **Name the token in every visual finding.** Read `shape.tokens` first; only fall back to matching raw hex against `tokenOverview()` when no token is bound.
5. **Spacing deltas state px and grid-alignment.** Any value not a multiple of 4 is flagged regardless of whether code matches it.
6. **Degrade, don't guess.** No code source → compare against design-system tokens and say so in the report header; never fabricate the code side.
7. **One `execute_code` per logical step**, sequential, with a checkpoint between phases. Never batch extraction + mapping + diff.
8. **Confirm `generateMarkup`/`generateStyle` `opts` with `penpot_api_info`** before passing options.
9. **Verify the selection is non-empty** before any extraction; an empty selection silently yields empty markup.
10. **State coverage is a matrix, not a checkbox.** Report every (design state × code state) cell.

---

## 8. Domain Architecture

**The DRIFT report schema** (what `generateDriftReport.js` returns and what you render):

```
{
  runId, scope, codeSource: "file" | "storybook" | "none",
  authoritative: { visual: "design", behavior: "code", ... },
  summary: { match, drift, codeOnly, designOnly, critical, major, minor },
  findings: [
    {
      id,                         // stable, e.g. "drift-color-01"
      dimension: "color" | "spacing" | "typography" | "radius" | "structure" | "state",
      designNode, codeElement,    // either may be null
      designValue, codeValue,     // normalized
      token,                      // bound design token name or null
      status: "match" | "drift" | "design-only" | "code-only",
      delta,                      // px delta, hex delta, contrast delta, etc.
      grid4px,                    // boolean | null (spacing only)
      wcag,                       // criterion string if contrast-impacting, else null
      severity: "Critical" | "Major" | "Minor",
      reconciliation              // concrete, one-line suggested fix + which side to change
    }
  ],
  stateMatrix: { design: [...], code: [...], cells: [{ state, design: bool, code: bool }] }
}
```

This shape is formalized in `shared/report-schemas/drift-report.schema.json`; include the derived top-level `drift` count (= `summary.drift + summary.designOnly + summary.codeOnly`), which the `code-to-penpot-sync` workflow branches on.

**Severity rubric:**

| Severity | Definition |
|----------|-----------|
| **Critical** | Functional/accessibility-affecting parity break: a state exists in design but not code (or vice versa) for an interactive element; a color drift drops contrast below WCAG 1.4.3 AA (4.5:1 / 3:1). |
| **Major** | Visible visual mismatch users will notice: wrong semantic token bound, spacing off by ≥ 8px, type size/weight mismatch, missing structural element (icon, label). |
| **Minor** | Hygiene / sub-perceptual: value not tokenized though it matches, ≤ 4px spacing delta, ordering/naming differences, optional decorative drift. |

**Dimensions diffed:** token usage (which token, bound vs hardcoded), structure (node tree vs DOM tree), spacing (padding/gap/margin on the 4px grid), typography (family/size/weight/line-height/letter-spacing), radius/border, and state coverage.

---

## 9. Modes & Policies

See `shared/modes-and-policies.md`. This skill is **`suggest`** by default and **stays there** — it is an audit. It auto-applies **nothing** to the canvas. There is no safe-set for this skill because it performs no mutations; the "output" is the report. If the user asks to fix drift, the skill explicitly hands off: token swaps → `penpot-foundations` (`apply-with-review`), layer naming → `penpot-rename-layers`, structural/geometry changes → `penpot-build-from-code`. Each reconciliation is presented as a proposal with the source-of-truth side named; nothing is changed without that downstream skill's checkpoint.

---

## 10. State Management

See `shared/state-management.md`. `RUN_ID` slug example: `d2c-2026-06-05-a`. Ledger keys written via `storage` (this skill is read-only on the canvas, so it does **not** write `setSharedPluginData` unless the user opts into persisting the report):

- `storage.run.scope` — resolved selection ids/names.
- `storage.run.tokens` — cached `tokenOverview()` result.
- `storage.run.extracted` — `{ markup, style, perNode }` from Phase 1.
- `storage.run.mapping` — the design↔code mapping table from Phase 3.
- `storage.run.report` — the final DRIFT report object.

**Resume:** re-read `storage.run`; if absent (new session), re-run Phase 0 discovery and re-derive from `shapeStructure` + `tokenOverview` rather than trusting a stale report. Optionally mirror the report to `setSharedPluginData(NS, "${RUN_ID}.driftReport", JSON.stringify(report))` only if the user wants it persisted in-file for handoff.

---

## 11. User Checkpoints

| After phase | Artifacts shown | What we ask |
|-------------|-----------------|-------------|
| 0 Discovery | Structure summary, token inventory, identified code source | "Confirm scope + which side is authoritative for which dimension." |
| 1 Extract | Trimmed markup + style, per-node token map | "Does this match what you expect the design to declare?" |
| 2 Visual | `export_shape` PNG(s) paired with code render(s) | "Flag any obvious visual deltas to prioritize." |
| 3 Mapping | design↔code mapping table | "Correct any mis-mapped node/token/state." |
| 4 Report | Full DRIFT report (summary + findings + state matrix) | "Approve. Want reconciliation handed off to a write skill?" |

---

## 12. Naming Conventions

See `shared/naming-conventions.md`. This skill **reads** names; it relies on them being semantic (`button`, `label`, `icon`, `h1`–`h6`) to map design nodes to DOM elements. Auto-generated names (`Rectangle 12`, `Board`) degrade mapping quality — if the selection is full of them, recommend running `penpot-rename-layers` first and note reduced structural-diff confidence in the report. Tokens are matched against the dot-notation taxonomy in `shared/tokens-schema.json`; token `type` strings are the exact Penpot spellings (`color`, `spacing`, `borderRadius`, `fontSizes`, etc.). Code variables (CSS custom props, JS theme keys) are normalized to that dot-notation before mapping (e.g. `--color-action-primary-bg` ↔ `color.action.primary.bg`).

---

## 13. Anti-Rationalization Table

| Excuse the LLM makes | Why it's wrong | Deterministic countermeasure |
|----------------------|----------------|------------------------------|
| "The CSS strings differ, so it's drift." | `generateStyle` emits `16px`, code emits `1rem`; `#FFF` vs `#ffffff`; shorthand vs longhand. Raw-string diff yields garbage findings. | Normalize both sides first (units→px, colors→lowercase 6-digit hex, expand shorthand, sort props). Diff the normalized maps only. |
| "Hex matches the code, so this property passes." | A matching hex with **no bound token** still breaks theming and governance — it silently won't switch in dark mode. | Read `shape.tokens`. If no token is bound, emit a `Minor` "value not tokenized" finding even when the hex matches. |
| "No Storybook/code was given, so I can't review." | The skill is required to degrade gracefully. | Switch to design-system-token mode: diff the selection against `tokenOverview()`, mark `codeSource: "none"` in the report header, and report only design-side findings. |
| "generateStyle came back nearly empty — design has barely any styling." | Far more likely you passed a single shape instead of the array, or a wrong `opts` key. | Re-check: pass `penpot.selection` (an array); verify `opts` with `penpot_api_info`. Re-extract before concluding "no drift." |
| "I'll just fix the token mismatch in Penpot while I'm here." | This is a `suggest`-mode read-only skill; mutating breaks the contract and skips the downstream checkpoint. | Do not mutate. Emit the reconciliation as a proposal and hand off to `penpot-foundations`/`penpot-build-from-code`. |
| "Spacing is 18px in both, so it matches — pass." | 18 is off the 4px grid; matching code does not make it correct. | Flag any non-multiple-of-4 spacing as a finding (`grid4px:false`) regardless of code agreement; suggest the nearest grid token. |

---

## 14. Helper Code Snippets

Resolve and summarize the selection (Phase 0):
```js
const sel = penpot.selection || [];
return sel.length === 0
  ? { empty: true, hint: "Select the component/board to review, then re-run." }
  : { count: sel.length, items: sel.map(s => ({ id: s.id, name: s.name, type: s.type })) };
```

Read which tokens are bound on a node vs raw values (Phase 1):
```js
const s = penpotUtils.findShapeById("REPLACE-ME-shape-id");
const tokens = s.tokens ? Object.fromEntries(Object.entries(s.tokens)) : {};
const fill = Array.isArray(s.fills) && s.fills[0] ? s.fills[0].fillColor : null;
return { id: s.id, name: s.name, boundTokens: tokens, rawFillColor: fill, radius: s.borderRadius ?? null };
```

Match a raw hex to an existing token when nothing is bound (Phase 4 fallback):
```js
const overview = penpotUtils.tokenOverview();
const target = "REPLACE-ME-#0066ff".toLowerCase();
// scan resolved color tokens for an exact value match
const hit = (overview.tokens || []).find(t =>
  t.type === "color" && String(t.resolvedValue).toLowerCase() === target);
return { rawValue: target, suggestedToken: hit ? hit.name : null };
```

---

## 15. Reference Resources

- `penpot_api_info("Penpot", "generateMarkup")` and `("Penpot", "generateStyle")` — confirm `opts` keys before Phase 1.
- `penpot_api_info("Shape", "tokens")` — confirm the bound-token map shape.
- `penpot_api_info("Page", "shapeStructure")` / `penpotUtils` — structure read.
- `shared/penpot-mcp-tool-reference.md` — the tool surface and globals.
- `shared/plugin-api-gotchas.md` — immutable arrays, async tokens, read-only geometry.
- `shared/tokens-schema.json` — token type strings, tiers, 4px grid rule.
- W3C WCAG 1.4.3 (contrast) for color-drift severity escalation.

---

## 16. Supporting Files

### References (progressive disclosure — load when that phase runs)

| File | Read during | Covers |
|------|-------------|--------|
| `references/01-extract-markup-style.md` | Phase 1 | `generateMarkup`/`generateStyle` usage, `opts`, reading `shape.tokens` and raw values, building the per-node map |
| `references/02-mapping-to-source.md` | Phase 3 | Parsing the supplied component code, mapping design nodes→DOM, tokens→CSS vars/theme keys, states→props/classes |
| `references/03-storybook-compare.md` | Phase 3 (Storybook case) | Deriving states from story args/controls, capturing rendered DOM+CSS, graceful degradation when only a URL is given |
| `references/04-drift-report.md` | Phase 4 | Normalization rules, the diff algorithm, severity rubric, report rendering, reconciliation phrasing |

### Scripts (paste into an `execute_code` call; replace placeholders)

| Script | Use for |
|--------|---------|
| `scripts/extractMarkupStyle.js` | Phase 1 — `generateMarkup` + `generateStyle` + per-node token/raw-value map for the selection |
| `scripts/exportForCompare.js` | Phase 2 — gather shape id(s), bounds, and metadata so the caller can invoke the `export_shape` MCP tool |
| `scripts/generateDriftReport.js` | Phase 4 — assemble the structured DRIFT report from extracted design data + the mapped code data |
