/**
 * collectStyleUsage.js
 * Purpose: collect every raw style value, whether a token is bound to it, and every token name that
 *          is bound anywhere in scope. Read-only.
 * Usage:   paste into execute_code (Phase 0).
 * Input:   ROOT_ID (optional).
 * Output:  { usage:[{shape, property, current, bound, boundToken}], tokenIndex, boundTokens:[names] }.
 * Note:    radius bindings live on the four corner props (there is no "borderRadius" binding), and
 *          zero gaps / radii are Penpot defaults, not design decisions — they are not reported.
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
const boundSet = new Set();
const CORNERS = ["borderRadiusTopLeft", "borderRadiusTopRight", "borderRadiusBottomRight", "borderRadiusBottomLeft"];
const PADS = { paddingTop: "topPadding", paddingRight: "rightPadding", paddingBottom: "bottomPadding", paddingLeft: "leftPadding" };
penpotUtils.analyzeDescendants(root, (r, s)=>{
  const tk = s.tokens || {};
  Object.values(tk).forEach(n => { if (n) boundSet.add(n); });
  const push = (property, current, tokenName) => usage.push({ shape:s.name||s.id, property, current, bound: !!tokenName, boundToken: tokenName || null });
  (s.fills||[]).forEach(f => { if(f&&f.fillColor) push("fill", f.fillColor.toUpperCase(), tk.fill); });
  (s.strokes||[]).forEach(st => { if(st&&st.strokeColor) push("strokeColor", st.strokeColor.toUpperCase(), tk.strokeColor); });
  if (typeof s.borderRadius==="number" && s.borderRadius !== 0) push("borderRadius", s.borderRadius, CORNERS.map(c => tk[c]).find(Boolean));
  if (s.flex){
    ["rowGap","columnGap"].forEach(p=>{ if(typeof s.flex[p]==="number" && s.flex[p] !== 0) push(p, s.flex[p], tk[p]); });
    Object.entries(PADS).forEach(([p, fp])=>{ if(typeof s.flex[fp]==="number" && s.flex[fp] !== 0) push(p, s.flex[fp], tk[p]); });
  }
  return null;
}, 12);

return { usage, tokenIndex, boundTokens: [...boundSet] };
