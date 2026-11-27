/**
 * assembleScreen.js  —  Phase N+1 (Assemble)
 * Purpose: put the sections in the brief's order inside the screen Board, settle the layout and sweep
 *          the flipX artefact, then report what is present/missing.
 * Usage:   paste into execute_code (Phase N+1). Mutates only child ORDER (insertChild within the same
 *          parent = reorder). Uses a top-level `await` for Board.waitForLayoutUpdate() (gotcha #17) —
 *          if the MCP rejects top-level await, drop that line and read geometry in the NEXT call.
 * Input:   ORDER (section names top->bottom, REPLACE-ME); screen id from storage.bs.screenBoardId or SCREEN_BOARD_ID.
 * Output:  { screen, order, reordered, missing, layoutWait, flipCleared, childrenNow }.
 * Note:    verify Board.insertChild(index, child) / waitForLayoutUpdate with penpot_api_info("Board") if
 *          unsure (both listed on 2.17 PRE; insertChild-as-reorder behaviour should be confirmed on the
 *          live instance). child.setParentIndex(index) is the alternative used on failure.
 */
const SCREEN_BOARD_ID = "SCREEN_BOARD_ID";                 // optional override
const ORDER = ["nav", "main", "footer"];                   // REPLACE-ME

const screenId = (storage.bs && storage.bs.screenBoardId) || (SCREEN_BOARD_ID !== "SCREEN_BOARD_ID" ? SCREEN_BOARD_ID : null);
const screen = screenId ? penpotUtils.findShapeById(screenId) : null;
if (!screen) return { error: "screen board not found (storage.bs.screenBoardId or SCREEN_BOARD_ID)" };

const reordered = [];
const missing = [];
let targetIndex = 0;
for (const name of ORDER) {
  const child = (screen.children || []).find(c => c.name === name);
  if (!child) { missing.push(name); continue; }
  // compare by id: every read of `children` returns fresh proxy objects, so indexOf(child) is always -1
  const current = (screen.children || []).findIndex(c => c.id === child.id);
  if (current !== targetIndex) {
    // insertChild within the same parent reparents in place = reorder; fall back to
    // child.setParentIndex(i) if the call throws. Verify the resulting order in `childrenNow`.
    try { screen.insertChild(targetIndex, child); }
    catch (e) { if (typeof child.setParentIndex === "function") child.setParentIndex(targetIndex); }
    reordered.push({ name, from: current, to: targetIndex });
  }
  targetIndex++;
}

// gotcha #17: let the layout settle before anything reads geometry
// (short timeout, never fatal: the wait has been seen to hang — gotchas #19 — and nothing below needs it)
let layoutWait = "skipped";
if (reordered.length && typeof screen.waitForLayoutUpdate === "function") {
  try { await screen.waitForLayoutUpdate(5000); layoutWait = "settled"; } catch (e) { layoutWait = "timed out — read geometry in the next call"; }
}

// gotcha #16: fill-sized children can end up with flipX=true — sweep the whole screen.
// Canonical helper lives in shared/visual-effects.md.
const clearFlip = (sh) => { let n = 0; const walk = (s) => { if (s.flipX) { s.flipX = false; n++; } (s.children || []).forEach(walk); }; walk(sh); return n; };
const flipCleared = clearFlip(screen);

return { screen: screen.id, order: ORDER, reordered, missing, layoutWait, flipCleared, childrenNow: (screen.children || []).map(c => c.name) };
