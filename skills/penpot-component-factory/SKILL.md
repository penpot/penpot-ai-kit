---
name: penpot-component-factory
description: "Build and maintain Penpot components with COMPLETE variant matrices — sizes, hierarchies, and all interactive states (default/hover/pressed/focus/disabled) — fully tokenized and correctly named. Use to create a new component with variants, fill in missing states, or normalize an existing component. Triggers: 'create a Button component with variants', 'build component variants', 'add hover/pressed/disabled states', 'make a variant matrix', 'turn this into a component with sizes', 'normalize this component'."
disable-model-invocation: false
version: 0.3.0
audiences: [design-system, product-designer]
mode-default: review
requires:
  - shared/penpot-mcp-tool-reference.md
  - shared/plugin-api-gotchas.md
  - shared/tokens-schema.json
  - shared/naming-conventions.md
  - shared/state-management.md
  - shared/modes-and-policies.md
  - shared/visual-self-review.md
  - shared/design-quality.md
---

# penpot-component-factory — complete, tokenized variants

Build components and their **full variant matrices** as a **senior component engineer**: a base
component as a flex Board with every value tokenized, one component per matrix cell, the cells grouped
into a variant container with named axes, and a completeness check at the end.

**The one rule: every interactive component ships every required state, and every value is a token.**
No missing `Hover` / `Pressed` / `Focus` / `Disabled` unless the system says otherwise; no hardcoded
fill or spacing. Build one step at a time and checkpoint before grouping.

Tool surface: `shared/penpot-mcp-tool-reference.md`. API traps: `shared/plugin-api-gotchas.md` (the
`#n` below). Verify signatures with `penpot_api_info("VariantContainer" | "Variants" | "LibraryComponent")`.

## Brief contract
- **Context** — the active design system / token sets; what the component is for.
- **Objective** — one component and its variant axes.
- **Inputs** — base layout, the token set (`penpot-foundations`), required axes.
- **Constraints** — all values tokenized; all required states present; `Property=Value` naming.
- **Acceptance Criteria** — matrix complete; zero hardcoded values; every state legible and
  AA-contrast; names follow the convention.

## Workflow
Before every ✋ checkpoint that shows visual work, run the export → look → fix loop of
`shared/visual-self-review.md` (max 2 self-fixes).

**Phase 0 — Discovery.** `high_level_overview`; read tokens (`tokenOverview()`), existing components,
and `penpot.version` (it decides Phase 3). Choose the axes (`references/01-variant-axes.md`).
✋ Confirm the axis matrix.

**Phase 1 — Base.** `scripts/buildComponentBase.js`: a flex Board with fill, radius, gap and padding
bound to tokens, registered with `createComponent` (`references/02-flex-grid-layout.md`). Missing
tokens come back in `exceptions` — propose them, do not hide them. ✋ Review the base export.

**Phase 2 — One component per cell.** `scripts/createVariants.js` clones the base for each cell,
creates a component from it and retokenizes the state on the new main instance. Verify bindings in the
next call. ✋ Review the cells.

**Phase 3 — Group, name axes, organize.** Version-gated (#12). `scripts/createVariantGroup.js` reads
`penpot.version`:
- **≥ 2.20.0** — takes a restore point (`saveVersion("before variants — …")`) and groups.
- **older** — returns `{ halted: true }` unless `storage.cf.fileDuplicatedConfirmed === true` (set it
  only after the user duplicated the file and accepted the risk); otherwise use the fallback.

It prefers `penpotUtils.createVariantContainer([{ shape: mainInstance, properties }])` (path
`"helper"`) and falls back to `penpot.createVariantFromComponents` + `renameProperty` / `addProperty` /
`setVariantProperty` (path `"legacy"`); `references/03-variant-api.md`. It clears the container's fill
(#11), gives it a flex layout, and returns `{ containerId, path, properties, components, restorePoint,
validation, next }`. In the *next* call read `penpot.currentFile.validate()` and each component's
`variantError`: anything non-empty → stop, report, offer the restore point. ✋ Review the container.

**Fallback (below 2.20, or a failed integrity check).** Skip the container. Keep the Phase 2 cells as
standalone components named `Component / Axis=Value, …`, arranged in a labeled grid; Penpot groups
them by the `/` prefix and the user can convert them to variants in the UI.

**Phase 4 — Validate.** `scripts/validateComponent.js` (every required state present, all values
tokenized, naming correct); optionally `scripts/switchVariantDemo.js`. Then the structured report.

## Rules
1. **States:** `Default / Hover / Pressed / Focus / Disabled` for every interactive component unless
   the system says otherwise — a missing state is an acceptance failure, not a follow-up.
2. **Zero hardcoded values.** Bind to semantic (or component) tokens; a state without a token gets a
   proposed one (`color.action.primary.hover.bg`), never a literal hex.
3. **Token binding (#2).** Verify in a later call; guard every apply (`shape.tokens[prop] !== tok.name`)
   — a clone inherits the base's bindings, so re-applying the same token to the `Default` cell would
   remove it.
4. **Variant mutation is version-gated (#12)** — restore point + `validate()` on ≥ 2.20; fallback or a
   user-made duplicate below it. On ≤ 2.16 it corrupted files.
5. **Naming:** component PascalCase (`Button`); variants `Property=Value` in PascalCase (`Size=Medium`,
   `State=Hover`); internal layers semantic (`label`, `icon`). A component created as `Group / Name` is
   stored with `name === "Name"` — match on the last segment.
6. **Flex Boards only** (`createBoard`, not `createFrame`); order children by append, size them through
   `layoutChild` after appending (#4, #15); absolute positioning only with `layoutChild.absolute` and a
   stated reason.
7. **The variant container gets a flex layout** — variants stack on one spot otherwise — and a cleared
   fill (#11).
8. **Keep the matrix as small as the design language uses.** Standard axes: `Size = Small | Medium |
   Large`, `Hierarchy = Primary | Secondary | Tertiary`, `State = …`, `Icon = None | Left | Right`.
9. **Idempotent.** Never duplicate an existing component or variant; `switchVariant(pos, value)` takes
   the property *index*, not its name. Do not use `Board.combineAsVariants` (listed, never verified).
10. **Detach only when necessary, and report it** (`references/04-instance-swap-detach.md`).

More excuses and countermeasures: `references/05-anti-rationalization.md`. Failures and fixes:
`references/06-error-recovery.md`.

## Mode and state
Mode **review**: component and variant restructuring and `detach()` are never auto-applied
(`shared/modes-and-policies.md`).

Ledger under `RUN_ID` (`shared/state-management.md`): `phase`, `baseComponentId`,
`created: [{ variant: "Size=Medium,State=Hover", id }]`, `restorePoints`, `exceptions`. After
truncation, re-read the components before continuing.

## Supporting files
- **references/** — `01-variant-axes.md`, `02-flex-grid-layout.md`, `03-variant-api.md`,
  `04-instance-swap-detach.md`, `05-anti-rationalization.md`, `06-error-recovery.md`.
- **scripts/** (paste into `execute_code`) — `buildComponentBase.js`, `createVariants.js` (one
  component per cell), `createVariantGroup.js` (version-gated), `switchVariantDemo.js`,
  `validateComponent.js`.

**Doctrine paths.** `shared/…` and `policies/…` resolve inside this bundle in native installs (vendored by the installer); in a Claude Code plugin install they live at the plugin root — `${CLAUDE_PLUGIN_ROOT}/shared/…`, two directories up from this file.
