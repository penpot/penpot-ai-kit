---
name: penpot-migrate
description: "Migrate a Figma design into Penpot with high fidelity: Figma Auto Layout → Penpot flex/grid, Figma Variables → Penpot tokens, Figma component sets → Penpot variants, preserving hierarchy. Reads via the Figma MCP, writes via the Penpot MCP, through an intermediate representation (IR). Degrades to manually-pasted Figma data if the Figma MCP is absent. Triggers: 'migrate from Figma', 'import this Figma file into Penpot', 'move our Figma library to Penpot', 'recreate this Figma design in Penpot', 'Figma to Penpot'."
disable-model-invocation: false
version: 0.2.0
audiences: [migration]
mode-default: review
requires:
  - shared/penpot-mcp-tool-reference.md
  - shared/plugin-api-gotchas.md
  - shared/tokens-schema.json
  - shared/naming-conventions.md
  - shared/state-management.md
  - shared/modes-and-policies.md
  - shared/visual-self-review.md
---

# penpot-migrate — Figma → Penpot, fidelity-first

## 1. Title + How it works
`penpot-migrate` bridges **two** MCP servers: it reads a Figma design via the Figma MCP and writes it
into Penpot via the Penpot MCP — every mutation goes through `execute_code`; validate visually with
`export_shape`; read structure with `penpotUtils.shapeStructure` (full tool surface:
`shared/penpot-mcp-tool-reference.md`). It never writes Penpot directly from Figma data — it first builds a normalized
**intermediate representation (IR)**, then translates the IR into Penpot constructs (boards, flex,
tokens, components). If the Figma MCP isn't available, it accepts manually-pasted Figma export/JSON and
works from that.

## 2. The One Rule That Matters Most
**IR before any Penpot write, and migrate in layers.** Tokens first, then components, then screens —
each validated. Never one-shot a whole file. The IR is the contract that decouples Figma's model from
Penpot's API.

## 3. Penpot MCP Tool Reference
Full surface: `shared/penpot-mcp-tool-reference.md`. Penpot-write side: `createBoard`/`addFlexLayout`/
`addGridLayout`, `penpot.library.local.tokens.addToken`, `createComponent`/`createVariantFromComponents`,
`export_shape` for fidelity checks. Figma-read side: the Figma MCP's design-context tools (names vary;
treat them as producing raw data the IR normalizes).

## 4. Plugin API Essentials
Gotcha numbers refer to `shared/plugin-api-gotchas.md`.
- Penpot uses **Boards** (not Frames); Auto Layout maps to Board **flex** (`dir`, gaps, padding, sizing fill/auto/fix) or **grid**.
- Figma Variables → Penpot tokens via `addToken({type,name,value})` with the real type strings (`shared/tokens-schema.json`). Map Figma modes → Penpot themes.
- **#9** Figma component sets/variants → Penpot variant containers via `penpot.createVariantFromComponents(mainInstances)` (no `combineAsVariants` method). Beware **#12** — variant *mutation* corrupts the file; prefer create-then-group, never edit a variant container in place.
- **#2** token application is async — apply in one call, verify `resolvedValue`/`shape.tokens` in a LATER call; **#4** flex overrides child x/y; **#6** detach before mutating instance internals.
- Verify unfamiliar signatures with `penpot_api_info` first.

## 5. Token-Aware Brief Contract
- **Context** — source Figma file/scope, target Penpot file, fidelity expectations.
- **Objective** — single: "migrate <scope> from Figma to Penpot at <fidelity>".
- **Inputs** — Figma access (MCP or pasted export), naming/token mapping rules.
- **Constraints** — preserve hierarchy/layout/variants; map Variables to tokens; on-grid spacing.
- **Acceptance Criteria** — IR built; tokens migrated & resolving; components/variants reconstructed; screens visually match (export compare); fidelity report.

Act as a **migration engineer who prizes structural fidelity**.

## 6. Mandatory Workflow

> **Visual self-review (mandatory):** before every ✋ checkpoint that shows visual work,
> run the export → look → fix loop from `shared/visual-self-review.md` — export the unit you
> just built, inspect the image yourself against the checklist, fix visible defects (max 2
> iterations), and present that same export with any remaining defects named.

**Phase 0 — Figma analysis.** Read the source (Figma MCP or pasted data); inventory tokens/components/screens (`scripts/analyzeFigmaStructure.js`, `references/01-figma-analysis.md`). ✋ Checkpoint: scope & mapping rules.

**Phase 1 — Build IR.** Normalize into the IR (`scripts/buildIR.js`, `references/02-ir-building.md`). The IR is plain data; no Penpot writes yet. ✋ Checkpoint: review IR coverage.

