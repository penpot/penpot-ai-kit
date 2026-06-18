/**
 * checkColorContrast.js
 * Purpose: compute WCAG contrast ratios for text fg/bg pairs and flag failures.
 * Usage:   paste into execute_code (Phase 1) after collecting data, or pass PAIRS inline.
 * Input:   PAIRS [{id,name,fg,bg,fontSize}] (e.g. from collectAccessibilityData.js).
 * Output:  { results:[{name, ratio, required, pass}], failures }.
 */
const PAIRS = []; // REPLACE-ME with texts[] from collectAccessibilityData

function lum(hex){const c=String(hex||"#000").replace('#','');const v=[0,2,4].map(i=>parseInt(c.substr(i,2),16)/255)
  .map(u=>u<=0.03928?u/12.92:Math.pow((u+0.055)/1.055,2.4));return 0.2126*v[0]+0.7152*v[1]+0.0722*v[2];}
function ratio(a,b){const L1=lum(a),L2=lum(b);const hi=Math.max(L1,L2),lo=Math.min(L1,L2);return (hi+0.05)/(lo+0.05);}

const results = PAIRS.map(p=>{
  const large = (p.fontSize||0) >= 24;
  const required = large ? 3.0 : 4.5;
  // Indeterminate background (no ancestor fill) or missing fg: do NOT fabricate a ratio.
  if (p.bg == null || p.fg == null) {
    return { name:p.name||p.id, fg:p.fg, bg:p.bg, ratio:null, required, pass:null, note:"indeterminate background/foreground — verify manually" };
  }
  const r = Number(ratio(p.fg, p.bg).toFixed(2));
  return { name:p.name||p.id, fg:p.fg, bg:p.bg, ratio:r, required, pass: r >= required };
});
return {
  results,
  failures: results.filter(r=>r.pass === false),
  indeterminate: results.filter(r=>r.pass === null)
};
