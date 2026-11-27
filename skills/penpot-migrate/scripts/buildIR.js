/**
 * buildIR.js
 * Purpose: normalize the Figma inventory into the kit's intermediate representation (IR).
 *          Plain data transform — NO Penpot writes.
 * Usage:   paste into execute_code (Phase 1) with the inventory from analyzeFigmaStructure.js; the IR is
 *          kept as plain data in storage.mig.ir. Show `coverage`, `fidelityNotes` and `gaps` at the
 *          checkpoint.
 * Input:   INVENTORY { variables:[{name,type|resolvedType,scopes?,value,mode?}],
 *                      componentSets:[{name, components:[{props, layout, fill, radius, children}]}],
 *                      screens:[{name,size,layout,fill,children}], gaps?:[{kind,detail}] }
 *          layout = { type:"flex", dir, rowGap, columnGap, padding:[t,r,b,l] } (numbers, px). In the IR,
 *          layout.tokens carries { rowGap, columnGap, padding | paddingY + paddingX } token names.
 *          fill / radius = a Variable name, or a raw value ("#0066FF", 8).
 * Output:  { ir, coverage, fidelityNotes, gaps }.
 * What it does beyond renaming:
 *   - token names -> dot notation; Figma types/scopes -> Penpot token types (shared/tokens-schema.json);
 *   - EVERY layout number (rowGap, columnGap, the four paddings) is snapped to the 4px grid, and every
 *     snap is recorded — an off-grid source value is reported, never silently rounded;
 *   - each layout number, fill and radius is matched to a migrated token by exact value
 *     (layout.tokens / fill / radius carry token NAMES); what has no token keeps its literal
 *     (fillLiteral / radiusLiteral) and is listed in `gaps` as untokenized;
 *   - anything the analysis flagged as unsupported (INVENTORY.gaps) is carried into ir.gaps, so the
 *     fidelity report cannot lose it.
 */
const INVENTORY = { variables: [], componentSets: [], screens: [], gaps: [] }; // REPLACE-ME
const GRID = 4;
const fidelityNotes = [];
const gaps = (INVENTORY.gaps || []).map(g => (typeof g === "string" ? { kind: "unsupported", detail: g } : g));

const pascal = (s) => String(s).replace(/(^|[-_\s])(\w)/g, (_, __, c) => c.toUpperCase());
const dotName = (s) => String(s).trim().replace(/\s*\/\s*/g, ".").replace(/\s+/g, "-").toLowerCase();
const isRef = (v) => /^\{.+\}$/.test(String(v));

// ---- tokens ----------------------------------------------------------------------------------------
const PENPOT_TYPES = ["color", "dimension", "spacing", "sizing", "number", "rotation", "typography", "shadow", "opacity",
  "borderRadius", "borderWidth", "fontWeights", "fontSizes", "fontFamilies", "letterSpacing", "textDecoration", "textCase"];
function tokenType(v) {
  if (PENPOT_TYPES.includes(v.type)) return v.type;
  const rt = String(v.resolvedType || v.type || "").toUpperCase();
  const scopes = (v.scopes || []).map(s => String(s).toUpperCase());
  if (rt === "COLOR") return "color";
  if (rt === "FLOAT" || rt === "NUMBER") {
    if (scopes.includes("CORNER_RADIUS")) return "borderRadius";
    if (scopes.includes("GAP") || scopes.some(s => /PADDING|SPACING/.test(s))) return "spacing";
    if (scopes.includes("WIDTH_HEIGHT")) return "sizing";
    if (scopes.includes("STROKE_FLOAT")) return "borderWidth";
    if (scopes.includes("OPACITY")) return "opacity";
    if (scopes.includes("FONT_SIZE")) return "fontSizes";
    return "dimension";
  }
  if (rt === "STRING" && scopes.includes("FONT_FAMILY")) return "fontFamilies";
  return null;
}
const tokens = [];
for (const v of INVENTORY.variables || []) {
  const type = tokenType(v);
  if (!type) { gaps.push({ kind: "variable-not-migrated", detail: `${v.name}: no Penpot token type for ${v.resolvedType || v.type}` }); continue; }
  const raw = v.value;
  const value = isRef(raw) ? "{" + dotName(String(raw).slice(1, -1)) + "}" : String(raw);
  tokens.push({ type, name: dotName(v.name), value, mode: v.mode || null });
}
// value -> token name, for the default mode only (first mode seen, or mode-less tokens)
const defaultMode = (tokens.find(t => t.mode) || {}).mode || null;
const byValue = {};
for (const t of tokens) {
  if (isRef(t.value) || (t.mode && t.mode !== defaultMode)) continue;
  const key = `${t.type}:${String(t.value).toUpperCase()}`;
  if (!byValue[key]) byValue[key] = t.name;
}
const tokenFor = (types, value) => { for (const ty of types) { const n = byValue[`${ty}:${String(value).toUpperCase()}`]; if (n) return n; } return null; };
const isTokenName = (v) => typeof v === "string" && tokens.some(t => t.name === dotName(v));

