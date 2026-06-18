/**
 * validateFidelity.js
 * Purpose: compare the migrated Penpot result against the IR and report fidelity.
 * Usage:   paste into execute_code (Phase 5). Read-only (pair with export_shape for visual compare).
 * Input:   IR (storage.mig.ir or REPLACE-ME).
 * Output:  { tokens, components, screens, gaps:[...] }.
 */
const IR = (storage.mig && storage.mig.ir) || null; // or REPLACE-ME
if (!IR) return { error: "no IR available" };

const tok = penpot.library.local.tokens;
const tokenNames = new Set(tok.sets.flatMap(s => s.tokens.map(t => t.name)));
const compNames = new Set(penpot.library.local.components.map(c => c.name));

const gaps = [];
const tokensMigrated = IR.tokens.filter(t => tokenNames.has(t.name)).length;
IR.tokens.filter(t => !tokenNames.has(t.name)).forEach(t => gaps.push(`token missing: ${t.name}`));
const componentsMigrated = [...new Set(IR.components.map(c => c.name))].filter(n => compNames.has(n)).length;
[...new Set(IR.components.map(c => c.name))].filter(n => !compNames.has(n)).forEach(n => gaps.push(`component missing: ${n}`));
const screensBuilt = IR.screens.filter(s => penpotUtils.findShape(x => x.name === s.name, penpot.currentPage.root)).length;
IR.screens.filter(s => !penpotUtils.findShape(x => x.name === s.name, penpot.currentPage.root)).forEach(s => gaps.push(`screen missing: ${s.name}`));

return {
  tokens: { expected: IR.tokens.length, migrated: tokensMigrated },
  components: { expected: new Set(IR.components.map(c=>c.name)).size, migrated: componentsMigrated },
  screens: { expected: IR.screens.length, built: screensBuilt },
  gaps,
  note: "Pair with export_shape on key screens to compare visually against Figma screenshots."
};
