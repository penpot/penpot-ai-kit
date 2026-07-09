---
name: penpot-build-from-code
description: "Translate an existing application page, view, or component code into a Penpot screen that is bound to the existing design system — mapping code styles onto semantic tokens and reusing library components instead of raw shapes. Use when the user has real code/markup and wants it reconstructed in Penpot, section by section, on-system. Triggers: 'build this in Penpot from code', 'turn this React/HTML/CSS into a Penpot screen', 'recreate this view in Penpot', 'port this page to Penpot', 'translate this component to Penpot bound to our tokens', 'code to Penpot'."
disable-model-invocation: false
version: 0.2.0
audiences: [design-engineer, product-designer]
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

# Build From Code — Translate App Code into an On-System Penpot Screen

## 1. Title + How it works
This skill takes an existing application artifact — JSX/TSX, HTML, Vue/Svelte templates, CSS/Tailwind, or a styled-components tree — and reconstructs it as an **editable, system-bound** Penpot screen. Every mutation goes through `execute_code`; validate visually with `export_shape`; read structure with `penpotUtils.shapeStructure` (full tool surface: `shared/penpot-mcp-tool-reference.md`). The core move is **discover first** (Phase 0 enumerates the existing tokens and components you must map onto), then transform the code **incrementally, section by section**, mapping each CSS/style value to a semantic token and each repeated UI part to an existing library component — never hardcoding hex or off-grid spacing, never reinventing a component as a raw box.

## 2. The One Rule That Matters Most
**Never one-shot a screen, and never hardcode a value that a token already expresses.** Build the screen one section at a time (one logical `execute_code` step per call), and before you write any fill/spacing/radius/type, resolve it against the discovered token set. A code-derived `#0066FF` is not a fill — it is a lookup into the design system. If no token matches, you **propose** one and stop; you do not invent it. Translating an entire page in a single call, or pasting raw computed CSS onto shapes, is the failure mode this skill exists to prevent.

## 3. Penpot MCP Tool Reference
Full surface: `shared/penpot-mcp-tool-reference.md`. The calls this skill leans on:
- **Discovery (read-only):** `penpotUtils.tokenOverview()`, `penpot.library.local` (components, tokens), `penpotUtils.shapeStructure(shape, depth)`, `penpotUtils.findShape/findShapes`.
- **Screen scaffold:** `penpot.createBoard()`, `board.addFlexLayout()`, `penpotUtils.addFlexLayout(container, dir)`.
- **Section build:** `penpot.createRectangle/createText/createEllipse/createPath`, `component.instance()`, `container.appendChild(child)`, `child.layoutChild`.
- **Token binding:** `shape.applyToken(token, properties[])`, `token.resolvedValue`, `penpotUtils.findTokenByName`.
- **Validation:** `export_shape` (separate tool call) and a `shapeStructure` read.

## 4. Plugin API Essentials
The gotchas that bite this skill, as one-liners — full text in `shared/plugin-api-gotchas.md`:
- **#1 Immutable style arrays** — assign a brand-new `fills`/`strokes` array; never mutate `fills[0]`.
- **#2 Token application is async (~100 ms)** — apply in one `execute_code` call, verify `resolvedValue` in a **later** call.
- **#3 `resize()` forces text `growType: 'fixed'`** — set `growType = 'auto-width'`/`'auto-height'` after resizing text you want to flow.
- **#4 Flex/grid overrides child x/y** — position children by append order + gap/padding/align/justify; opt out only with `child.layoutChild.absolute = true`.
- **#5 `width`/`height` and `parentX`/`parentY` are read-only** — use `shape.resize(w, h)` and `penpotUtils.setParentXY(shape, x, y)`.
- **#6 Detach before mutating an instance's internals** — `detach()` first and report it.
- **#7 Append or it isn't on the canvas** — `container.appendChild(child)` (or `penpot.currentPage.root`).
- Verify any unfamiliar signature with `penpot_api_info(type, member)` before using it.

## 5. Token-Aware Brief Contract
Before any mutation, restate the request as this contract. Act as **a senior design-engineer who treats the design system as the single source of truth and never hardcodes a value when a token exists**.

