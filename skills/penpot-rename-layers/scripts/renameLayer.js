/**
 * renameLayer.js  —  Phase 2 (writes)
 *
 * PURPOSE: Apply the approved before→after rename map to shapes. The ONLY mutation
 *          is `shape.name = "..."`. Idempotent, top-down, and safe by construction:
 *          skips main component shapes and layers already at their target name.
 *
 * USAGE:   Paste into a single `execute_code` call AFTER the Phase 1 checkpoint
 *          approved the plan. For >100 renames, split RENAME_MAP into batches and
 *          run one batch per call (parents before children).
 *
 * INPUTS:  RUN_ID_HERE  — short stable slug (e.g. "rename-2026-06-05-a").
 *          RENAME_MAP   — { shapeId: "new-name", ... } from the approved Phase 1 plan.
 *
 * OUTPUT:  { runId, renamedCount, skippedCount, errorCount, renamed, skipped, errors }
 *
 * NOTE: `shape.name` is a plain writable string (no renameShape() API) and the write
 *       is synchronous, so verifying in this same call is fine. Verify the
 *       instance/main-component branch with penpot_api_info('PenpotShape',
 *       'isComponentInstance') if unsure. Geometry is never touched here.
 */

const RUN_ID = "RUN_ID_HERE";        // REPLACE-ME

// ── REPLACE-ME: shapeId → approved new name (from Phase 1, ordered parents-first) ──
const RENAME_MAP = {
  "SHAPE_ID_1": "header",
  "SHAPE_ID_2": "nav",
  "SHAPE_ID_3": "button-primary",
  "SHAPE_ID_4": "h1",
  "SHAPE_ID_5": "p",
  // ... full approved list
};
// ───────────────────────────────────────────────────────────────────────────────

const renamed = [];
const skipped = [];
const errors = [];

function isMainComponentShape(shape) {
  try {
    // The main instance AND every descendant inside it return isComponentMainInstance() === true.
    // Renaming any of them changes the component for all copies -> never in the safe-set.
    // (Copy instances return false here and MAY be renamed, per the skill.)
    if (typeof shape.isComponentMainInstance === "function") return !!shape.isComponentMainInstance();
    // fallback (older API): a main shape exposes a component but is not itself a copy instance
    const instance = typeof shape.isComponentInstance === "function" && shape.isComponentInstance();
    const hasComponent = typeof shape.component === "function" && !!shape.component();
    return hasComponent && !instance;
  } catch (e) {
    return false;
  }
}

for (const [shapeId, newName] of Object.entries(RENAME_MAP)) {
  // resolve the live shape (re-derived each run — never trust a stale reference)
  const shape = penpotUtils.findShapeById(shapeId);

  if (!shape) {
    errors.push({ id: shapeId, error: "shape not found (moved or deleted) — re-inspect" });
    continue;
  }

  // SAFE-SET GUARD: never rename a main component shape (changes every instance)
  if (isMainComponentShape(shape)) {
    skipped.push({ id: shapeId, name: shape.name, reason: "main component — out of safe-set" });
    continue;
  }

  // IDEMPOTENCY GUARD: already at target → no-op
  if (shape.name === newName) {
    skipped.push({ id: shapeId, name: shape.name, reason: "already named" });
    continue;
  }

  try {
    const oldName = shape.name;
    shape.name = newName;                 // synchronous write
    const applied = shape.name === newName;
    if (applied) {
      renamed.push({ id: shapeId, oldName, newName });
    } else {
      errors.push({ id: shapeId, oldName, newName, error: "name did not persist" });
    }
  } catch (e) {
    errors.push({ id: shapeId, oldName: shape.name, newName, error: e.message });
  }
}

return {
  runId: RUN_ID,
  renamedCount: renamed.length,
  skippedCount: skipped.length,
  errorCount: errors.length,
  renamed,
  skipped,
  errors,
};
