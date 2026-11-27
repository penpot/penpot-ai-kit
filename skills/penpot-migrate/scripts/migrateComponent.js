/**
 * migrateComponent.js
 * Purpose: build one Penpot component — and its variants — from the IR entries that share a base name.
 * Usage:   paste into execute_code (Phase 3), one base name per call. In the NEXT call verify the token
 *          bindings of every `cells[].mainId` and read `penpot.currentFile.validate()`.
 * Input:   IR_COMPONENTS — entries sharing one base name, e.g. ir.components.filter(c => c.name === "Button").
 *          Each: { name, variantProps?: {Axis: "Value"}, layout?: { type:"flex", dir, rowGap, columnGap,
 *          padding:[t,r,b,l], tokens?: { rowGap, columnGap, padding } }, fill?: tokenName,
 *          radius?: tokenName, children?: [{ kind:"text", name, text, fill?: tokenName }] }.
 * Output:  { base, cells:[{label, mainId, created}], containerId, path, restorePoint, exceptions }.
 * Note:    - Variant grouping needs component MAIN INSTANCES: every entry becomes its own component first.
 *          - Variants are version-gated (gotchas #12): on Penpot >= 2.20 the script takes a restore point
 *            and groups with penpotUtils.createVariantContainer; below that it leaves standalone
 *            components (named "Base / Axis=Value") and says so.
 *          - Values come from tokens (Figma Variables migrated in Phase 2). A layout number with no token
 *            name is written as a literal and reported in `exceptions` — never silently.
 *          - Idempotent: a cell already built (recorded on the shape) is reused, not duplicated.
 */
const IR_COMPONENTS = []; // REPLACE-ME
if (!IR_COMPONENTS.length) return { error: "no IR components provided" };
const NS = "penpot-ai", CELL_KEY = "migrated-cell";
const base = IR_COMPONENTS[0].name;
const exceptions = [];
const tok = (n) => (n ? penpotUtils.findTokenByName(n) : null);
const bind = (shape, name, props, literal, apply) => {          // token when it exists; reported literal otherwise
  const t = tok(name);
  if (t) { const todo = props.filter(p => !(shape.tokens && shape.tokens[p] === name)); if (todo.length) shape.applyToken(t, todo); return; }
  if (literal != null && apply) { apply(literal); exceptions.push({ kind: name ? "missing-token" : "untokenized-source-value", shape: shape.name, token: name || null, props, literal }); }
};
const labelOf = (n) => n.variantProps ? `${n.name} / ${Object.entries(n.variantProps).map(([k, v]) => `${k}=${v}`).join(", ")}` : n.name;

function buildBoard(node, label, i) {
  const b = penpot.createBoard();
  b.name = label; b.fills = [];                                // drop the default white (gotchas #11)
  penpot.currentPage.root.appendChild(b); b.x = i * 240; b.y = -600;
  const L = node.layout || {}; const T = L.tokens || {};
  const f = b.addFlexLayout(); f.dir = L.dir || "row"; f.alignItems = "center";
  f.horizontalSizing = "auto"; f.verticalSizing = "auto";
  const gapProp = /^row/.test(f.dir) ? "columnGap" : "rowGap";
  const gapVal = L[gapProp];
  if (T[gapProp] || gapVal) bind(b, T[gapProp], [gapProp], gapVal, v => { f[gapProp] = v; });     // gaps and paddings in SEPARATE calls
  const pad = L.padding || null;
  if (T.paddingY || T.paddingX) {                              // vertical / horizontal pair
    bind(b, T.paddingY, ["paddingTop", "paddingBottom"], pad, p => { f.topPadding = p[0]; f.bottomPadding = p[2]; });
    bind(b, T.paddingX, ["paddingLeft", "paddingRight"], pad, p => { f.rightPadding = p[1]; f.leftPadding = p[3]; });
  } else if (T.padding || pad) bind(b, T.padding, ["paddingTop", "paddingBottom", "paddingLeft", "paddingRight"], pad,
    p => { f.topPadding = p[0]; f.rightPadding = p[1]; f.bottomPadding = p[2]; f.leftPadding = p[3]; });
  if (node.fill) bind(b, node.fill, ["fill"]);
  else if (node.fillLiteral) { b.fills = [{ fillColor: String(node.fillLiteral).toUpperCase(), fillOpacity: 1 }]; exceptions.push({ kind: "untokenized-source-value", shape: label, props: ["fill"], literal: node.fillLiteral }); }
  if (node.radius) bind(b, node.radius, ["borderRadiusTopLeft", "borderRadiusTopRight", "borderRadiusBottomRight", "borderRadiusBottomLeft"]);
  else if (node.radiusLiteral) { b.borderRadius = node.radiusLiteral; exceptions.push({ kind: "untokenized-source-value", shape: label, props: ["borderRadius"], literal: node.radiusLiteral }); }
  for (const ch of (node.children || [])) if (ch.kind === "text") {
    const t = penpot.createText(ch.text || ""); t.name = ch.name || "label"; b.appendChild(t); t.growType = "auto-width";
    if (ch.fill) bind(t, ch.fill, ["fill"]);
    else if (ch.fillLiteral) { t.fills = [{ fillColor: String(ch.fillLiteral).toUpperCase(), fillOpacity: 1 }]; exceptions.push({ kind: "untokenized-source-value", shape: `${label} > ${t.name}`, props: ["fill"], literal: ch.fillLiteral }); }
  }
  b.setSharedPluginData(NS, CELL_KEY, label);
  return b;
}

const cells = [];
IR_COMPONENTS.forEach((node, i) => {
  const label = labelOf(node);
  const existing = penpotUtils.findShape(s => s.getSharedPluginData && s.getSharedPluginData(NS, CELL_KEY) === label, penpot.currentPage.root);
  if (existing) { cells.push({ label, mainId: existing.id, props: node.variantProps || null, created: false }); return; }
  const board = buildBoard(node, label, i);
  const comp = penpot.library.local.createComponent([board]);
  cells.push({ label, mainId: comp.mainInstance().id, props: node.variantProps || null, created: true });
});

let containerId = null, path = "single", restorePoint = null;
const variantCells = cells.filter(c => c.props);
if (variantCells.length > 1) {
  const ver = String(penpot.version || "0").split(".").map(n => parseInt(n, 10) || 0);
  const safe = ver[0] > 2 || (ver[0] === 2 && ver[1] >= 20);
  const already = variantCells.every(c => !c.created);          // a re-run: do not group twice
  if (!safe) path = "standalone (Penpot < 2.20: variant mutation is unsafe — the user can group these in the UI)";
  else if (already) path = "already-built";
  else {
    try { restorePoint = (await penpot.currentFile.saveVersion("before variants — " + base)).label; } catch (e) { restorePoint = "saveVersion failed: " + String(e && e.message || e); }
    const container = penpotUtils.createVariantContainer(variantCells.map(c => ({ shape: penpotUtils.findShapeById(c.mainId), properties: c.props })));
    container.name = base; container.fills = [];
    const cf = container.flex || container.addFlexLayout(); cf.dir = "row"; cf.horizontalSizing = "auto"; cf.verticalSizing = "auto";
    containerId = container.id; path = "variants";
  }
}
return { base, cells, containerId, path, restorePoint, exceptions,
  next: "NEXT call: verify tokens on each mainId (and that flex paddings equal the token values), then penpot.currentFile.validate()" };
