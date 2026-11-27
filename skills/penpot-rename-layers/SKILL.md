---
name: penpot-rename-layers
description: "Semantically rename Penpot layers to HTML element names (nav, header, main, section, article, button, input, label, h1-h6, p, ul, li, img) or kebab-case role names, replacing auto-generated names like 'Rectangle 12'. Use to clean up layer naming, prepare a file for handoff, or as a precondition for accessibility audits (heading hierarchy) and design-to-code review (semantic mapping). Triggers: 'rename layers', 'semantic layer names', 'rename to HTML elements', 'clean up layer names', 'fix layer naming', 'add semantic names to layers', 'prepare layers for handoff'."
disable-model-invocation: false
version: 0.2.1
audiences: [design-system, product-designer, design-engineer, migration]
mode-default: autofix
requires:
  - shared/penpot-mcp-tool-reference.md
  - shared/plugin-api-gotchas.md
  - shared/tokens-schema.json
  - shared/naming-conventions.md
  - shared/state-management.md
  - shared/modes-and-policies.md
---

# penpot-rename-layers — semantic layer renaming

Give every layer the **semantic HTML element name** it represents (`nav`, `header`, `main`, `section`,
`button`, `input`, `label`, `h1`–`h6`, `p`, `ul`, `li`, `img`…) or, where no element fits, a
**kebab-case role name** (`card-grid`, `button-group`, `field-row`). Work as a design-systems engineer
who treats layer names as the contract between design and code. Semantic names are what the
accessibility audit reads heading order from, what design-to-code review maps onto elements, and what
makes a handoff legible.

A rename is a plain property write — `shape.name = "button"` — synchronous, and it touches no geometry.

**The one rule: plan first, and only auto-apply renames of auto-named layers.** Classify every layer,
show the before → after plan, then rename in batches:
- **auto-generated** (`Rectangle 12`, `Group 4`) → *safe*: renamed without asking (autofix).
- **custom** (a human's name, `Hero copy v2`) → *review*: never overwritten without approval.
- low-confidence inference → *ambiguous*: ask.
- **main component shapes** → never renamed: it would rename the component for every copy.

Tool surface: `shared/penpot-mcp-tool-reference.md`. API traps: `shared/plugin-api-gotchas.md`.

## Brief contract
- **Context** — product and surface, and who consumes the names next (audit, code review, handoff).
- **Objective** — "rename every auto-named layer in <scope> to its semantic element or role name".
- **Inputs** — scope (page / selected board / file), the live tree, `shared/naming-conventions.md`.
- **Constraints** — no main component shapes; no geometry; meaningful names preserved unless the user
  opts in; element names verbatim, role names kebab-case, never PascalCase (that is for components).
- **Acceptance Criteria** — 0 auto-generated names left in scope; every text layer acting as a heading
  is `h1`–`h6`; interactive containers are `button` / `input` / `select` / `label`; list containers are
  `ul` / `ol` with `li` children; every changed meaningful name has a recorded reason; 0 main component
  shapes renamed.

## Workflow
**Phase 0 — Discovery (read-only).** `high_level_overview`, then `scripts/inspectLayerStructure.js`
(`references/01-inspection.md`): per shape its id, name, type, `nameStatus`
(`auto-generated` | `semantic` | `custom`), size and position hints, child types, text properties and
component flags. Keep the inventory in `storage` (data only). ✋ Show inventory + stats; confirm scope.

**Phase 1 — Inference (no writes).** Apply `references/02-semantic-inference.md` to the inventory and
build the rename map `{ shapeId: { old, new, bucket: "safe" | "review" | "ambiguous", reason,
confidence } }`. ✋ Present the full before → after table grouped by bucket; get approval for the
*review* and *ambiguous* rows (safe rows are shown, not asked).

**Phase 2 — Renaming (batched).** `scripts/renameLayer.js` with the approved `RENAME_MAP`
(`references/03-renaming-strategy.md`): top-down, at most 100 per call, skipping main component shapes
and layers already at their target name; it returns before/after pairs. Write the ledger after each
batch. ✋ Export the renamed board (not `"page"`) with renamed / skipped / error counts.

## Rules
1. **The plan is shown before any write.** A wrong name misleads every downstream consumer silently.
2. **Autofix covers `auto-generated → semantic` only.** Any change to a meaningful name is review.
3. **Detect main components with `isComponentMainInstance()`** — true for the main instance *and
   everything inside it*; skip and report those. Copies (`isComponentCopyInstance()`) may be renamed.
   Do not test `isComponentInstance() === false`: the main instance is an instance too.
4. **Names only.** No `resize()`, no reparenting, no "while I'm here" padding fix — note the
   observation for another skill.
5. **Headings follow visual hierarchy, not font size alone:** one `h1` per region, then `h2`, `h3` in
   order. Several `h1`s defeat the audit this skill prepares for.
6. **Repeated siblings are a list:** container `ul` / `ol`, children `li` — not a row of `section`s.
   Siblings sharing an element get a descriptor: `button-primary`, `li-pricing`.
7. **Top-down and idempotent.** Parents before children; a re-run is a no-op for layers already at
   their target name (a failed call may have run — gotchas #19).
8. **Report scope caps** (sampled, top-N, skipped pages).

More excuses and their countermeasures: `references/04-anti-rationalization.md`.

## Mode and state
Mode **autofix**, narrowly (`shared/modes-and-policies.md`): only the *safe* bucket is applied without
asking; *review* and *ambiguous* rows wait for the Phase 1 approval; in **suggest** mode only the plan
is produced.

Ledger (`shared/state-management.md`, namespace `penpot-ai`, `RUN_ID` such as `rename-2026-06-05-a`):
`{ runId, phase, scope, renameMap, decisions, assumptions, pendingReview }`. Resume by reading the
ledger and re-reading the tree; idempotency makes re-running a batch safe.

## Supporting files
- `references/01-inspection.md` — traversal, name-status classification, component detection, scope.
- `references/02-semantic-inference.md` — inference rules, the output vocabulary, heading levels,
  ambiguity handling.
- `references/03-renaming-strategy.md` — batching, idempotency, validation, ledger and resume.
- `references/04-anti-rationalization.md` — excuses and countermeasures.
- `scripts/inspectLayerStructure.js` (Phase 0, read-only) · `scripts/renameLayer.js` (Phase 2).
- Verify `Board.isComponentMainInstance` / `isComponentCopyInstance` with `penpot_api_info("Board")`.

**Doctrine paths.** `shared/…` and `policies/…` resolve inside this bundle in native installs (vendored by the installer); in a Claude Code plugin install they live at the plugin root — `${CLAUDE_PLUGIN_ROOT}/shared/…`, two directories up from this file.
