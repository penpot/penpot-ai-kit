/**
 * validateTokens.js
 * Purpose: validate the token system — unresolved references, off-grid spacing, and naming sanity.
 * Usage:   paste into execute_code (Phase 5). Read-only.
 * Input:   GRID (px) for spacing checks.
 * Output:  { totals, unresolved:[...], offGrid:[...], emptyResolved:[...] }.
 */
const GRID = 4;
const tok = penpot.library.local.tokens;
const all = [];
tok.sets.forEach(s => s.tokens.forEach(t => all.push({ set: s.name, ...{ name: t.name, type: t.type, value: t.value, resolved: t.resolvedValue } })));

const byName = new Set(all.map(t => t.name));
const unresolved = [];
const offGrid = [];
const emptyResolved = [];

for (const t of all) {
  const ref = (String(t.value).match(/^\{(.+)\}$/) || [])[1];
  if (ref && !byName.has(ref)) unresolved.push({ name: t.name, ref });
  if (!t.resolved && t.resolved !== "0") emptyResolved.push(t.name);
  if ((t.type === "spacing" || t.type === "dimension") && !ref) {
    const n = Number(t.value);
    if (!Number.isNaN(n) && n % GRID !== 0) offGrid.push({ name: t.name, value: t.value });
  }
}
return {
  totals: { sets: tok.sets.length, tokens: all.length, themes: tok.themes.length },
  unresolved, offGrid, emptyResolved,
  pass: unresolved.length === 0 && offGrid.length === 0
};
