/**
 * exportForCompare.js — Phase 2 of penpot-design-to-code-review
 *
 * PURPOSE
 *   Gather the shape id(s), bounds, and metadata the caller needs to render a
 *   comparison image. NOTE: exporting is done by the SEPARATE `export_shape` MCP
 *   tool, NOT from inside execute_code. This script only collects what to export
 *   (id, format hint, per-state boards) so the agent can then call:
 *       export_shape(shapeId | 'selection' | 'page', format='png', mode='shape')
 *
 * USAGE
 *   Paste into a single `execute_code` call after Phase 1. Read-only.
 *   Then, OUTSIDE this script, call the export_shape tool with the returned ids.
 *
 * INPUTS
 *   - The current selection. No placeholders required for the common case.
 *   - Optional: set STATE_AXIS to the variant property whose values are the
 *     states you want exported separately (e.g. "State"); leave "" to export the
 *     selection as one image.
 *
 * OUTPUT
 *   { ok, exportTargets:[{shapeId,name,kind,bounds,suggestedFormat,suggestedMode}],
 *     stateBoards:[...], notes }
 *
 * VERIFY-DON'T-GUESS
 *   - export_shape is a tool, not a method; do not try to call it here.
 *   - If unsure how variants expose their state values, check:
 *       penpot_api_info("Shape", "isComponentInstance")
 *       penpot_api_info("Component", "variants")
 */

const STATE_AXIS = ""; // REPLACE-ME-OPTIONAL e.g. "State" to export per-state boards

const sel = penpot.selection || [];
if (sel.length === 0) {
  return { ok: false, reason: "empty-selection",
           hint: "Select the component/board (Phase 0), then re-run." };
}

function boundsOf(s) {
  // bounds is the reliable read; width/height are read-only props.
  const b = s.bounds || null;
  return b ? { x: b.x, y: b.y, width: b.width, height: b.height }
           : { width: s.width ?? null, height: s.height ?? null };
}

// Primary export target: the whole selection (use 'selection' in the tool call),
// but also expose each top-level shape id in case the engineer wants them apart.
const exportTargets = sel.map(s => ({
  shapeId: s.id,
  name: s.name,
  kind: s.type,
  bounds: boundsOf(s),
  suggestedFormat: "png",   // svg also valid via the tool
  suggestedMode: "shape",   // 'fill' clips to fill geometry
}));

// If a state axis was given, try to find the per-state boards/variants so each
// state can be exported separately and paired with the code render of that state.
let stateBoards = [];
if (STATE_AXIS) {
  const candidates = [];
  for (const s of sel) {
    const kids = Array.isArray(s.children) ? s.children : [];
    for (const k of [s, ...kids]) {
      const n = (k.name || "");
      // variant boards commonly encode "State=Hover" in the name
      const m = n.match(new RegExp(`${STATE_AXIS}\\s*=\\s*([A-Za-z]+)`));
      if (m) candidates.push({ shapeId: k.id, name: n, state: m[1] });
    }
  }
  stateBoards = candidates;
}

const notes = [];
notes.push("Export with the export_shape TOOL (not execute_code): export_shape('selection','png','shape').");
if (STATE_AXIS && stateBoards.length === 0)
  notes.push(`No boards matched "${STATE_AXIS}=Value"; selection may not be a variant set or layers are auto-named.`);
notes.push("Ask the engineer for the rendered code/Storybook screenshot of each exported state to pair side-by-side.");

storage.run = storage.run || {};
storage.run.exportTargets = exportTargets;
storage.run.stateBoards = stateBoards;

return { ok: true, exportTargets, stateBoards, notes };
