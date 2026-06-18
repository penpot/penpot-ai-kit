/**
 * collectAccessibilityData.js
 * Purpose: collect text, colors, sizes, and names for a11y checks. Read-only.
 * Usage:   paste into execute_code (Phase 0).
 * Input:   ROOT_ID (optional; defaults to current page root).
 * Output:  { texts:[...], interactives:[...] }.
 * Note:    effective background = ancestor fills composited (nearest on top) over white.
 *          Gradients are approximated by averaging their stops; semi-transparent fills are
 *          alpha-blended (not skipped). Returns null when NO ancestor has a fill (indeterminate)
 *          so the contrast check can flag it instead of assuming white. Never blindly defaults to white.
 */
const ROOT_ID = null; // REPLACE-ME or leave null
const root = ROOT_ID ? penpotUtils.findShapeById(ROOT_ID) : penpot.currentPage.root;

// --- color helpers ---
const hexToRgb = hex => { const c=String(hex).replace('#','').padStart(6,'0'); return [0,2,4].map(i=>parseInt(c.substr(i,2),16)); };
const rgbToHex = rgb => '#'+rgb.map(v=>Math.round(Math.max(0,Math.min(255,v))).toString(16).padStart(2,'0')).join('').toUpperCase();
const over = (rgbTop, aTop, rgbUnder) => rgbTop.map((c,i)=> c*aTop + rgbUnder[i]*(1-aTop)); // alpha-over compositing

// resolve a single fill to { rgb, alpha } or null (handles solid color AND gradient)
function fillToLayer(f){
  if(!f) return null;
  if(f.fillColor){ return { rgb:hexToRgb(f.fillColor), alpha: f.fillOpacity==null?1:f.fillOpacity }; }
  const g = f.fillColorGradient;
  if(g && g.stops && g.stops.length){            // gradient: average stop colors + opacities (heuristic)
    const n=g.stops.length, sum=[0,0,0]; let aSum=0;
    g.stops.forEach(st=>{ const rgb=hexToRgb(st.color); sum[0]+=rgb[0]; sum[1]+=rgb[1]; sum[2]+=rgb[2]; aSum+=(st.opacity==null?1:st.opacity); });
    const fillA = f.fillOpacity==null?1:f.fillOpacity;
    return { rgb:[sum[0]/n,sum[1]/n,sum[2]/n], alpha:(aSum/n)*fillA };
  }
  return null;                                    // image / unsupported fill -> ignore this layer
}

// effective background behind a shape: composite ancestor fills (nearest on top) over a white canvas
function bgOf(shape){
  const layers=[];                               // nearest -> farthest
  let p = shape.parent;
  while (p){ const L = fillToLayer((p.fills||[])[0]); if(L) layers.push(L); p=p.parent; }
  if(!layers.length) return null;                // indeterminate: do NOT assume white
  let comp = null;
  for(let i=layers.length-1; i>=0; i--){          // paint farthest -> nearest (bottom to top)
    const L = layers[i];
    comp = comp==null ? over(L.rgb, L.alpha, [255,255,255]) : over(L.rgb, L.alpha, comp);
  }
  return rgbToHex(comp);
}

const texts=[]; const interactives=[];
penpotUtils.analyzeDescendants(root, (r, s)=>{
  if (s.type==="text"){
    const fg=(s.fills||[])[0];
    texts.push({ id:s.id, name:s.name, chars:(s.characters||"").slice(0,40), fontSize:s.fontSize, fg:fg&&fg.fillColor, bg:bgOf(s) });
  }
  const looksInteractive = /button|input|link|nav|tab|checkbox|radio|switch/i.test(s.name||"") || (s.isComponentInstance && s.isComponentInstance());
  if (looksInteractive){ interactives.push({ id:s.id, name:s.name, w:s.width, h:s.height }); }
  return null;
}, 12);

return { texts, interactives };
