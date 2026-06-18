/**
 * buildIR.js
 * Purpose: normalize the Figma inventory into the kit's intermediate representation (IR).
 *          Plain data transform — NO Penpot writes. Snaps spacing to the 4px grid (records originals).
 * Usage:   run as a pure transform (in execute_code you may use it to validate/store via `storage`).
 * Input:   INVENTORY (from analyzeFigmaStructure inventory shape).
 * Output:  { ir, fidelityNotes }.
 */
const INVENTORY = { variables: [], componentSets: [], screens: [] }; // REPLACE-ME
const GRID = 4;
const fidelityNotes = [];
const snap = (n) => { const s = Math.round(n / GRID) * GRID; if (s !== n) fidelityNotes.push(`spacing ${n} -> ${s}`); return s; };

const pascal = (s) => String(s).replace(/(^|[-_\s])(\w)/g, (_, __, c) => c.toUpperCase());

const ir = {
  tokens: INVENTORY.variables.map(v => ({ type: v.type, name: v.name, value: v.value, mode: v.mode })),
  components: INVENTORY.componentSets.flatMap(set => (set.components || []).map(c => ({
    name: pascal(set.name),
    variantProps: Object.fromEntries(Object.entries(c.props || {}).map(([k, val]) => [pascal(k), pascal(val)])),
    layout: c.layout ? { ...c.layout, rowGap: c.layout.rowGap != null ? snap(c.layout.rowGap) : undefined } : undefined,
    children: c.children || []
  }))),
  screens: INVENTORY.screens.map(s => ({ name: pascal(s.name), size: s.size, layout: s.layout, children: s.children || [] }))
};

storage.mig = storage.mig || {}; storage.mig.ir = ir;
return { ir, fidelityNotes };
