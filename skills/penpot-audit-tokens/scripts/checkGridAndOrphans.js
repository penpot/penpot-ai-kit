/**
 * checkGridAndOrphans.js
 * Purpose: off-grid spacing, unresolved references, unused & duplicate tokens. Read-only.
 * Usage:   paste into execute_code (Phase 2).
 * Input:   GRID; USAGE and BOUND_TOKENS from collectStyleUsage.js (usage + boundTokens).
 * Output:  { offGrid:[...], unresolved:[...], duplicates:[...], unused:[...], unusedScope }.
 * Note:    a token is USED when a shape in scope binds it OR another token references it (a primitive
 *          that only feeds semantic aliases is not an orphan). `unused` is only as wide as the scope
 *          BOUND_TOKENS was collected from — say so in the report.
 */
const GRID = 4;
const USAGE = [];        // REPLACE-ME: `usage` from collectStyleUsage.js
const BOUND_TOKENS = []; // REPLACE-ME: `boundTokens` from collectStyleUsage.js

const tok = penpot.library.local.tokens;
const all = [];
tok.sets.forEach(s => s.tokens.forEach(t => all.push({ set:s.name, name:t.name, type:t.type, value:t.value, resolved:String(t.resolvedValue) })));
const names = new Set(all.map(t=>t.name));

const offGrid = USAGE.filter(u => !u.bound && (["rowGap","columnGap","borderRadius"].includes(u.property) || /^padding/.test(u.property)) && typeof u.current==="number" && u.current % GRID !== 0)
  .map(u => ({ shape:u.shape, property:u.property, value:u.current, suggest:`nearest ${GRID}px token` }));

const unresolved = [];
for (const t of all) { const r=(String(t.value).match(/^\{(.+)\}$/)||[])[1]; if (r && !names.has(r)) unresolved.push({ token:t.name, ref:r }); }

const byVal = {};
all.forEach(t => { const k=`${t.type}:${t.resolved}`; (byVal[k]=byVal[k]||[]).push(t.name); });
const duplicates = Object.entries(byVal).filter(([,n])=>n.length>1).map(([k,n])=>({ value:k, tokens:n }));

const usedTokenNames = new Set([...BOUND_TOKENS, ...USAGE.map(u=>u.boundToken).filter(Boolean)]);
for (const t of all) { const r=(String(t.value).match(/^\{(.+)\}$/)||[])[1]; if (r) usedTokenNames.add(r); }   // referenced by an alias = used
const haveScope = USAGE.length > 0 || BOUND_TOKENS.length > 0;
const unused = haveScope ? all.filter(t=>!usedTokenNames.has(t.name)).map(t=>t.name) : [];

return { offGrid, unresolved, duplicates, unused, unusedScope: haveScope ? "shapes scanned by collectStyleUsage.js only" : "not computed (no USAGE / BOUND_TOKENS given)" };
