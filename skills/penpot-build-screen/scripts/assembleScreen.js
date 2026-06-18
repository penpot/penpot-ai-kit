/**
 * assembleScreen.js
 * Purpose: verify all sections are present and ordered inside the screen Board.
 * Usage:   paste into execute_code (Phase N+1). Mostly read; reorders if needed.
 * Input:   SCREEN_ID, ORDER (section names top->bottom).
 * Output:  { screen, order, present, missing }.
 */
const SCREEN_ID = storage.bs && storage.bs.screenBoardId; // or "SCREEN_BOARD_ID"
const ORDER = ["nav", "main", "footer"]; // REPLACE-ME

const screen = SCREEN_ID ? penpotUtils.findShapeById(SCREEN_ID) : null;
if (!screen) return { error: "screen board not found" };
const childNames = (screen.children || []).map(c => c.name);
const missing = ORDER.filter(n => !childNames.includes(n));
return { screen: screen.id, order: ORDER, present: childNames, missing };
