/**
 * inferTokensFromShapes.js
 * Purpose: collect distinct raw visual values across the page and PROPOSE a token system.
 *          Does NOT create tokens — it returns a proposal for human approval.
 * Usage:   paste into execute_code (Phase 4, infer path). Read-only.
 * Input:   none (scans current page).
 * Output:  { colors:[{value,count}], spacings:[{value,count,onGrid}], radii:[...], fontSizes:[...] }.
 */
const counts = { colors: {}, spacings: {}, radii: {}, fontSizes: {} };
const bump = (b, k) => { if (k == null) return; counts[b][k] = (counts[b][k] || 0) + 1; };

penpotUtils.analyzeDescendants(penpot.currentPage.root, (r, s) => {
  (s.fills || []).forEach(f => f && f.fillColor && bump("colors", f.fillColor));
  (s.strokes || []).forEach(st => st && st.strokeColor && bump("colors", st.strokeColor));
  if (typeof s.borderRadius === "number") bump("radii", s.borderRadius);
  if (s.type === "text" && typeof s.fontSize !== "undefined") bump("fontSizes", String(s.fontSize));
  if (s.flex) {
    [s.flex.rowGap, s.flex.columnGap, s.flex.topPadding, s.flex.leftPadding].forEach(v => {
      if (typeof v === "number") bump("spacings", v);
    });
  }
  return null;
}, 8);

const toArr = (b, extra = () => ({})) =>
  Object.entries(counts[b]).map(([value, count]) => ({ value, count, ...extra(value) }))
    .sort((a, z) => z.count - a.count);

return {
  colors: toArr("colors"),
  spacings: toArr("spacings", v => ({ onGrid: Number(v) % 4 === 0 })),
  radii: toArr("radii"),
  fontSizes: toArr("fontSizes"),
  note: "Proposal only. Cluster near-duplicates, snap spacing to 4px and sizes to the type scale, then approve before creating tokens."
};
