/**
 * inspectFileStructure.js
 * Purpose: read-only inventory of pages, library assets, token sets/themes, and page structure.
 * Usage:   paste into an execute_code call (Phase 0). Mutates nothing.
 * Input:   none.
 * Output:  { pages, colors, typographies, components, sets, themes, structure }.
 * Note:    verify any unfamiliar member with penpot_api_info before relying on it.
 */
const lib = penpot.library.local;
return {
  pages: penpotUtils.getPages().map(p => p.name),
  colors: lib.colors.map(c => c.name),
  typographies: lib.typographies.map(t => t.name),
  components: lib.components.map(c => c.name),
  sets: lib.tokens.sets.map(s => ({ name: s.name, active: s.active, count: s.tokens.length })),
  themes: lib.tokens.themes.map(t => t.name),
  structure: penpotUtils.shapeStructure(penpot.currentPage.root, 3)
};
