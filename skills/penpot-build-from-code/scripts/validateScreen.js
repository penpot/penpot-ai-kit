/**
 * validateScreen.js  —  Phase 3 (Validation), read-only
 *
 * PURPOSE
 *   Prove the screen is on-system. Computes:
 *     - token COVERAGE: % of stylable properties (fill/stroke/radius/...) that are token-bound
 *     - ORPHAN raw values: shapes carrying a raw fill/stroke that matches NO bound token
 *     - STRUCTURE sanity: flex set on the board, no auto-named layers, components are instances,
 *       spacing on the 4px grid
 *   Run on the whole screen at Phase 3, or on a partial screen every few sections.
 *
 * USAGE
 *   Paste into a single execute_code call AFTER bindings have settled (token apply is async ~100 ms,
 *   so run this in a LATER call than the build). Read-only — mutates nothing.
 *
 * INPUTS  (placeholders)
 *   RUN_ID_HERE          — run slug (board id is read from storage / ledger).
 *   REPLACE-ME-minCoverage — acceptance threshold, e.g. 0.95.
 *
 * OUTPUT
 *   return { coverage, pass, orphans:[...], autoNamed:[...], offGrid:[...], rawShapesForComponentRoles:[...] }.
 *
 * NOTE
 *   Verify unfamiliar members with penpot_api_info (e.g. "Shape" tokens / isComponentInstance) if unsure.
 */

const RUN_ID = "RUN_ID_HERE";
const MIN_COVERAGE = Number("REPLACE-ME-minCoverage");   // e.g. 0.95

const boardId = storage.run && storage.run.boardId;
const board = boardId ? penpotUtils.findShapeById(boardId)
                      : penpotUtils.findShape(s => s.type === "board", penpot.currentPage.root);

const AUTO_NAME = /^(rectangle|board|group|ellipse|path|text|frame)\s*\d*$/i;
const STYLE_PROPS = ["fill", "stroke", "borderRadius", "strokeWidth", "fontSize", "fontFamily", "shadow", "opacity"];

let stylable = 0;        // count of style properties that COULD be tokenized
let bound = 0;           // count actually token-bound
const orphans = [];
const autoNamed = [];
const offGrid = [];

// collect every descendant shape
const shapes = penpotUtils.findShapes(() => true, board) || [];

for (const s of shapes) {
  // auto-named layers
  if (s.name && AUTO_NAME.test(s.name.trim())) autoNamed.push({ id: s.id, name: s.name });

  const tokenMap = s.tokens || {};

  // fills: each present fill is a stylable color slot
  if (Array.isArray(s.fills) && s.fills.length) {
    stylable++;
    if (tokenMap.fill) bound++;
    else orphans.push({ id: s.id, name: s.name, prop: "fill", rawValue: s.fills[0] && s.fills[0].fillColor });
  }
  // strokes
  if (Array.isArray(s.strokes) && s.strokes.length) {
    stylable++;
    if (tokenMap.stroke) bound++;
    else orphans.push({ id: s.id, name: s.name, prop: "stroke", rawValue: s.strokes[0] && s.strokes[0].strokeColor });
  }
  // radius
  if (typeof s.borderRadius === "number" && s.borderRadius > 0) {
    stylable++;
    if (tokenMap.borderRadius) bound++;
    else orphans.push({ id: s.id, name: s.name, prop: "borderRadius", rawValue: s.borderRadius });
  }

  // off-grid spacing on flex containers
  if (s.flex) {
    const vals = [s.flex.rowGap, s.flex.columnGap, s.flex.topPadding, s.flex.leftPadding, s.flex.rightPadding, s.flex.bottomPadding];
    for (const v of vals) if (typeof v === "number" && v % 4 !== 0) offGrid.push({ id: s.id, name: s.name, value: v });
  }
}

// structure sanity: board has flex?
const boardHasFlex = !!(board && board.flex);

// component-role parity: raw shapes whose name implies a role we HAVE a component for
const ds = (storage.run && storage.run.ds) || { componentsByRole: {} };
const roles = Object.keys(ds.componentsByRole || {});
const rawShapesForComponentRoles = [];
for (const s of shapes) {
  if (s.isComponentInstance && s.isComponentInstance()) continue;   // instances are fine
  const n = String(s.name || "").toLowerCase();
  for (const role of roles) {
    if (n.includes(role) && s.type !== "board") {
      rawShapesForComponentRoles.push({ id: s.id, name: s.name, role });
      break;
    }
  }
}

const coverage = stylable === 0 ? 1 : bound / stylable;
const pass = coverage >= MIN_COVERAGE
  && orphans.length === 0
  && autoNamed.length === 0
  && offGrid.length === 0
  && boardHasFlex
  && rawShapesForComponentRoles.length === 0;

return {
  runId: RUN_ID,
  coverage: Number(coverage.toFixed(3)),
  threshold: MIN_COVERAGE,
  pass,
  stylableProps: stylable,
  boundProps: bound,
  boardHasFlex,
  orphans,
  autoNamed,
  offGrid,
  rawShapesForComponentRoles
};