- **Context** — what product/surface is this code from, who uses it, what page/view does it represent (e.g. "settings page of the B2B admin console, desktop").
- **Objective** — single and specific: "rebuild the `<SettingsPage>` component as an editable Penpot board bound to the existing `semantic` token set and reusing the `Button`, `InputField`, and `Card` components."
- **Inputs** — the actual code (component files, CSS/Tailwind config, design tokens export if any), the target Penpot page, the discovered token sets, the discovered component library.
- **Constraints** — forbidden moves (no raw hex, no off-4px-grid spacing, no reinvented components, no `detach()` without approval), inviolable rules (semantic tokens not primitives; existing components over new shapes), viewport width.
- **Acceptance Criteria** — quantitative: ≥95% of color/spacing/radius/type values bound to tokens (validated by `validateScreen.js`); zero orphan raw values flagged; every repeated UI part that has a matching library component is an **instance**, not a shape; all spacing on the 4px grid; layer names semantic (no `Rectangle 12`).

## 6. Mandatory Workflow

> **Visual self-review (mandatory):** before every ✋ checkpoint that shows visual work,
> run the export → look → fix loop from `shared/visual-self-review.md` — export the unit you
> just built, inspect the image yourself against the checklist, fix visible defects (max 2
> iterations), and present that same export with any remaining defects named.

### Phase 0 — Discovery (read-only)
**Goal:** map the existing Penpot design system so code values have somewhere to land. **No mutation.**
1. `high_level_overview` (once).
2. `execute_code`: run `scripts/inspectDesignSystem.js` → enumerate token sets, every token (`name`, `type`, `resolvedValue`), and every library component (`name`, `id`, variant axes). Cache into `storage.run.ds`.
3. `execute_code`: `penpotUtils.tokenOverview()` to confirm the active theme/sets.
4. Parse the input code into a **section outline** (header, nav, hero, form, card grid, footer…) and a **style inventory** (every distinct color/spacing/radius/font value the code uses).
**Exit criterion:** you have (a) a token map keyed by resolved value, (b) a component catalog keyed by role, (c) a section outline, (d) a style inventory with each value pre-matched to a token or flagged `UNMAPPED`.
**✋ Checkpoint:** present the token/component coverage and the UNMAPPED list. Ask which UNMAPPED values should become **proposed** new tokens vs. accepted as documented exceptions. See `references/01-discovery.md`.

### Phase 1 — Screen wrapper
**Goal:** create the screen Board with the right flex container and a `RUN_ID` ledger entry. 
1. `execute_code`: run `scripts/createScreenWrapper.js` (idempotent by board name) → Board sized to the viewport, `addFlexLayout('column')`, padding/gap bound to spacing tokens.
**Exit criterion:** one empty, correctly-sized, flex column Board exists; its id is in the ledger.
**✋ Checkpoint:** `export_shape` the empty board; confirm dimensions/orientation before filling.

