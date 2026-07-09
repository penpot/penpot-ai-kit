---
name: penpot-rename-layers
description: "Semantically rename Penpot layers to HTML element names (nav, header, main, section, article, button, input, label, h1-h6, p, ul, li, img) or kebab-case role names, replacing auto-generated names like 'Rectangle 12'. Use to clean up layer naming, prepare a file for handoff, or as a precondition for accessibility audits (heading hierarchy) and design-to-code review (semantic mapping). Triggers: 'rename layers', 'semantic layer names', 'rename to HTML elements', 'clean up layer names', 'fix layer naming', 'add semantic names to layers', 'prepare layers for handoff'."
disable-model-invocation: false
version: 0.2.0
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

# Semantic Layer Renaming

## 1. Title + How it works

This skill renames the layers of a Penpot file so each layer carries the **semantic HTML element name** it represents (`nav`, `header`, `main`, `section`, `article`, `button`, `input`, `label`, `h1`–`h6`, `p`, `ul`, `li`, `img`) or, where no element fits, a **kebab-case role name** (`card-grid`, `button-group`, `field-row`). Semantic names are a *precondition* for accessibility audits (a heading hierarchy can only be read off named `h1`–`h6` layers), for design-to-code review (the reviewer maps `button` → `<button>`), and for clean handoff.

Every mutation goes through `execute_code`; validate visually with `export_shape`; read structure with `penpotUtils.shapeStructure` (full tool surface: `shared/penpot-mcp-tool-reference.md`). A rename is just `shape.name = "..."` — there is no `renameShape()` API.

## 2. The One Rule That Matters Most

**Never one-shot the whole file.** Inspect read-only first, classify every layer into one of three buckets — *auto-named* (safe to autofix), *meaningfully-named* (needs review), *ambiguous* (needs the user) — then rename in small, validated batches. Renaming an **auto-named** layer (`Rectangle 12` → `button`) is in the safe-set and may be applied without asking. Renaming a layer that **already has a meaningful name** is a judgement call and **always requires review**. Renaming a **main component shape** is forbidden by default (it changes the name for every instance). One logical batch per `execute_code` call; checkpoint between batches.

## 3. Penpot MCP Tool Reference

Full surface: `shared/penpot-mcp-tool-reference.md`. The domain-specific calls:

| Call | Use |
|------|-----|
| `penpotUtils.findShapes(pred, root)` / `findShapeById(id)` | Collect the inventory; resolve a shape id for renaming. |
| `penpotUtils.analyzeDescendants(root, evaluator, maxDepth)` | Walk the tree carrying parent context into the classifier. |
| `shape.name = "..."` (via `execute_code`) | The rename itself — a plain property write; no rename method exists. |
| `export_shape(shapeId, 'png', 'shape')` | Visual checkpoint of a renamed region. |
| `penpot_api_info('Board')` | Verify `name`, `isComponentMainInstance()`, `isComponentCopyInstance()` before relying on them. |

## 4. Plugin API Essentials

Domain-relevant facts and gotchas (full list in `shared/plugin-api-gotchas.md`):

- **`shape.name` is a plain writable string.** Rename with `shape.name = "button"`. There is no rename method. The write is synchronous — unlike token application, you may read `shape.name` back in the same call to confirm.
- **Renaming touches no geometry** — it does not move, resize, or reparent anything. This is exactly why renaming auto-named layers is reversible and safe.
- **Component main shapes:** detect with `shape.isComponentMainInstance()` — it returns true for the main instance **and every shape nested inside it**. Renaming any of those renames the component for all copies — out of safe-set. Copy instances (`isComponentCopyInstance()` true) may be renamed. NOTE: the main instance is *also* an instance, so `isComponentInstance()` is true for it too — do **not** use `isComponentInstance() === false` to detect main shapes (that was a real bug). Verify with `penpot_api_info('Board', 'isComponentMainInstance')` before branching.
- **#5 `width`/`height`/`parentX`/`parentY` are read-only** — irrelevant to renaming; do not "fix" geometry while you are in here (different skill, never auto-fix).
- Return small structured objects (counts + ids + before/after pairs).
- When unsure of any signature, call `penpot_api_info` — guessing is the top source of silent failures.

## 5. Token-Aware Brief Contract

