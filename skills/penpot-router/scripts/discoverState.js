/**
 * discoverState.js — Phase 0a: shallow file-state sense
 * Purpose:  read-only snapshot of pages, selection, and top-level structure.
 * Usage:    paste into an execute_code call. Mutates nothing.
 * Input:    none.
 * Output:   { pages, currentPage, selectionCount, selection, topLevel }.
 * Note:     verify any unfamiliar helper with penpot_api_info before relying on it.
 */
return {
  pages: penpotUtils.getPages().map(p => p.name),
  currentPage: penpot.currentPage && penpot.currentPage.name,
  selectionCount: penpot.selection.length,
  selection: penpot.selection.map(s => ({ id: s.id, name: s.name, type: s.type })),
  topLevel: penpotUtils.shapeStructure(penpot.currentPage.root, 1)
};
