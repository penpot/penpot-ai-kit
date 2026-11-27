/**
 * validateComponent.js
 * Purpose: verify a component's variant matrix completeness, token usage and naming.
 * Usage:   paste into execute_code (Phase 4). Read-only.
 * Input:   BASE_NAME; REQUIRED_STATES; STATE_AXIS.
 * Output:  { mode, variants:[{props, hardcoded}], missingStates, hardcoded, namingIssues, variantErrors, integrity, pass }.
 * Note:    Variant properties are read from the VARIANTS API (`variantProps`), not from layer names:
 *          once grouped, every variant component and main instance is simply named BASE_NAME (verified
 *          on 2.20). Standalone cells (the below-2.20 fallback) are read from their `Axis=Value` names.
 */
const BASE_NAME = "Button"; // REPLACE-ME
const REQUIRED_STATES = ["Default", "Hover", "Pressed", "Focus", "Disabled"];
const STATE_AXIS = "State";

const lib = penpot.library.local;
const parseName = n => Object.fromEntries([...String(n || "").matchAll(/([A-Za-z][A-Za-z0-9]*)=([A-Za-z0-9]+)/g)].map(m => [m[1], m[2]]));

// 1) real variants: components named BASE_NAME that belong to a variant group
let cells = (lib.components || []).filter(c => c.name === BASE_NAME && c.isVariant && c.isVariant())
  .map(c => ({ props: c.variantProps || {}, main: c.mainInstance(), error: c.variantError || null }));
let mode = "variants";
// 2) fallback: standalone components whose NAME carries Axis=Value pairs
if (!cells.length) {
  mode = "standalone";
  cells = (lib.components || []).filter(c => String(c.name).includes("=") && String(c.name).startsWith(BASE_NAME))
    .map(c => ({ props: parseName(c.name), main: c.mainInstance(), error: null }));
}

const PADS = { paddingTop: "topPadding", paddingRight: "rightPadding", paddingBottom: "bottomPadding", paddingLeft: "leftPadding" };
const rawValues = (shape) => {                       // properties carrying a value with no token bound
  const tk = shape.tokens || {}; const raw = [];
  if ((shape.fills || []).some(f => f && f.fillColor) && !tk.fill) raw.push("fill");
  if ((shape.strokes || []).some(s => s && s.strokeColor) && !tk.strokeColor) raw.push("strokeColor");
  if (typeof shape.borderRadius === "number" && shape.borderRadius !== 0 && !tk.borderRadiusTopLeft) raw.push("borderRadius");
  if (shape.flex) {
    for (const g of ["rowGap", "columnGap"]) if (shape.flex[g] && !tk[g]) raw.push(g);
    for (const [p, fp] of Object.entries(PADS)) if (shape.flex[fp] && !tk[p]) raw.push(p);
  }
  return raw;
};

const states = new Set(); const hardcoded = []; const namingIssues = []; const variantErrors = [];
const PASCAL = /^[A-Z][A-Za-z0-9]*$/;
const variants = cells.map(c => {
  const label = Object.entries(c.props).map(([k, v]) => `${k}=${v}`).join(", ");
  if (c.props[STATE_AXIS]) states.add(c.props[STATE_AXIS]);
  if (!Object.keys(c.props).length) namingIssues.push({ cell: label || "(no properties)", issue: "no Property=Value pairs" });
  for (const [k, v] of Object.entries(c.props)) if (!PASCAL.test(k) || !PASCAL.test(v)) namingIssues.push({ cell: label, issue: `"${k}=${v}" is not PascalCase` });
  if (c.error) variantErrors.push({ cell: label, error: String(c.error) });
  const raw = [];
  const own = rawValues(c.main); if (own.length) raw.push({ shape: c.main.name, props: own });
  for (const d of penpotUtils.findShapes(s => s.id !== c.main.id, c.main)) { const r = rawValues(d); if (r.length) raw.push({ shape: d.name, props: r }); }
  if (raw.length) hardcoded.push({ cell: label, raw });
  return { props: c.props, hardcoded: raw.length };
});

const missingStates = REQUIRED_STATES.filter(s => !states.has(s));
let integrity = null; try { integrity = penpot.currentFile.validate(); } catch (e) { integrity = "validate() unavailable"; }
return { mode, variants, missingStates, hardcoded, namingIssues, variantErrors, integrity,
  pass: cells.length > 0 && !missingStates.length && !hardcoded.length && !namingIssues.length && !variantErrors.length && !(Array.isArray(integrity) && integrity.length) };