Before renaming, restate the request as a contract. Act as **a senior design-systems engineer who treats layer names as the contract between design and code, never ships an auto-generated name, and never overwrites a human's deliberate name without asking.**

- **Context** — product and surface (e.g. "marketing landing page", "settings screen"); who consumes the names next (accessibility audit, code review, handoff).
- **Objective** — single and specific: "rename every auto-named layer on the current page to its semantic HTML element or a kebab-case role name."
- **Inputs** — scope (current page / selected board / whole file), the live layer tree from Phase 0, and `shared/naming-conventions.md` (the layer-naming section).
- **Constraints** — never rename main component shapes; never touch geometry; preserve already-meaningful names unless the user opts in; semantic HTML names verbatim, role names in kebab-case; no PascalCase on layers (that is for components).
- **Acceptance Criteria** (quantitative) — 0 auto-generated names remain in scope; 100% of text layers that act as headings carry an `h1`–`h6` name; every interactive container is `button` / `input` / `select` / `label`; every list container is `ul`/`ol` with `li` children; every meaningfully-named layer that was changed has a recorded justification; 0 main component shapes renamed.

## 6. Mandatory Workflow

### Phase 0 — Discovery (read-only)
- **Goal:** load guidance and build a complete layer inventory; classify each layer's *name status*.
- **Steps:** call `high_level_overview` once. Then `execute_code` with `scripts/inspectLayerStructure.js` to collect, per shape: `id`, `name`, `type`, `nameStatus` (`auto-generated` | `semantic` | `custom`), position/size hints, child types, text props (`fontSize`/`fontWeight`/`characters`), fill/stroke flags, and `isComponentInstance()`. Cache the inventory in `storage`.
- **Exit criterion:** a flat inventory with per-layer `nameStatus` and stats (`autoGenerated`, `alreadySemantic`, `custom`, `componentInstances`, `textNodes`).
- ✋ **Checkpoint:** show the inventory + stats; confirm scope (page / board / file) before inference.

### Phase 1 — Semantic inference (analysis, no writes)
- **Goal:** produce a before→after rename plan with a confidence and a bucket per row.
- **Steps:** apply the inference rules in `references/02-semantic-inference.md` locally to the cached inventory. Assign each row a bucket: **safe** (auto-named → rename), **review** (meaningful name → proposed change), **ambiguous** (low confidence → ask). Record a one-line reason per row.
- **Exit criterion:** a rename map `{ shapeId: { old, new, bucket, reason, confidence } }`, with ambiguous rows isolated.
- ✋ **Checkpoint:** present the full before/after table grouped by bucket; get approval for the *review* and *ambiguous* rows. (Safe rows are pre-approved by autofix mode but are still shown.)

### Phase 2 — Renaming (writes, batched)
- **Goal:** apply the approved map idempotently, top-down (parents before children), one batch per call.
- **Steps:** paste `scripts/renameLayer.js` with the approved `RENAME_MAP`. The script skips main component shapes, skips layers already at the target name, and returns before/after pairs. Batch ≤100 per call. Write the ledger after each batch.
- **Exit criterion:** every approved row applied or explicitly skipped (with reason); 0 errors, or errors reported.
- ✋ **Checkpoint:** `export_shape('page','png','shape')` (or the renamed board) plus a renamed-count summary; sign-off.

## 7. Critical Rules

1. **Show the full rename plan before any write.** Layer names feed handoff, code export, and audits; a wrong name corrupts a downstream workflow silently.
2. **Autofix only auto-applies `auto-generated → semantic` renames.** Any change to a layer with a meaningful name is *review*, always.
3. **Never rename a main component shape.** Branch on `isComponentMainInstance()` (true for the main instance and its internals); those are skipped and reported. Copy instances may be renamed.
4. **Rename top-down.** Parents before children, so the tree reads coherently mid-run and ledgers stay legible.
5. **Idempotent.** Re-running must be a no-op for layers already at their target name.
6. **Geometry is untouchable here.** This skill writes `shape.name` and nothing else. No `resize()`, no reparenting.
7. **Semantic HTML names verbatim, role names kebab-case, never PascalCase.** `h1`, `nav`, `button`, `card-grid` — not `H1`, `CardGrid`.
8. **Report scope caps.** If you sampled, capped to top-N, or skipped a page, say so in the final report.

