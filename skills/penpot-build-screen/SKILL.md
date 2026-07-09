---
name: penpot-build-screen
description: "Design production-grade screens in Penpot from a brief, as a senior visual designer — reusing the existing design system (tokens + components) and assembling section by section, never one-shot. Use to create a screen/page/landing/dashboard from a description. NOT for translating existing code (use penpot-build-from-code). Triggers: 'design a dashboard', 'create a landing page', 'design this app screen', 'build a UI from this brief', 'design a settings page', 'mock up a screen in Penpot'."
disable-model-invocation: false
version: 0.2.0
audiences: [product-designer]
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

# penpot-build-screen — brief to on-system screen

## 1. Title + How it works
`penpot-build-screen` turns a brief into a crafted, on-system screen; every mutation goes through
`execute_code`; validate visually with `export_shape`; read structure with
`penpotUtils.shapeStructure` (full tool surface: `shared/penpot-mcp-tool-reference.md`). It first
discovers the existing design system (tokens + components via `penpot-foundations` / the local
library), then builds the screen **section by section** inside flex Boards, binding tokens and reusing
components — never generating an entire screen in one call.

## 2. The One Rule That Matters Most
**Reuse the system; build incrementally.** Prefer existing components and semantic tokens over raw
shapes. Build one section, checkpoint with an `export_shape`, then continue. If no system exists,
bootstrap only a minimal one (hand off to `penpot-foundations` for anything substantial).

## 3. Penpot MCP Tool Reference
Full surface: `shared/penpot-mcp-tool-reference.md`. Key calls: `penpot.createBoard()`/`addFlexLayout()`
for the screen and sections; `penpot.library.local.components` + `comp.instance()` to reuse components;
`shape.applyToken` for token binding; `export_shape('selection'|'page')` at checkpoints.

## 4. Plugin API Essentials
Gotcha numbers refer to `shared/plugin-api-gotchas.md`.
- Screen and sections are **Boards** with flex layout; compose with append order + gaps + align/justify.
- Reuse components via `component.instance()`; don't redraw system parts as raw shapes.
- **#3 text auto-sizing** — set `growType` to `auto-width`/`auto-height` AFTER any `resize()` (which forces `fixed`).
- **#4 flex overrides child x/y** — use `layoutChild` for stretch/margins.
- Bind colors/spacing/radius/type to **semantic tokens**, never hardcoded.
- **#11 every new Board is born with an OPAQUE WHITE fill — this skill's critical failure mode.** `createBoard()` ships `fills = [{ fillColor: "#FFFFFF", fillOpacity: 1 }]`; left in place, a structural wrapper's square white corners poke out behind rounded children (radius looks broken), and layout boards keeping the literal white never flip in dark mode (no token, off-system). **Fill policy:** decide per board — a **structural** board (layout-only chrome: sections, rows, wrappers) gets `board.fills = []`; a **surface** (screen bg, card, sheet, button) binds a `color.bg.*` token, never a literal. Default layout containers to transparent (`shared/modes-and-policies.md`).
- Verify unfamiliar signatures with `penpot_api_info` first.

## 5. Token-Aware Brief Contract
- **Context** — product, audience, platform, brand mood.
- **Objective** — the single screen and its primary user goal.
- **Inputs** — content/sections, existing tokens & components, style profile, viewport size.
- **Constraints** — use existing components; on-grid spacing; semantic tokens only; forbidden patterns.
- **Acceptance Criteria** — clear hierarchy; 4px rhythm; AA contrast; reuses system; responsive intent stated.

Act as a **senior product/visual designer** who makes deliberate aesthetic decisions, not generic ones.

## 6. Mandatory Workflow

> **Visual self-review (mandatory):** before every ✋ checkpoint that shows visual work,
> run the export → look → fix loop from `shared/visual-self-review.md` — export the unit you
> just built, inspect the image yourself against the checklist, fix visible defects (max 2
> iterations), and present that same export with any remaining defects named.

**Phase 0 — Discovery.** `high_level_overview`; inventory tokens/components (`scripts/setupOrReuseSystem.js`); analyze the brief (`references/01-brief-analysis.md`); pick a style profile (`references/02-style-profiles.md`). ✋ Checkpoint: confirm brief + style + section list.

**Phase 1 — Frame.** Create the screen Board with flex (`scripts/setupOrReuseSystem.js` returns ids). Set viewport size. ✋ Checkpoint.

**Phase 2..N — Sections.** Build each section as a tokenized flex Board reusing components (`scripts/buildSection.js`). One section per `execute_code` call. ✋ Checkpoint after each (`export_shape`).

**Phase N+1 — Assemble & critique.** `scripts/assembleScreen.js` composes sections; `scripts/auditScreenQuality.js` checks **layout coverage (every board has flex/grid)**, token binding, on-grid spacing, naming (`references/05-critique-framework.md`). A non-empty `boardsWithoutLayout` fails the gate — add a layout to each flagged board before reporting done. Report.

