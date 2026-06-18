/**
 * collectStyleUsage.js
 * Purpose: collect every raw style value and whether a token is bound. Read-only.
 * Usage:   paste into execute_code (Phase 0).
 * Input:   ROOT_ID (optional).
 * Output:  { usage:[{shape, property, current, bound}], tokenIndex }.
 */
const ROOT_ID = null; // REPLACE-ME or null
const root = ROOT_ID ? penpotUtils.findShapeById(ROOT_ID) : penpot.currentPage.root;

// token index: resolvedValue -> [names] per type
const tokenIndex = {};
penpot.library.local.tokens.sets.forEach(s => s.tokens.forEach(t => {
  const k = `${t.type}:${String(t.resolvedValue).toUpperCase()}`;
  (tokenIndex[k] = tokenIndex[k] || []).push(t.name);
}));

const usage = [];
penpotUtils.analyzeDescendants(root, (r, s)=>{
  const tk = s.tokens || {};
  (s.fills||[]).forEach(f => { if(f&&f.fillColor) usage.push({ shape:s.name||s.id, property:"fill", current:f.fillColor.toUpperCase(), bound: !!tk.fill }); });
  (s.strokes||[]).forEach(st => { if(st&&st.strokeColor) usage.push({ shape:s.name||s.id, property:"strokeColor", current:st.strokeColor.toUpperCase(), bound: !!tk.strokeColor }); });
  if (typeof s.borderRadius==="number") usage.push({ shape:s.name||s.id, property:"borderRadius", current:s.borderRadius, bound: !!tk.borderRadius });
  if (s.flex){ ["rowGap","columnGap"].forEach(p=>{ if(typeof s.flex[p]==="number") usage.push({ shape:s.name||s.id, property:p, current:s.flex[p], bound: !!tk[p] }); }); }
  return null;
}, 12);

return { usage, tokenIndex };