### Phase 2 — Incremental section build (repeat per section)
**Goal:** build exactly **one** section from its code fragment, on-system. See `references/02-component-assembly.md`, `references/03-token-binding.md`, `references/04-incremental-transform.md`.
1. `execute_code`: run `scripts/buildSection.js` for that one section — prefer `component.instance()` for any part with a matching catalog component; create raw shapes only for genuinely bespoke parts; bind every fill/spacing/radius/type to a token via `applyToken`.
2. `execute_code` (**separate call**, after ~100 ms gap from the agent's turn): read back `token.resolvedValue` / `shapeStructure` to confirm bindings applied.
3. `export_shape` the section.
**Exit criterion:** the section renders, every value is token-bound or an approved exception, components are instances.
**✋ Checkpoint:** show the section; "looks good" approves **only this section**. Name the next section before continuing.

### Phase 3 — Validation & report
**Goal:** prove the screen is on-system.
1. `execute_code`: run `scripts/validateScreen.js` → token coverage %, list of orphan raw values, structure sanity (flex set, no auto-named layers, instances vs. shapes).
2. Produce the structured report (section 12 of AGENTS.md).
**Exit criterion:** acceptance criteria met or every gap explicitly listed for review.
**✋ Checkpoint:** present coverage + remaining gaps; ask for sign-off.

## 7. Critical Rules
1. Always `high_level_overview` first; always Phase 0 discovery before any write.
2. One section per `execute_code` mutation call. Never build multiple sections in one call.
3. Every color/spacing/radius/border/type value MUST resolve to a token before it is applied. No raw hex/rgb/px on a shape when a matching token exists.
4. All spacing/padding/gap MUST be a multiple of 4px (round code values to the nearest grid token; document any exception).
5. Prefer semantic-tier tokens over primitives so theming works (`tokens-schema.json`).
6. Any UI part with a matching library component MUST be an **instance**, not a hand-built shape group.
7. Never invent a token. If a code value has no match, propose it (name/value/tier) and stop for approval.
8. Token application is async — verify `resolvedValue` in a later `execute_code` call, never the same one.
9. Never `detach()` an instance without explicit approval; report it if you do.
10. Semantic, kebab-case layer names from the code's role (`nav`, `header`, `card-container`) — never `Rectangle 12`.
11. Write the `RUN_ID` ledger after each phase; make every create idempotent (existence-check by name).

## 8. Domain Architecture
The skill produces a screen tree and consumes a design-system map.

- **Design-system map (Phase 0 output, cached in `storage.run.ds`):**
  - `tokensByValue: { "#0066FF": "color.action.primary.bg", "16": "spacing.4", ... }` — reverse index for fast code-value → token lookup.
  - `tokensByName: { "color.action.primary.bg": {type, resolvedValue} }`.
  - `componentsByRole: { button: {id, variants}, input: {...}, card: {...} }`.
- **Section outline (from code):** ordered list `[{ role, codeFragment, childrenRoles }]`.
- **Style inventory:** `[{ codeValue, cssProp, matchedToken | "UNMAPPED" }]`.
- **Screen tree (Penpot output):** `Board(flex column) → section Boards(flex) → component instances + bound shapes`.
- **Ledger (`RUN_ID`):** `{ runId, phase, created:[{kind,name,id}], proposedTokens:[...], exceptions:[...], pendingReview:[...] }`.

## 9. Modes & Policies
Default **review** (Apply-with-review): build each section, then stop at the checkpoint with an `export_shape` + summary before the next. Link: `shared/modes-and-policies.md`.
- **Safe-set (may auto-apply):** semantic layer renaming; replacing a raw value that is **exactly equal** to a token's resolved value with that token (loss-less swap); adding plugin-data/metadata.
- **Always require review:** creating the screen Board and any geometry; instantiating/restructuring components; **any proposed new token**; `detach()`; any token match that is a judgement call rather than an exact equality.

## 10. State Management
Link: `shared/state-management.md`. Ledger namespace `penpot-ai`, keyed by `RUN_ID` (e.g. `bfc-2026-06-05-a`).
- `storage.run.ds` — cached design-system map (tokens, components) from Phase 0.
- `setSharedPluginData('penpot-ai', '<RUN_ID>.phase', n)` — current phase.
- `setSharedPluginData('penpot-ai', '<RUN_ID>.ledger', JSON)` — `{boardId, sectionsBuilt:[role], proposedTokens, exceptions}`.
- **Resume:** re-read the ledger, re-run `inspectDesignSystem.js` to re-derive the DS map, `shapeStructure(board)` to see which sections exist, continue from `ledger.phase`. Idempotent steps make re-runs safe.

## 11. User Checkpoints
| After phase | Artifacts shown | What we ask |
|-------------|-----------------|-------------|
| 0 Discovery | Token/component coverage table; UNMAPPED style values | "Which UNMAPPED values become proposed tokens vs. documented exceptions?" |
| 1 Wrapper | `export_shape` of empty Board + dimensions | "Correct viewport size and column orientation?" |
| 2 Section (each) | `export_shape` of the section + token-binding summary | "Approve THIS section? (next section is named explicitly)" |
| 3 Validation | Coverage %, orphan-value list, structure sanity | "Sign off, or address listed gaps first?" |

## 12. Naming Conventions
Link: `shared/naming-conventions.md`. Domain specifics:
- Screen Board: `screen-<view-name>` (kebab), e.g. `screen-settings`.
- Section Boards: the semantic HTML role — `header`, `nav`, `main`, `section`, `footer`, or kebab role names like `card-grid`, `field-row`.
- Component instances keep the catalog component name.
- Proposed tokens follow dot-notation tiers from `tokens-schema.json`; prefer semantic names that describe **intent** derived from the code's usage (`color.action.primary.bg`, not `color.blue.500`).

## 13. Anti-Rationalization Table
| Excuse the LLM makes | Why it's wrong | Deterministic countermeasure that halts the flow |
|----------------------|----------------|---------------------------------------------------|
| "The CSS says `#0066FF`, I'll just set that as the fill." | Hardcoded hex is off-system; it won't theme and fails governance. | Look it up in `storage.run.ds.tokensByValue`. If matched → `applyToken`. If not → propose a token and **stop** for approval. Never set raw hex. |
| "Tailwind `p-5` is 20px, close enough to set 20." | A literal bypasses the token scale and may be off-grid. | Round to the nearest 4px-grid spacing token and `applyToken`. Document any exception only with approval. |
| "There's a `Button` component but it's faster to draw a rounded rect with text." | Reinventing a system part breaks updates, variants, and handoff parity. | If `storage.run.ds.componentsByRole.button` exists, `component.instance()` it and set props/variant. Raw shapes only for genuinely bespoke parts. |
| "I'll build the whole page in one `execute_code` to save calls." | One-shotting hides failures and produces unbound, unverified output. | Build one section per call; verify token bindings in a later call; `export_shape` and checkpoint before the next. |
| "This code value has no token; I'll add `color.misc.x` myself to keep moving." | Silently inventing tokens pollutes the system and skips human governance. | Add it to `ledger.proposedTokens` with name/value/tier and halt at the discovery checkpoint. Do not create it unilaterally. |
| "Token didn't read back; I'll just hardcode the value too as a fallback." | A hardcoded fallback is exactly the orphan value this skill forbids; the read-back is async. | Re-read `resolvedValue` in a **later** `execute_code` call. If it truly failed, fix the binding — never add a raw fallback. |

## 14. Helper Code Snippets
```js
// Reverse-index lookup: code value -> token (Phase 2, inside buildSection)
const ds = storage.run.ds;
const tokenName = ds.tokensByValue[String(codeValue).toLowerCase()]; // e.g. "#0066ff" -> "color.action.primary.bg"
if (tokenName) {
  const token = penpotUtils.findTokenByName(tokenName);
  shape.applyToken(token, ["fill"]);            // verify resolvedValue in a LATER call
} else {
  ledger.proposedTokens.push({ from: codeValue, suggest: "propose a semantic token", tier: "semantic" });
}
return { applied: !!tokenName, codeValue };
```
```js
// Prefer an existing component over a raw shape
const role = "button";
const cat = storage.run.ds.componentsByRole[role];
let node;
if (cat) {
  const comp = penpot.library.local.components.find(c => c.id === cat.id);
  node = comp.instance();                         // instance, not a redrawn box
} else {
  node = penpot.createRectangle();                // bespoke only
}
container.appendChild(node);
return { role, usedComponent: !!cat, id: node.id };
```

## 15. Reference Resources
- `penpot_api_info("LibraryComponent")`, `penpot_api_info("Shape", "applyToken")`, `penpot_api_info("Board", "addFlexLayout")`, `penpot_api_info("Token", "resolvedValue")` — verify before use.
- `shared/penpot-mcp-tool-reference.md` (tool surface), `shared/plugin-api-gotchas.md` (traps), `shared/tokens-schema.json` (token types/tiers), `shared/naming-conventions.md`, `shared/state-management.md`.
- Related skills: `penpot-build-screen` (brief-driven generate flow), `penpot-foundations` (when the system lacks tokens to map onto — its infer mode), `penpot-audit-accessibility` (post-build contrast check).

## 16. Supporting Files
### references/
| File | Loaded during | Purpose |
|------|---------------|---------|
| `references/01-discovery.md` | Phase 0 | Enumerate tokens/components; build the reverse value→token index and component-by-role catalog; parse code into a section outline + style inventory. |
| `references/02-component-assembly.md` | Phase 2 | Decide instance-vs-shape; instantiate library components, set variants/props; assemble bespoke parts with flex. |
| `references/03-token-binding.md` | Phase 2 | Map code styles to semantic tokens; the `applyToken` property names; async verification; proposing new tokens. |
| `references/04-incremental-transform.md` | Phase 2 | The section-by-section loop, ordering, ledger updates, resumability. |
| `references/05-anti-rationalization.md` | All phases | Expanded countermeasures with concrete code-translation traps. |
| `references/06-error-recovery.md` | On failure | Diagnosing failed bindings, orphan values, flex/x-y conflicts, detach mishaps. |

### scripts/
| File | Phase | Purpose |
|------|-------|---------|
| `scripts/inspectDesignSystem.js` | 0 | Enumerate token sets/tokens and library components; build the value→token reverse index + component-by-role catalog; cache in `storage`. |
| `scripts/createScreenWrapper.js` | 1 | Idempotently create the screen Board with flex column and token-bound padding/gap. |
| `scripts/buildSection.js` | 2 | Build one section from a code fragment: instance components, create bespoke shapes, bind tokens. |
| `scripts/validateScreen.js` | 3 | Compute token coverage, list orphan raw values, check structure sanity (flex, names, instances). |
