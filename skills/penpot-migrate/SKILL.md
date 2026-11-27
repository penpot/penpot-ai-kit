---
name: penpot-migrate
description: "Migrate a Figma design into Penpot with high fidelity: Figma Auto Layout → Penpot flex/grid, Figma Variables → Penpot tokens, Figma component sets → Penpot variants, preserving hierarchy. Reads via the Figma MCP, writes via the Penpot MCP, through an intermediate representation (IR). Degrades to manually-pasted Figma data if the Figma MCP is absent. Triggers: 'migrate from Figma', 'import this Figma file into Penpot', 'move our Figma library to Penpot', 'recreate this Figma design in Penpot', 'Figma to Penpot'."
disable-model-invocation: false
version: 0.2.1
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

Bridge two MCP servers as a **migration engineer who prizes structural fidelity**: read a Figma design
through the Figma MCP, write it into Penpot through the Penpot MCP. Nothing is written to Penpot
straight from Figma data — the design is first normalized into an **intermediate representation (IR)**
and the IR is then translated into Penpot constructs (boards, flex/grid, tokens, components, variants).
Without the Figma MCP the skill works from a pasted Figma export or JSON.

**The one rule: IR before any Penpot write, and migrate in layers.** Tokens, then components, then
screens — each validated and approved before the next. The IR is the contract that decouples Figma's
model from Penpot's API, and the artifact a truncated session resumes from.

Tool surface: `shared/penpot-mcp-tool-reference.md`. API traps: `shared/plugin-api-gotchas.md` (the
`#n` below). Verify Penpot signatures with `penpot_api_info`; discover the Figma MCP's read tools from
its own instructions (their names vary by version — metadata, design context, variable definitions,
screenshots).

## Brief contract
- **Context** — source Figma file and scope, target Penpot file, fidelity expectations.
- **Objective** — "migrate <scope> from Figma to Penpot at <fidelity>".
- **Inputs** — Figma access (MCP or pasted export), naming and token mapping rules.
- **Constraints** — hierarchy, layout and variants preserved; Variables become tokens; spacing on the
  4px grid, with off-grid source values reported rather than silently rounded.
- **Acceptance Criteria** — IR built and approved; tokens migrated and resolving; components and
  variants reconstructed; screens match visually (export against the Figma screenshot); a fidelity
  report that lists every gap.

## Workflow
Before every ✋ checkpoint that shows visual work, run the export → look → fix loop of
`shared/visual-self-review.md` (max 2 self-fixes).

**Phase 0 — Figma analysis (read-only).** Read the source and inventory tokens, components and screens
(`scripts/analyzeFigmaStructure.js`, `references/01-figma-analysis.md`). On the Penpot side:
`high_level_overview`, `penpot.version`, existing tokens and components. Confirm the **target file and
instance** — when more than one Penpot server is connected, never assume (AGENTS.md §2). A migration
into a file that already has content deserves its own file: offer to create one
(`penpotMgmt`) rather than writing next to existing work. ✋ Scope and mapping rules.

**Phase 1 — Build the IR.** `scripts/buildIR.js` (`references/02-ir-building.md`). Plain data, no
Penpot writes: names normalized, Figma types mapped to Penpot token types, every layout number snapped
to the 4px grid (each snap recorded), and each value matched to a token by exact equality — what has
no token is listed in `gaps`. ✋ Review coverage, `fidelityNotes` and `gaps`.

**Phase 2 — Tokens.** `scripts/migrateTokens.js` (`references/03-token-migration.md`): literals →
`primitives`, color aliases and anything with a Figma mode → `modes/<mode>`, other aliases →
`semantic` — the set layout of `penpot-foundations`, creating only the sets that receive a token. An
existing token with a different value is returned in `conflicts`, never overwritten: resolve each with
the user. ✋ Review with `tokenOverview()`.

**Phase 3 — Components.** `scripts/migrateComponent.js` (`references/04-component-migration.md`):
component sets → one component per variant, then a variant container. Take a restore point first
(`await penpot.currentFile.saveVersion("before components — <RUN_ID>")`). ✋ Review.

**Phase 4 — Layout and screens.** Auto Layout → flex / grid (`references/05-layout-translation.md`);
one screen at a time with `scripts/migrateScreen.js` (`references/06-screen-migration.md`).
✋ Per screen, with its export next to the Figma screenshot.

**Phase 5 — Validate fidelity.** `scripts/validateFidelity.js` (`references/07-validation.md`): token
type / value / resolution, every variant combination, screen children and real instances, raw values
left on the canvas, `validate()` — plus everything the IR recorded (snaps, untokenized values,
unsupported features). `pass` means nothing is missing or wrong; the remaining gaps still go in the
fidelity report, next to the per-screen exports.
Problems along the way: `references/08-error-recovery.md`.

## Rules
1. **No Penpot write before the IR is approved.** Writing straight from Figma data couples the two
   models and loses information silently.
2. **Layer order: tokens → components → screens**, each validated. Never the whole file in one pass.
3. **Auto Layout becomes flex or grid.** Absolute positioning only where Figma itself used it —
   pixel-matching with `x`/`y` throws away the layout's behavior. Penpot containers are **Boards**.
4. **Variables become tokens, modes become sets/themes** — never hardcoded values. Bind shapes by
   token name; verify bindings in a later call and guard every apply (#2).
5. **Variants are version-gated (#12).** Prefer `penpotUtils.createVariantContainer([{ shape:
   mainInstance, properties }])`; on Penpot ≥ 2.20 behind a restore point and a `validate()` read;
   below 2.20 keep standalone `Component / Axis=Value` components unless the user works on a duplicate.
   Do not use `Board.combineAsVariants`.
6. **Names are mapped to the kit's conventions** (`shared/naming-conventions.md`): PascalCase
   components, `Property=Value` variants, semantic layers, dot-notation tokens.
7. **No Figma access, no guessing.** Ask for a pasted export or JSON and work from real data.
8. **Report fidelity gaps honestly.** Some Figma features do not map cleanly; never claim 1:1 when it
   is not.

## IR, mode and state
```
{ tokens:     [{ type, name, value, mode? }],
  components: [{ name, variantProps?, layout, children: […] }],
  screens:    [{ name, size, layout, children: […] }] }
```
Each node carries enough to build its Penpot equivalent (`layout` is a flex/grid spec; children
reference components or primitives).

Mode **review** (`shared/modes-and-policies.md`): component and variant restructuring and `detach()`
are never automatic.

Ledger under `RUN_ID` (`shared/state-management.md`): `phase`, `ir` (or a pointer to it),
`migrated: { tokens, components, screens }`, `restorePoints`, `gaps`. After truncation, re-read the IR
and the file's real state before continuing.

## Supporting files
- **references/** — `01-figma-analysis.md`, `02-ir-building.md`, `03-token-migration.md`,
  `04-component-migration.md`, `05-layout-translation.md`, `06-screen-migration.md`,
  `07-validation.md`, `08-error-recovery.md`.
- **scripts/** — `analyzeFigmaStructure.js`, `buildIR.js`, `migrateTokens.js`, `migrateComponent.js`,
  `migrateScreen.js`, `validateFidelity.js`.

**Doctrine paths.** `shared/…` and `policies/…` resolve inside this bundle in native installs (vendored by the installer); in a Claude Code plugin install they live at the plugin root — `${CLAUDE_PLUGIN_ROOT}/shared/…`, two directories up from this file.
