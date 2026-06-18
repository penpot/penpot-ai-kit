/**
 * auditScreenQuality.js
 * Purpose: quick quality pass — LAYOUT coverage (flex/grid on every board), token binding, off-grid spacing, naming.
 * Usage:   paste into execute_code (Phase N+1). Read-only. For full a11y use penpot-audit-accessibility.
 * Input:   SCREEN_ID, GRID.
 * Output:  { boardsWithoutLayout:[...], rawFills:[...], offGridGaps:[...], unnamed:[...], pass }.
 * Note:    boardsWithoutLayout MUST be empty — in this skill every Board is a layout container (flex or
 *          grid). A board that arranges children by absolute x/y is a bug; add addFlexLayout()/addGridLayout().
 */
const SCREEN_ID = storage.bs && storage.bs.screenBoardId;
const GRID = 4;
const root = SCREEN_ID ? penpotUtils.findShapeById(SCREEN_ID) : penpot.currentPage.root;

const boardsWithoutLayout = []; const rawFills = []; const offGridGaps = []; const unnamed = [];

// the screen root is itself a board and must carry a layout too (analyzeDescendants only visits descendants)
const isBoard = (s) => s.type === "board" || s.type === "frame";
const hasLayout = (s) => !!(s.flex || s.grid);
if (root && isBoard(root) && !hasLayout(root)) boardsWithoutLayout.push(root.name || root.id);

penpotUtils.analyzeDescendants(root, (r, s) => {
  // LAYOUT INVARIANT: every board/frame is a flex or grid container. No exceptions for UI containers.
  if (isBoard(s) && !hasLayout(s)) boardsWithoutLayout.push(s.name || s.id);
  const hasFill = (s.fills || []).length > 0;
  if (hasFill && !(s.tokens && s.tokens.fill)) rawFills.push(s.name || s.id);
  if (s.flex) {
    [["rowGap", s.flex.rowGap], ["columnGap", s.flex.columnGap]].forEach(([k, v]) => {
      if (typeof v === "number" && v % GRID !== 0) offGridGaps.push({ shape: s.name || s.id, [k]: v });
    });
  }
  if (!s.name || /^(Board|Rectangle|Group|Ellipse|Text)\s*\d*$/.test(s.name)) unnamed.push(s.id);
  return null;
}, 10);

return {
  boardsWithoutLayout, rawFills, offGridGaps, unnamed,
  pass: boardsWithoutLayout.length === 0 && rawFills.length === 0 && offGridGaps.length === 0 && unnamed.length === 0,
};
