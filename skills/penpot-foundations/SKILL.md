---
name: penpot-foundations
description: "Build and govern the token + library foundation of a Penpot design system: primitive/semantic/component token tiers, themes (light/dark), and inferring a token system from an existing hardcoded design. Use BEFORE building components or screens, or when a design has raw values that should become tokens. Triggers: 'set up design tokens', 'create a token system', 'build the design system foundation', 'add dark mode tokens', 'infer tokens from this design', 'tokenize this file', 'create semantic tokens', 'apply tokens to these shapes'."
disable-model-invocation: false
version: 0.2.0
audiences: [design-system, design-engineer]
mode-default: review
requires:
  - shared/penpot-mcp-tool-reference.md
  - shared/plugin-api-gotchas.md
  - shared/tokens-schema.json
  - shared/naming-conventions.md
  - shared/state-management.md
  - shared/modes-and-policies.md
---

# penpot-foundations — token & library foundation

## 1. Title + How it works
`penpot-foundations` is the **load-bearing** skill of the kit: nothing downstream is correct without
a governed token layer. Every mutation goes through `execute_code`; validate visually with
`export_shape`; read structure with `penpotUtils.shapeStructure` (full tool surface:
`shared/penpot-mcp-tool-reference.md`). This skill reads tokens with `penpotUtils.tokenOverview()`,
creates them through `penpot.library.local.tokens` (`addSet`, `set.addToken({type,name,value})`), and
binds them to shapes with `shape.applyToken(token, properties)`. It works in three tiers — primitive →
semantic → component (see `shared/tokens-schema.json`) — and can also **infer** a token system from an
existing hardcoded design.

## 2. The One Rule That Matters Most
**Tokens before everything, and never one-shot.** Build the foundation in small, idempotent steps:
primitives first, then semantic aliases that reference them, then (only if needed) component tokens.
Validate after each tier with `tokenOverview()`. Never invent values silently — propose the scale and
let a human approve it at the checkpoint.

## 3. Penpot MCP Tool Reference
Full surface: `shared/penpot-mcp-tool-reference.md`. Domain calls this skill leans on:
`penpotUtils.tokenOverview()` / `shapeStructure()` (discovery + inference);
`penpot.library.local.tokens.addSet` / `set.addToken` / `shape.applyToken` (writes);
`penpot_api_info('TokenSet'|'Token'|'TokenCatalog')` before relying on member signatures.

## 4. Plugin API Essentials
Gotcha numbers refer to `shared/plugin-api-gotchas.md`.
- **#8 token creation** — `penpot.library.local.tokens`; `addSet({name})`/`addTheme({group,name})` take OBJECT args; new sets are INACTIVE (`set.toggleActive()`); token `value` is always a string (literal or `"{reference}"`); read `token.resolvedValue`.
- Use the **exact** token `type` strings from `shared/tokens-schema.json`: `color`, `dimension`, `spacing`, `typography`, `shadow`, `opacity`, `borderRadius`, `borderWidth`, `fontWeights`, `fontSizes`, `fontFamilies`, `letterSpacing`, `textDecoration`, `textCase`. (Note camelCase/plural — NOT `border-radius` or `font-size`.)
- **#2 async token application — this skill's critical failure mode.** `shape.applyToken(token, properties)` is async (~100 ms) and binds **by NAME** (bindings re-resolve when the active set/theme changes — that is what makes dark mode work). Apply in one `execute_code` call, verify `shape.tokens` in a LATER call. **Never mass-apply in a single call** — hundreds of `applyToken`s in one loop race and scramble bindings; apply in chunks of ≈25–40 shapes per call, verify each chunk, retry misses. Text/Rectangle **fill** bindings are the flakiest (Boards are reliable); bindings are sticky — overwrite a wrong one by applying the correct token, don't try to clear it via `fills`.
- Verify any unfamiliar member with `penpot_api_info('TokenSet')` / `penpot_api_info('Token')` first.

## 5. Token-Aware Brief Contract
Before mutating, restate the request as:
- **Context** — product, brand, existing system (if any), light/dark needs.
- **Objective** — single and specific (e.g., "create primitive + semantic color/spacing tokens and a dark theme").
- **Inputs** — existing tokens, brand palette, type scale ratio (default Minor Third 1.2), spacing grid (default 4px).
- **Constraints** — no hardcoded values; semantic tokens must reference primitives; spacing on the 4px grid.
- **Acceptance Criteria** — every token resolves; semantic tier references primitives; all spacing is a 4px multiple; (if requested) a working dark theme.

Act as a **senior design-systems engineer who never hardcodes values**.

