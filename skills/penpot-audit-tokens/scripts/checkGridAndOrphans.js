/**
 * checkGridAndOrphans.js
 * Purpose: off-grid spacing, unresolved references, unused & duplicate tokens. Read-only.
 * Usage:   paste into execute_code (Phase 2).
 * Input:   GRID; optionally USAGE (to compute unused tokens).
 * Output:  { offGrid:[...], unresolved:[...], duplicates:[...], unused:[...] }.
 */
const GRID = 4;
const USAGE = []; // REPLACE-ME (from collectStyleUsage) to compute unused; else leave empty

const tok = penpot.library.local.tokens;
const all = [];
tok.sets.forEach(s => s.tokens.forEach(t => all.push({ set:s.name, name:t.name, type:t.type, value:t.value, resolved:String(t.resolvedValue) })));
const names = new Set(all.map(t=>t.name));

const offGrid = USAGE.filter(u => ["rowGap","columnGap","borderRadius"].includes(u.property) && typeof u.current==="number" && u.current % GRID !== 0)
  .map(u => ({ shape:u.shape, property:u.property, value:u.current, suggest:`nearest ${GRID}px token` }));

const unresolved = [];
for (const t of all) { const r=(String(t.value).match(/^\{(.+)\}$/)||[])[1]; if (r && !names.has(r)) unresolved.push({ token:t.name, ref:r }); }

const byVal = {};
all.forEach(t => { const k=`${t.type}:${t.resolved}`; (byVal[k]=byVal[k]||[]).push(t.name); });
const duplicates = Object.entries(byVal).filter(([,n])=>n.length>1).map(([k,n])=>({ value:k, tokens:n }));

const usedTokenNames = new Set(USAGE.map(u=>u.boundToken).filter(Boolean));
const unused = USAGE.length ? all.filter(t=>!usedTokenNames.has(t.name)).map(t=>t.name) : [];

return { offGrid, unresolved, duplicates, unused };
