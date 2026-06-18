# 03 — Renaming Strategy (Phase 2, writes)

> Loaded when Phase 2 runs. Goal: apply the approved rename map idempotently, top-down, in small validated batches, skipping main component shapes. The only mutation is `shape.name = "..."`.

## Preconditions

- Phase 1 checkpoint passed: `review` and `ambiguous` rows are approved (or dropped). `safe` rows are pre-approved by autofix mode but were still shown.
- `storage.run.renameMap` holds the approved map; the in-file ledger has `phase = "1"` → bump to `"2"` as you start.

## Batching order: top-down

Rename **parents before children**. Reasons:
- The layer tree stays coherent to a human watching mid-run.
- Ledger entries read in document order, which matches the export checkpoint.

Sort the approved map by tree depth ascending (root-most first). Apply ≤100 renames per `execute_code` call; write the ledger after each batch so a truncation mid-run is recoverable.

## The write itself

`shape.name` is a plain writable string — there is no `renameShape()` method. The write is **synchronous** (unlike token application), so you may read `shape.name` back in the **same** call to confirm it took. Resolve each shape with `penpotUtils.findShapeById(id)`.

```js
const shape = penpotUtils.findShapeById(id);
const old = shape.name;
shape.name = newName;          // synchronous
const ok = shape.name === newName;   // safe to verify in the same call
```

## Idempotency & skips

`scripts/renameLayer.js` enforces three guards before writing:

1. **Not found** → push to `errors` (shape may have moved/deleted; re-derive tree).
2. **Main component shape** (`isComponentMainInstance()` true — the main instance and everything inside it) → push to `skipped` with reason `main component`. Verify with `penpot_api_info('Board', 'isComponentMainInstance')`; renaming a main shape renames every instance and is out of safe-set. (Copy instances return false and may be renamed.)
3. **Already at target name** → push to `skipped` with reason `already named`. This is what makes re-running a batch a no-op.

Geometry is never touched — no `resize()`, no `setParentXY()`. If you noticed a geometry issue during inference, it is a note for the report, not an action here.

## Validation

After each batch:
- `export_shape('page', 'png', 'shape')` — or the specific renamed board's id — for a visual checkpoint.
- Optionally re-read the affected subtree with `penpotUtils.shapeStructure(root, 2)` to confirm names landed.
- Summarize `renamedCount / skippedCount / errorCount` and the before→after pairs.

✋ Checkpoint: show the export + counts; "looks good" approves **this batch only** — name the next batch before continuing.

## Ledger & resume

Write after every batch (see `shared/state-management.md`):

```js
const NS = "penpot-ai";
ledger.phase = 2;
ledger.created.push(...renamed.map(r => ({ kind: "rename", id: r.id, name: r.newName })));
penpot.currentFile.setSharedPluginData(NS, `${RUN_ID}.phase`, "2");
penpot.currentFile.setSharedPluginData(NS, `${RUN_ID}.ledger`, JSON.stringify(ledger));
```

Resume after truncation:
1. Read `${RUN_ID}.ledger`.
2. Re-derive the live tree with `shapeStructure` (do not trust memory).
3. Re-run remaining batches; idempotency makes already-applied renames no-ops.

## Final report (feeds the SKILL's Section 12 deliverable)

State: renamed count by bucket, skipped (main components, already-named), errors, any layers left unnamed and why, ambiguous rows the user resolved, and any scope cap (e.g. "only the current page; 2 other pages untouched"). Note that this file is now ready for `penpot-audit-accessibility` (heading hierarchy) and `penpot-design-to-code-review` (semantic mapping).