## 8. Domain Architecture

The artifacts this skill produces:

**Name-status buckets** (the inventory's spine):
- `auto-generated` — matches `^(Board|Frame|Rectangle|Group|Ellipse|Text|Path|Bool|Image|Component|Vector)\s*\d*$`. Safe-set; autofixable.
- `semantic` — already a valid HTML element or known role name. Left alone unless wrong.
- `custom` — a human-authored non-semantic name (`Hero copy v2`). Review before overwriting.

**Rename map row:** `{ shapeId, old, new, bucket: 'safe'|'review'|'ambiguous', reason, confidence: 0..1 }`.

**Naming output vocabulary:**
- Structural: `header`, `nav`, `main`, `section`, `article`, `aside`, `footer`, `form`, `dialog`, `figure`.
- Interactive: `button`, `input`, `select`, `label`, `a`.
- Text: `h1`–`h6`, `p`, `small`, `caption`, `span`.
- Lists/media: `ul`, `ol`, `li`, `img`, `svg`, `icon`, `hr`.
- Role containers (kebab-case): `card-grid`, `button-group`, `field-row`, `avatar-stack`, `nav-list`.
- Disambiguating descriptor when siblings share an element: `button-primary`, `button-ghost`, `li-pricing`.

## 9. Modes & Policies

See `shared/modes-and-policies.md`. This skill's `mode-default` is **autofix**, but narrowly:

- **Suggest:** produce the rename plan only; touch nothing.
- **Review (Apply-with-review):** the default for *any* layer that already has a meaningful name, and for all ambiguous rows. Apply after the Phase 1 checkpoint.
- **Autofix (safe-set only):** **renaming an unnamed / auto-named layer** to a semantic name — non-destructive, reversible, unambiguous — is the one change auto-applied without asking. Everything else falls back to review. Renaming main component shapes is never auto-applied (it is excluded entirely). Geometry, variant/component restructuring, `detach()`, and new tokens are all out of scope here and never auto-fixed.

## 10. State Management

See `shared/state-management.md`. Authoritative ledger via `setSharedPluginData` (namespace `penpot-ai`), keyed by `RUN_ID` (e.g. `rename-2026-06-05-a`); session cache via `storage`.

Ledger keys:
- `${RUN_ID}.phase` — `"0"|"1"|"2"`.
- `${RUN_ID}.ledger` — JSON `{ runId, phase, scope, renameMap, created:[], decisions:[], assumptions:[], pendingReview:[] }`.
- `storage.run.inventory` — cached Phase 0 inventory.
- `storage.run.renameMap` — the approved map.

Resume: re-read the in-file ledger, re-derive the live tree with `shapeStructure`, then continue from `ledger.phase`. Idempotency (skip layers already at target) makes re-running a batch safe.

## 11. User Checkpoints

| After phase | Artifacts shown | What we ask |
|-------------|-----------------|-------------|
| 0 — Discovery | Layer inventory + name-status stats; resolved scope | "Is this the right scope (page / board / file)? Proceed to inference?" |
| 1 — Inference | Full before→after table grouped by bucket (safe / review / ambiguous), confidence + reason per row | "Approve the *review* and *ambiguous* renames? Any names to override?" |
| 2 — Renaming | `export_shape` of the renamed region + renamed/skipped/error counts | "Names look right? Approve this batch; proceed to the next?" |

## 12. Naming Conventions

Authoritative source: `shared/naming-conventions.md` (the *Layers* section). Domain specifics:
- Prefer the **semantic HTML element name** verbatim; fall back to a **kebab-case role name** only when no element fits.
- Add a **kebab-case descriptor** when siblings share an element: `button-primary`, `button-secondary`, `li-home`, `li-about`.
- Headings get the level that matches the visual hierarchy of the page, not just font size — see `references/02-semantic-inference.md` on heading-level ordering.
- Never ship `Rectangle 12`, `Group 4`, `Board`. Never PascalCase a layer (PascalCase is reserved for components).

## 13. Anti-Rationalization Table

| Excuse the LLM makes | Why it's wrong | Deterministic countermeasure |
|----------------------|----------------|------------------------------|
| "This layer already has a name, I'll just improve it while I'm here." | A human's deliberate name is not in the safe-set; silently overwriting it loses intent and is irreversible without the ledger. | Bucket it as **review**. Do not auto-apply. Show old→new at the Phase 1 checkpoint and wait for approval. |
| "It's clearly a button — I'll also tighten its padding/size." | This skill writes `shape.name` only. Geometry changes are never auto-fix and belong to another skill. | Halt. Rename only. Record the geometry observation as a note for review; do not call `resize()`/`setParentXY`. |
| "Renaming the component's main shape is the same as renaming an instance." | Renaming the main shape renames the component for **every** instance across the file — a shared-asset edit, never auto-fix. | Branch on `isComponentMainInstance()`. Skip the main instance and everything inside it; report as `skipped: main component`. |
| "I'll label every big text `h1` by font size alone." | Multiple `h1`s break heading hierarchy and fail the a11y precondition this skill exists to satisfy. | Order headings by visual prominence: one `h1` per region, descending `h2`/`h3`. Use the level rules in `references/02-semantic-inference.md`. |
| "These three repeated cards are each a `section`." | Repeated siblings in a list are `li` inside a `ul`, not standalone `section`s; mis-labeling corrupts the code-review mapping. | Detect repetition by sibling count + matching structure; name the container `ul` and children `li` (with descriptors). |
| "I'll rename the whole tree in one execute_code call to be fast." | One-shotting defeats checkpoints and makes a bad inference unrecoverable mid-run. | Batch ≤100 per call, top-down, write the ledger between batches. |

## 14. Helper Code Snippets

Classify a name (used in inspection):
```js
const isAutoGenerated = n =>
  /^(Board|Frame|Rectangle|Group|Ellipse|Text|Path|Bool|Image|Component|Vector)\s*\d*$/i.test(n || "");
const isSemantic = n =>
  /^(header|footer|nav|main|section|article|aside|form|dialog|figure|button|input|select|label|a|h[1-6]|p|small|caption|span|ul|ol|li|img|svg|icon|hr)([-_ ].*)?$/i.test(n || "");
const nameStatus = n => isSemantic(n) ? "semantic" : isAutoGenerated(n) ? "auto-generated" : "custom";
```

Rename one shape safely (idempotent, skips main components):
```js
const shape = penpotUtils.findShapeById("REPLACE-ME-SHAPE-ID");
let result;
if (!shape) result = { error: "not found" };
else if (shape.isComponentMainInstance && shape.isComponentMainInstance())
  result = { skipped: "main component", name: shape.name };  // true for the main instance AND its internals
else if (shape.name === "button") result = { skipped: "already named", name: shape.name };
else { const old = shape.name; shape.name = "button"; result = { old, new: shape.name }; }
return result;
```

## 15. Reference Resources

- `penpot_api_info('Board')` — confirm `name` is writable and inspect `isComponentMainInstance()`, `isComponentCopyInstance()`, `detach()`.
- `penpot_api_info('PenpotPage')` and `penpotUtils.shapeStructure` for tree traversal.
- `shared/naming-conventions.md` — the canonical layer-naming rules.
- `shared/modes-and-policies.md` — the exact safe-set definition this skill relies on.
- Related skills: `penpot-audit-accessibility` (consumes heading names), `penpot-design-to-code-review` (consumes semantic names). Run this skill first.

## 16. Supporting Files

### References (progressive disclosure)

| File | Read during | Covers |
|------|-------------|--------|
| `references/01-inspection.md` | Phase 0 | Read-only traversal, name-status classification, component detection, scope selection. |
| `references/02-semantic-inference.md` | Phase 1 | Inference rules (structure / interactive / text / media / lists), heading-level ordering, ambiguity handling. |
| `references/03-renaming-strategy.md` | Phase 2 | Top-down batching, idempotency, main-component skip, validation, ledger + resume. |

### Scripts (paste into `execute_code`)

| Script | Phase | Purpose |
|--------|-------|---------|
| `scripts/inspectLayerStructure.js` | 0 | Read-only inventory with `nameStatus` + inference signals. |
| `scripts/renameLayer.js` | 2 | Apply the approved `RENAME_MAP` idempotently; skip main components; return before/after. |