## 7. Critical Rules
1. **Flex by default — every container is a layout Board.** The instant you create a Board, give it a
   flex (`addFlexLayout()`) or grid (`addGridLayout()`) layout *before* appending children — the screen
   root, every section, AND every nested grouping (card, row, list, stat cluster, form field, button
   group). NEVER arrange UI elements with absolute `x`/`y`, and NEVER use a plain Group to lay out UI.
   A Board without a layout is a bug; the Phase N+1 audit (`boardsWithoutLayout`) fails the build if any exist.
2. Reuse existing components before creating raw shapes.
3. Bind to semantic tokens; never hardcode color/spacing/radius/type.
4. One section per call; checkpoint with `export_shape`.
5. All spacing on the 4px grid; consistent rhythm.
6. Don't bootstrap a full design system here — hand off to `penpot-foundations`.
7. State responsive intent (sizing: fill/auto/fix) explicitly.

## 8. Domain Architecture
A screen = a root flex Board (column) → section Boards (each its own flex) → component instances +
tokenized primitives. Composition follows a clear visual hierarchy: primary action prominent, content
grouped, whitespace on the spacing scale, type from the semantic type tokens.

## 9. Modes & Policies
Default **review**. Geometry/layout changes always require a checkpoint (`shared/modes-and-policies.md`).

## 10. State Management
Ledger under `RUN_ID`: `phase`, `screenBoardId`, `sections:[{name,id,done}]`, `styleProfile`. Resume by re-reading structure.

## 11. User Checkpoints
| After phase | Artifacts | Ask |
|-------------|-----------|-----|
| 0 | brief + style + sections | Approve direction? |
| 1 | empty frame `export_shape` | Approve frame/viewport? |
| each section | section `export_shape` | Approve section? |
| assemble | full screen `export_shape` + critique | Approve / iterate? |

## 12. Naming Conventions
`shared/naming-conventions.md`: layers semantic HTML (`header`, `main`, `section`, `nav`, `button`); screen Board named for the view (`Dashboard`).

## 13. Anti-Rationalization Table
| Excuse | Why it's wrong | Countermeasure (halt) |
|--------|----------------|------------------------|
| "I'll draw a quick button instead of using the component." | Raw shapes drift from the system. | Instantiate the existing component; reuse beats reinvention. |
| "Hardcode this spacing/color, faster." | Breaks rhythm/theming/governance. | Bind to semantic tokens; snap spacing to 4px. |
| "Generate the whole screen in one go." | One-shot output is generic and unauditable. | Build section by section with checkpoints. |
| "Centered cards + generic gradient looks fine." | Distributive convergence → bland, off-brand UI. | Apply a deliberate style profile; justify aesthetic choices. |
| "I'll set up tokens here real quick." | Foundations belong in their skill. | Hand off to `penpot-foundations` for anything beyond trivial. |
| "I'll just position these with x/y, it's faster." | Absolute coords don't resize, reflow, or theme; off-system. | Wrap them in a flex/grid Board; order by append + gaps/align. |
| "A plain Group is enough to bunch these together." | Groups don't lay out — they only bound. | Use a Board with `addFlexLayout()`; the audit flags layout-less boards. |
| "This little container doesn't need a layout." | Every UI container needs one for rhythm + responsiveness. | Add flex/grid before appending children — no exceptions. |

## 14. Helper Code Snippets
```js
// Screen frame (Phase 1)
const screen = penpot.createBoard();
screen.name = "Dashboard";
screen.resize(1440, 1024);
const flex = screen.addFlexLayout();
flex.dir = "column"; flex.rowGap = 24;
flex.topPadding = flex.bottomPadding = 32; flex.leftPadding = flex.rightPadding = 32;
flex.horizontalSizing = "fix"; flex.verticalSizing = "auto";
// FILL POLICY (gotchas #11): the screen root is THE one surface — bind its bg to a token so it flips in
// dark mode. Every section nested inside stays transparent (buildSection.js clears their default white).
screen.fills = [];                                   // drop Penpot's default opaque #FFFFFF
const bg = penpotUtils.findTokenByName("color.bg.default");
if (bg) screen.applyToken(bg, ["fill"]);             // bound surface, not a literal
penpot.currentPage.root.appendChild(screen);
storage.bs = { screenBoardId: screen.id };
return { screen: screen.id, bgBound: !!bg };
```

## 15. Reference Resources
- `penpot_api_info('Board')`, `penpot_api_info('LibraryComponent')`, `penpot_api_info('Text')`.

## 16. Supporting Files
**references/**: `01-brief-analysis.md`, `02-style-profiles.md`, `03-layout-composition.md`, `04-component-recipes.md`, `05-critique-framework.md`, `06-anti-rationalization.md`, `07-error-recovery.md`.
**scripts/**: `setupOrReuseSystem.js`, `buildSection.js`, `assembleScreen.js`, `auditScreenQuality.js`.
