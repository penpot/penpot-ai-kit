---
name: penpot-foundations
description: "Build and govern the token + library foundation of a Penpot design system: primitive/semantic/component token tiers, themes (light/dark), and inferring a token system from an existing hardcoded design. Use BEFORE building components or screens, or when a design has raw values that should become tokens. Triggers: 'set up design tokens', 'create a token system', 'build the design system foundation', 'add dark mode tokens', 'infer tokens from this design', 'tokenize this file', 'create semantic tokens', 'apply tokens to these shapes'."
disable-model-invocation: false
version: 0.3.0
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

The load-bearing skill of the kit: nothing downstream is correct without a governed token layer. Work
as a **senior design-systems engineer who never hardcodes values**. Tokens live in
`penpot.library.local.tokens` and come in three tiers — primitive → semantic → component
(`shared/tokens-schema.json`). The skill creates them, builds light/dark modes, binds them to shapes,
and can infer a token system from an existing hardcoded design.

**The one rule: tokens before everything, in small approved steps.** Primitives, then semantic aliases
that reference them, then component tokens only if needed — each tier validated with `tokenOverview()`
and approved before the next. Never invent a value silently: propose the scale and let a human approve.

Tool surface: `shared/penpot-mcp-tool-reference.md`. API traps: `shared/plugin-api-gotchas.md` (the
`#n` below). Verify signatures with `penpot_api_info("TokenCatalog" | "TokenSet" | "Token")`.

## Brief contract
- **Context** — product, brand, existing system (if any), light/dark needs.
- **Objective** — one specific outcome ("primitive + semantic color/spacing tokens and a dark mode").
- **Inputs** — existing tokens, brand palette, type scale ratio (default Minor Third 1.2), spacing grid
  (default 4px).
- **Constraints** — no hardcoded values; semantic tokens reference primitives; spacing on the 4px grid.
- **Acceptance Criteria** — every token resolves; the semantic tier references primitives; all spacing
  is a 4px multiple; a working dark mode if requested.

## Workflow
**Phase 0 — Discovery (read-only).** `high_level_overview`, `penpotUtils.tokenOverview()`,
`shapeStructure(penpot.currentPage.root, 3)`, and `penpot.library.connected` — if the file takes its
tokens from a connected library (`penpot.library.tokensSource`), that library is where the system
lives and its catalog is read-only from here: say so instead of building a second one. Record what
exists in the ledger (`references/01-discovery.md`). ✋ Confirm scope: new system, extend, or infer.

**Phase 1 — Primitives.** `scripts/createTokenSet.js`: the `primitives` set, **activated**, with color
ramps, the spacing scale, the radius scale and the type scale (`references/02-token-architecture.md`).
✋ Review the scales and naming.

**Phase 2 — Semantic.** `scripts/createSemanticTokens.js` adds intent aliases that reference
primitives, split by type into two sets: **color** semantics (`color.action.primary.bg` →
`{color.blue.500}`) go to **`modes/light`**; **mode-invariant** semantics (`spacing.*`, `radius.*`,
`font.*`) go to **`semantic`**. That split is what makes dark mode a clean parallel color set.
✋ Review the intent mapping.

**Phase 3 — Dark mode (optional).** `scripts/createThemes.js` creates **`modes/dark`** with the same
color names as `modes/light` and dark values; it returns a `missing` list — cover every name. Leave
`modes/light` active. Bindings re-resolve by token *name*, so the design follows the switch when the
user activates `modes/dark` and deactivates `modes/light` in the Tokens panel
(`references/04-themes-modes.md`); do not promise a rendered dark preview from the plugin.
✋ Verify the dark `resolvedValue`s, restore light, and tell the user how to switch.

**Phase 4 — Apply / infer / bind.** One of:
- bind tokens to a selection — `scripts/applyTokensToShapes.js`;
- infer tokens from a hardcoded design — `scripts/inferTokensFromShapes.js`
  (`references/03-infer-from-design.md`);