**Phase 2 — Tokens.** Translate Variables → tokens (`scripts/migrateTokens.js`, `references/03-token-migration.md`); reconcile with `penpot-foundations`. ✋ Checkpoint.

**Phase 3 — Components.** Reconstruct components & variants (`scripts/migrateComponent.js`, `references/04-component-migration.md`). ✋ Checkpoint.

**Phase 4 — Layout & screens.** Auto Layout → flex/grid (`references/05-layout-translation.md`); build screens (`scripts/migrateScreen.js`, `references/06-screen-migration.md`). ✋ Checkpoint per screen (`export_shape`).

**Phase 5 — Validate fidelity.** `scripts/validateFidelity.js` (`references/07-validation.md`) — structure, tokens, visual compare. Report. (`references/08-error-recovery.md` for issues.)

## 7. Critical Rules
1. Build the IR before any Penpot write.
2. Migrate tokens → components → screens, in that order, validating each.
3. Auto Layout → flex/grid; never absolute-position what was auto-laid-out.
4. Variables → tokens with real type strings; modes → themes.
5. Degrade gracefully if the Figma MCP is absent (accept pasted data).
6. Report fidelity gaps honestly; don't claim 1:1 when it isn't.

## 8. Domain Architecture
IR (plain JSON) decouples the two tools:
```
{ tokens:[{type,name,value,mode?}],
  components:[{name, variantProps?, layout, children:[...]}],
  screens:[{name, size, layout, children:[...]}] }
```
Each IR node carries enough to build the Penpot equivalent (layout = flex/grid spec; children reference
components or primitives). Translation reads IR, writes Penpot.

## 9. Modes & Policies
Default **review**. Component/variant restructuring and detach never auto (`shared/modes-and-policies.md`).

## 10. State Management
Ledger under `RUN_ID`: `phase`, `ir` (or a pointer), `migrated:{tokens,components,screens}`, `gaps:[...]`. The IR is the resumable artifact — re-read it after truncation.

## 11. User Checkpoints
| After phase | Artifacts | Ask |
|-------------|-----------|-----|
| 0 | inventory + mapping rules | Approve scope/mapping? |
| 1 | IR coverage | Approve IR? |
| 2 | migrated tokens (`tokenOverview`) | Approve tokens? |
| 3 | components/variants | Approve components? |
| 4 | screen `export_shape` | Approve screen? |

## 12. Naming Conventions
`shared/naming-conventions.md`: map Figma names to Penpot conventions (PascalCase components, `Property=Value` variants, semantic layers, dot-notation tokens).

## 13. Anti-Rationalization Table
| Excuse | Why it's wrong | Countermeasure (halt) |
|--------|----------------|------------------------|
| "Skip the IR, write Penpot straight from Figma." | Couples the two models; brittle, lossy. | Build the IR first; translate from it. |
| "Absolute-position everything to match pixels." | Loses Auto Layout responsiveness. | Map Auto Layout → flex/grid; absolute only where Figma used absolute. |
| "Recreate Variables as hardcoded values." | Drops the token system. | Migrate Variables → tokens; modes → themes. |
| "Migrate the whole file in one pass." | One-shot loses fidelity and is unauditable. | Layered: tokens → components → screens, validate each. |
| "Figma MCP isn't connected, so I'll guess the design." | Guessing fabricates the design. | Ask for a pasted export/JSON; work from real data. |
| "Claim it's a perfect 1:1." | Some Figma features don't map cleanly. | Report fidelity gaps honestly. |

## 14. Helper Code Snippets
```js
// Translate an IR layout node to a Penpot flex Board
function buildFromIR(node, parent){
  const b = penpot.createBoard(); b.name = node.name;
  if (node.layout && node.layout.type === "flex"){
    const f = b.addFlexLayout();
    f.dir = node.layout.dir || "column";
    f.rowGap = node.layout.rowGap || 0; f.columnGap = node.layout.columnGap || 0;
  }
  (parent || penpot.currentPage.root).appendChild(b);
  return b;
}
return { ok: true };
```

## 15. Reference Resources
- `penpot_api_info('Board')`, `penpot_api_info('VariantContainer')`, `penpot_api_info('TokenSet')`.
- Figma MCP design-context tools (names vary by version) — discover via the Figma MCP's own overview.

## 16. Supporting Files
**references/**: `01-figma-analysis.md`, `02-ir-building.md`, `03-token-migration.md`, `04-component-migration.md`, `05-layout-translation.md`, `06-screen-migration.md`, `07-validation.md`, `08-error-recovery.md`.
**scripts/**: `analyzeFigmaStructure.js`, `buildIR.js`, `migrateTokens.js`, `migrateComponent.js`, `migrateScreen.js`, `validateFidelity.js`.
