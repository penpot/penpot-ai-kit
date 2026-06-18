/**
 * bindTokensToElements.js
 * Purpose: bind existing tokens to UNBOUND shapes by exact value match (contextual: text vs bg vs
 *          border). This is the fundamental "tokenize the design so the user doesn't do it by hand"
 *          step — and the precondition for theming (dark mode) to affect a design.
 * Usage:   CHUNKED. Run the BUILD pass once (mutates nothing), then run the APPLY pass repeatedly
 *          (≈30 shapes/call) until cursor === total, VERIFYING + retrying between calls.
 * Why chunked: applyToken is async; mass-applying in one call RACES and scrambles bindings.
 *          See shared/plugin-api-gotchas.md (#2).
 *
 * --- BUILD PASS (run once; no mutation) ---
 *   const root = penpotUtils.findShape(s => s.name === "REPLACE-ME-rootName", penpot.root) || penpot.root;
 *   const tok = penpot.library.local.tokens;
 *   const sem = tok.sets.find(s => s.name === "semantic"), prim = tok.sets.find(s => s.name === "primitives");
 *   const up = v => String(v).toUpperCase(), arr = x => Array.isArray(x) ? x : [];
 *   const semColors = sem.tokens.filter(t => t.type === "color");
 *   const mapBy = p => { const m={}; semColors.filter(p).forEach(t => { const k=up(t.resolvedValue); if(!(k in m)) m[k]=t.name; }); return m; };
 *   const textMap = mapBy(t => t.name.startsWith("color.text"));
 *   const bgMap   = mapBy(t => /^color\.(bg|brand|feedback)/.test(t.name));
 *   const bordMap = mapBy(t => t.name.startsWith("color.border") || t.name === "color.text.strong");
 *   const anyMap  = mapBy(() => true);
 *   const radMap  = {}; [...sem.tokens, ...prim.tokens].filter(t => t.type==="borderRadius")
 *                      .forEach(t => { const k=Number(t.resolvedValue); if(!(k in radMap)) radMap[k]=t.name; });
 *   const targets = [];
 *   penpotUtils.analyzeDescendants(root, (r, s) => { try {
 *     const e = { id: s.id }, f = arr(s.fills), st = arr(s.strokes);
 *     if (f[0] && f[0].fillColor)   { const n = (s.type==="text" ? textMap[up(f[0].fillColor)] : bgMap[up(f[0].fillColor)]) || anyMap[up(f[0].fillColor)]; if (n) e.fill = n; }
 *     if (st[0] && st[0].strokeColor){ const n = bordMap[up(st[0].strokeColor)] || anyMap[up(st[0].strokeColor)]; if (n) e.stroke = n; }
 *     if (typeof s.borderRadius==="number" && s.borderRadius>0 && radMap[s.borderRadius]) e.rad = radMap[s.borderRadius];
 *     if (e.fill || e.stroke || e.rad) targets.push(e);
 *   } catch(_){} return null; }, 18);
 *   storage.bind = { targets, cursor: 0 };
 *   return { total: targets.length };
 *
 * --- APPLY PASS (run repeatedly, ~30/chunk) ---
 *   const RAD = ["borderRadiusTopLeft","borderRadiusTopRight","borderRadiusBottomRight","borderRadiusBottomLeft"];
 *   const b = storage.bind, STEP = 30, slice = b.targets.slice(b.cursor, b.cursor + STEP);
 *   for (const e of slice) { const s = penpotUtils.findShapeById(e.id); if (!s) continue;
 *     if (e.fill)   { const t = penpotUtils.findTokenByName(e.fill);   if (t) s.applyToken(t, ["fill"]); }
 *     if (e.stroke) { const t = penpotUtils.findTokenByName(e.stroke); if (t) s.applyToken(t, ["strokeColor"]); }
 *     if (e.rad)    { const t = penpotUtils.findTokenByName(e.rad);    if (t) s.applyToken(t, RAD); }
 *   }
 *   b.cursor += slice.length;
 *   return { cursor: b.cursor, total: b.targets.length, remaining: b.targets.length - b.cursor };
 *
 * --- VERIFY/RETRY PASS (between/after chunks) ---
 *   Re-read shape.tokens for the chunk just applied; for any property whose binding != intended (or is
 *   null — common on Text/Rectangle fills), applyToken again. Repeat until stable.
 *
 * CAVEATS (tell the user):
 *  - Value-only matching is a heuristic. Inverse-colored chrome (e.g. a dark surface whose value
 *    equals a `text.strong` token) gets a value-correct but ROLE-imperfect token; light looks
 *    identical, but dark mode would theme it oddly. Flag these for human review / semantic re-binding.
 *  - Skip brand/logo colors that intentionally have no token (e.g. integration logos, pure black).
 */
return { note: "This script is a documented procedure (BUILD -> APPLY chunks -> VERIFY/retry). Run the passes above via execute_code; do NOT mass-apply in one call." };