## 6. Mandatory Workflow

**Phase 0 — Discovery (read-only).** `high_level_overview`, then `penpotUtils.tokenOverview()` and a
`shapeStructure(penpot.currentPage.root, 3)` read. Record what already exists in the `RUN_ID` ledger.
✋ Checkpoint: confirm scope (new system vs. extend vs. infer-from-design).

**Phase 1 — Primitives.** Create the `primitives` set **and activate it** (`set.toggleActive()` — new
sets are created inactive), then add raw color ramps, the spacing scale (4px grid), radius scale, and
type scale (font sizes via Minor Third). Use `scripts/createTokenSet.js`.
✋ Checkpoint: review the primitive scales (`tokenOverview()` + naming).

**Phase 2 — Semantic.** Add intent aliases that reference primitives, **routed into two sets** (the
referenced `primitives` set must be active or references fail validation):
- **colour** semantics (`color.action.primary.bg` → `{color.blue.500}`) → **`modes/light`**;
- **mode-invariant** semantics (`spacing.*`, `radius.*`, `font.*`) → **`semantic`**.

`scripts/createSemanticTokens.js` does this split by token type. This is what makes dark mode a clean
parallel colour set. ✋ Checkpoint: review semantic mapping.

**Phase 3 — Dark mode (optional).** Create the parallel **`modes/dark`** colour set (same colour names
as `modes/light`, dark values) with `scripts/createThemes.js`; leave `modes/light` active as default
and hand the toggle to the user. Cover **every** `modes/light` colour name (the script returns a
`missing` list). Dark mode **works** — bindings re-resolve by token *name* when the user activates
`modes/dark` — but the agent cannot render the switch from the plugin (`theme.addSet()` doesn't persist;
the plugin's read lags). The user toggles `modes/dark` on / `modes/light` off in Penpot's Tokens panel
(see `references/04-themes-modes.md`). ✋ Checkpoint: verify dark `resolvedValue`s, restore light, and
tell the user how to switch.

**Phase 4 — Apply / Infer / Bind.** Either bind tokens to a selection (`scripts/applyTokensToShapes.js`),
infer tokens from a hardcoded design (`scripts/inferTokensFromShapes.js`), or — **fundamental** —
**auto-bind tokens to every unbound element by exact value match** so the user doesn't have to do it by
hand (`scripts/bindTokensToElements.js`). This is also the **precondition for theming**: a design only
follows a light/dark switch if its shapes are bound to token *names* (bindings re-resolve by name when
sets/themes change). **Apply in chunks and verify** — `applyToken` is async and mass-application in one
call races/scrambles bindings; Text/Rectangle **fill** bindings are flaky and need verify+retry (see
`shared/plugin-api-gotchas.md`). Value-only matches are a heuristic: flag inverse-colored chrome for a
semantic-role review. ✋ Checkpoint: review bindings + coverage.

**Phase 5 — Validate.** `scripts/validateTokens.js` — orphans, unresolved references, off-grid spacing.
Produce the structured report.

## 7. Critical Rules
1. Primitives → semantic → component. Shapes bind to **semantic** tokens, never primitives.
2. All spacing/padding/gap/radius values are multiples of 4px.
3. Never create a token you can't justify; propose new tokens at a checkpoint, don't auto-create them.
4. Idempotent: check for an existing set/token by name before adding (no duplicates).
5. Type sizes follow a Minor Third (1.2) scale unless the brand dictates otherwise.
6. Do not apply and read back a token in the same `execute_code` call (async).
7. Keep the `RUN_ID` ledger updated so a truncated session can resume.

## 8. Domain Architecture
Three token tiers (see `shared/tokens-schema.json`):
- **primitives** — raw, context-free scale (`color.blue.500`, `spacing.4`, `radius.md`, `font.size.300`). Never bound directly to shapes when a semantic token exists.
- **semantic** — intent aliases referencing primitives (`color.text.default` → `{color.gray.900}`, `spacing.inset.md` → `{spacing.4}`). **This is what shapes bind to.**
- **components** — optional per-component overrides referencing semantic tokens. Create only when a component needs its own surface.

Set layout (see `shared/modes-and-policies.md`): mode-invariant semantics live in `semantic`; **colour**
semantics live in `modes/light` / `modes/dark` (same names in both). Themes are modeled as Penpot token
themes (`addTheme({ group, name })`) that toggle the matching `modes/*` set; primitives and the
mode-invariant `semantic` set stay constant.

## 9. Modes & Policies
Default **review**. Creating a new token, building a theme, or applying tokens to shapes all require a
checkpoint. The only auto-applicable action (safe set, `shared/modes-and-policies.md`) is replacing a
raw value that is **exactly equal** to an existing token's resolved value with that token.

## 10. State Management
Ledger keys under `RUN_ID` (see `shared/state-management.md`): `phase`, `created:[{kind:'set'|'token'|'theme', name, id}]`, `proposed:[...]`, `applied:[...]`. Re-derive reality with `tokenOverview()` after truncation before continuing.

## 11. User Checkpoints
| After phase | Artifacts shown | What we ask |
|-------------|-----------------|-------------|
| 0 Discovery | existing tokens summary | New / extend / infer? |
| 1 Primitives | `tokenOverview()` of primitives | Approve scales & naming? |
| 2 Semantic | semantic→primitive mapping | Approve intent mapping? |
| 3 Themes | resolved values per theme | Approve theme switch? |
| 4 Apply/Infer | before/after on a sample | Approve bindings? |

## 12. Naming Conventions
Dot-notation per `shared/naming-conventions.md`: sets are `primitives` / `semantic` (mode-invariant) /
`modes/light` + `modes/dark` (colour) / optional `components`; tokens are lowercase dot paths; themes
grouped `mode` with names `Light` / `Dark` / `High Contrast`.

## 13. Anti-Rationalization Table
| Excuse the LLM makes | Why it's wrong | Deterministic countermeasure |
|----------------------|----------------|------------------------------|
| "I'll hardcode this hex now and tokenize later." | Hardcoded values break theming and governance; "later" never comes. | Stop. Read `tokenOverview()`, bind to a semantic token, or propose one for review. |
| "I'll bind shapes straight to a primitive to save a step." | Primitives can't switch per theme; dark mode breaks. | Bind to a semantic token that references the primitive. |
| "This spacing is 18px, close enough." | Off-grid values erode rhythm and fail governance. | Round to the nearest 4px-grid token (16 or 20). Document any exception only with human approval. |
| "I'll create a dozen tokens up front to be safe." | Unused/orphan tokens are debt. | Create only what's needed now; propose the rest at a checkpoint. |

## 14. Helper Code Snippets
```js
// Idempotent set + token creation (Phase 1)
const tok = penpot.library.local.tokens;
let prim = tok.sets.find(s => s.name === "primitives") || tok.addSet({ name: "primitives" });
if (!prim.active) prim.toggleActive();          // new sets are INACTIVE by default
if (!prim.tokens.find(t => t.name === "color.blue.500")) {
  prim.addToken({ type: "color", name: "color.blue.500", value: "#0066FF" });
}
return { set: prim.name, count: prim.tokens.length };
```
```js
// Semantic alias referencing a primitive (Phase 2)
const tok = penpot.library.local.tokens;
let sem = tok.sets.find(s => s.name === "semantic") || tok.addSet({ name: "semantic" });
if (!sem.active) sem.toggleActive();            // and the referenced 'primitives' set must be active too
if (!sem.tokens.find(t => t.name === "color.action.primary.bg")) {
  sem.addToken({ type: "color", name: "color.action.primary.bg", value: "{color.blue.500}" });
}
return { ok: true };
```

## 15. Reference Resources
- `penpot_api_info('TokenCatalog')`, `penpot_api_info('TokenSet')`, `penpot_api_info('Token')`.
- `shared/tokens-schema.json` (taxonomy + real type strings), `shared/plugin-api-gotchas.md`.

## 16. Supporting Files
**references/**
| File | Loaded for |
|------|-----------|
| `01-discovery.md` | Phase 0 read-only inventory |
| `02-token-architecture.md` | tiers, scales, type ratio |
| `03-infer-from-design.md` | building tokens from a hardcoded design |
| `04-themes-modes.md` | light/dark theme modeling |
| `05-naming.md` | token naming specifics |
| `06-anti-rationalization.md` | governance excuses + countermeasures |
| `07-error-recovery.md` | common failures & fixes |

**scripts/**
| File | Purpose |
|------|---------|
| `inspectFileStructure.js` | read pages/library/tokens |
| `createTokenSet.js` | idempotent primitives set + tokens |
| `createSemanticTokens.js` | semantic aliases referencing primitives |
| `inferTokensFromShapes.js` | propose tokens from raw values |
| `applyTokensToShapes.js` | bind tokens to a selection |
| `bindTokensToElements.js` | auto-bind tokens to unbound elements by value (chunked + verify) — enables theming |
| `createThemes.js` | light/dark themes |
| `validateTokens.js` | orphans, unresolved refs, off-grid |