// ---- layout ----------------------------------------------------------------------------------------
const snap = (n, where, property) => {
  const s = Math.round(n / GRID) * GRID;
  if (s !== n) fidelityNotes.push({ kind: "off-grid-snap", where, property, from: n, to: s });
  return s;
};
function normLayout(layout, where) {
  if (!layout) return undefined;
  const out = { type: layout.type || "flex", dir: layout.dir || "column", tokens: {} };
  for (const g of ["rowGap", "columnGap"]) if (layout[g] != null) {
    out[g] = snap(Number(layout[g]), where, g);
    const t = tokenFor(["spacing", "dimension"], out[g]); if (t) out.tokens[g] = t;
    else if (out[g] !== 0) gaps.push({ kind: "untokenized-value", detail: `${where}.${g} = ${out[g]} has no matching token` });
  }
  if (Array.isArray(layout.padding)) {
    const sides = ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"];
    out.padding = layout.padding.map((p, i) => snap(Number(p), where, sides[i]));
    const same = out.padding.every(p => p === out.padding[0]);
    const [pt, pr, pb, pl] = out.padding;
    if (same) {
      const t = tokenFor(["spacing", "dimension"], pt);
      if (t) out.tokens.padding = t;
      else if (pt !== 0) gaps.push({ kind: "untokenized-value", detail: `${where}.padding = ${pt} has no matching token` });
    } else if (pt === pb && pl === pr) {              // the common vertical / horizontal pair
      for (const [key, val, label] of [["paddingY", pt, "vertical"], ["paddingX", pl, "horizontal"]]) {
        const t = tokenFor(["spacing", "dimension"], val);
        if (t) out.tokens[key] = t;
        else if (val !== 0) gaps.push({ kind: "untokenized-value", detail: `${where} ${label} padding = ${val} has no matching token` });
      }
    } else gaps.push({ kind: "untokenized-value", detail: `${where}.padding = [${out.padding.join(", ")}] differs on every side — bind each side by hand` });
  }
  return out;
}
function normStyle(node, where, out) {
  if (node.fill != null) {
    if (isTokenName(node.fill)) out.fill = dotName(node.fill);
    else { const t = tokenFor(["color"], node.fill); if (t) out.fill = t; else { out.fillLiteral = String(node.fill); gaps.push({ kind: "untokenized-value", detail: `${where}.fill = ${node.fill} has no matching token` }); } }
  }
  if (node.radius != null) {
    if (isTokenName(node.radius)) out.radius = dotName(node.radius);
    else { const t = tokenFor(["borderRadius", "dimension"], node.radius); if (t) out.radius = t; else if (Number(node.radius) !== 0) { out.radiusLiteral = Number(node.radius); gaps.push({ kind: "untokenized-value", detail: `${where}.radius = ${node.radius} has no matching token` }); } }
  }
  return out;
}
const normChildren = (children, where) => (children || []).map((ch, i) => {
  const w = `${where} > ${ch.name || ch.component || ch.kind || i}`;
  const out = { ...ch };
  if (ch.kind === "instance") { out.component = pascal(ch.component); if (ch.variantProps) out.variantProps = Object.fromEntries(Object.entries(ch.variantProps).map(([k, v]) => [pascal(k), pascal(v)])); }
  delete out.fill; delete out.radius;
  return normStyle(ch, w, out);
});

// ---- components / screens --------------------------------------------------------------------------
const components = (INVENTORY.componentSets || []).flatMap(set => (set.components || []).map(c => {
  const name = pascal(set.name);
  const variantProps = Object.fromEntries(Object.entries(c.props || {}).map(([k, val]) => [pascal(k), pascal(val)]));
  const where = `${name}${Object.keys(variantProps).length ? " (" + Object.entries(variantProps).map(([k, v]) => `${k}=${v}`).join(", ") + ")" : ""}`;
  const out = { name, layout: normLayout(c.layout, where), children: normChildren(c.children, where) };
  if (Object.keys(variantProps).length) out.variantProps = variantProps;
  return normStyle(c, where, out);
}));
const screens = (INVENTORY.screens || []).map(s => {
  const name = pascal(s.name);
  return normStyle(s, name, { name, size: s.size, layout: normLayout(s.layout, name), children: normChildren(s.children, name) });
});

const ir = { tokens, components, screens, gaps, fidelityNotes };
storage.mig = storage.mig || {}; storage.mig.ir = ir;
return { ir,
  coverage: { tokens: tokens.length, componentCells: components.length, componentBases: new Set(components.map(c => c.name)).size, screens: screens.length },
  fidelityNotes, gaps };