- auto-bind every unbound element whose value exactly equals a token —
  `scripts/bindTokensToElements.js`. This is the precondition for theming: only shapes bound to token
  names follow a mode switch.

Before a bulk bind, take a restore point (`await penpot.currentFile.saveVersion(…)`, #19). Value-only
matches are a heuristic: flag inverse-colored chrome for a semantic-role review.
✋ Review bindings and coverage.

**Phase 5 — Validate.** `scripts/validateTokens.js` (orphans, unresolved references, off-grid spacing),
then the structured report.

## Rules
1. **Shapes bind to semantic tokens, never primitives** — a primitive cannot change per mode, so dark
   mode breaks.
2. **Sets are born inactive (#8).** Activate each new set (`if (!set.active) set.toggleActive()`): only
   active sets affect shapes, and a reference resolves only while its target set is active.
3. **Token values are strings** — a literal (`"#0066FF"`, `"16"`) or a reference (`"{color.blue.500}"`);
   use the exact `type` strings in `shared/tokens-schema.json` (camelCase, some plural: `borderRadius`,
   `fontSizes`).
4. **Binding is fragile (#2) — this skill's critical failure mode.**
   - Apply in one call and verify `shape.tokens` in a *later* one; the binding is not readable in the
     same call.
   - Chunks of about 25–40 shapes per call; never hundreds in one loop.
   - Guard every apply (`shape.tokens[prop] !== tok.name`): re-applying a bound token **removes** the
     binding, so a blind "run it again to be safe" pass unbinds everything.
   - A direct write to a bound property (`fills = …`, `flex.rowGap = …`) also removes the binding —
     that is how you clear one, and how you lose one by accident.
   - `applyToken(tok, ["all"])` throws; list properties (four corner props for radius).
5. **All spacing, padding, gap and radius values are multiples of 4px.** 18 is not "close enough":
   propose 16 or 20 and let a human approve any exception.
6. **Create only what is needed now.** Unused tokens are debt; propose the rest at a checkpoint.
7. **Idempotent.** Look a set or token up by name before adding it.
8. **Type sizes follow a Minor Third (1.2)** unless the brand dictates otherwise.

More excuses and countermeasures: `references/06-anti-rationalization.md`. Failures and fixes:
`references/07-error-recovery.md`.

## Mode, state and naming
Mode **review** (`shared/modes-and-policies.md`): creating a token, building a mode and binding shapes
each go through a checkpoint. The only safe-set action is swapping a raw value for a token whose
resolved value is exactly equal.

Ledger under `RUN_ID` (`shared/state-management.md`): `phase`,
`created: [{ kind: "set" | "token" | "theme", name, id }]`, `proposed`, `applied`, `restorePoints`.
After truncation, re-derive reality with `tokenOverview()` before continuing.

Naming (`shared/naming-conventions.md`, `references/05-naming.md`): sets `primitives` / `semantic` /
`modes/light` + `modes/dark` / optional `components`; tokens are lowercase dot paths; themes are
grouped `mode` with names `Light` / `Dark` / `High Contrast` (`addTheme({ group, name })`).

## Supporting files
- **references/** — `01-discovery.md`, `02-token-architecture.md` (tiers, scales, type ratio),
  `03-infer-from-design.md`, `04-themes-modes.md`, `05-naming.md`, `06-anti-rationalization.md`,
  `07-error-recovery.md`.
- **scripts/** (paste into `execute_code`) — `inspectFileStructure.js` (read-only),
  `createTokenSet.js`, `createSemanticTokens.js`, `createThemes.js`, `inferTokensFromShapes.js`,
  `applyTokensToShapes.js`, `bindTokensToElements.js` (chunked + verify), `validateTokens.js`.

**Doctrine paths.** `shared/…` and `policies/…` resolve inside this bundle in native installs (vendored by the installer); in a Claude Code plugin install they live at the plugin root — `${CLAUDE_PLUGIN_ROOT}/shared/…`, two directories up from this file.
