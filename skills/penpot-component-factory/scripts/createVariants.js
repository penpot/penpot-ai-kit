/**
 * createVariants.js
 * Purpose: build ONE COMPONENT per variant matrix cell (clone the base, detach the clone, register it
 *          as its own component, retokenize the state). Grouping happens next (createVariantGroup).
 * Usage:   paste into execute_code (Phase 2) after the base component exists. Verify the bindings of
 *          every `created[].mainId` in the NEXT call (token apply is async, gotchas #2).
 * Input:   BASE_NAME; MATRIX of { props:{axis:value}, tokens:{ fill?, text?, stroke? } } — token NAMES.
 *          `fill` → the cell board's fill; `text` → the fill of its text layers; `stroke` → the board's
 *          strokeColor (the base must already have a stroke; a state that ADDS one, e.g. a focus ring,
 *          is built by hand and reported).
 * Output:  { created:[{props, mainId, label, bound}], skipped:[...], missingTokens:[...] }.
 * Note:    - Grouping needs component MAIN INSTANCES, so each cell is its own component.
 *          - `mainInstance.clone()` returns a component COPY. createComponent([copy]) would wrap it in a
 *            new board (a square, layout-less wrapper around a nested instance — verified live on 2.20).
 *            So the clone is DETACHED first; the detached board itself becomes the new main instance and
 *            keeps the base's flex layout, radius and token bindings.
 *          - The clone inherits the base's bindings: a token is applied only where it differs —
 *            re-applying a bound token toggles the binding OFF (gotchas #2).
 *          - Idempotent: a cell whose label is already recorded on a shape is skipped.
 */
const BASE_NAME = "Button"; // REPLACE-ME — name of the base component
const MATRIX = [
  { props: { Hierarchy: "Primary", State: "Default" }, tokens: { fill: "color.action.primary.bg" } },
  { props: { Hierarchy: "Primary", State: "Hover" },   tokens: { fill: "color.action.primary.hover.bg" } },
  { props: { Hierarchy: "Primary", State: "Disabled" }, tokens: { fill: "color.action.disabled.bg", text: "color.text.disabled" } }
  // REPLACE-ME: one entry per cell across Size / Hierarchy / State / Icon
];
const NS = "penpot-ai", CELL_KEY = "variant-cell";

const baseComp = penpot.library.local.components.find(c => c.name === BASE_NAME && !(c.isVariant && c.isVariant()));
const base = baseComp ? baseComp.mainInstance()
  : penpotUtils.findShape(s => s.type === "board" && s.name === BASE_NAME, penpot.currentPage.root);
if (!base) return { error: `base component "${BASE_NAME}" not found` };

storage.cf = storage.cf || {}; storage.cf.variants = storage.cf.variants || [];
const created = []; const skipped = []; const missingTokens = [];
const bind = (shape, name, props) => {
  const tok = penpotUtils.findTokenByName(name);
  if (!tok) { if (!missingTokens.includes(name)) missingTokens.push(name); return false; }
  const todo = props.filter(p => !(shape.tokens && shape.tokens[p] === name));
  if (todo.length) shape.applyToken(tok, todo);
  return true;
};

let col = 0;
for (const v of MATRIX) {
  const label = `${BASE_NAME} ` + Object.entries(v.props).map(([k, val]) => `${k}=${val}`).join(" ");
  const existing = penpotUtils.findShape(s => s.getSharedPluginData && s.getSharedPluginData(NS, CELL_KEY) === label, penpot.currentPage.root);
  if (existing) { skipped.push(label); continue; }

  const cell = base.clone();
  if (cell.isComponentInstance && cell.isComponentInstance()) cell.detach();   // a copy must not be wrapped
  cell.name = label;
  cell.x = base.x + (col + 1) * (base.width + 40); cell.y = base.y + base.height + 40; col++;   // side by side, never stacked
  cell.setSharedPluginData(NS, CELL_KEY, label);
  const comp = penpot.library.local.createComponent([cell]);
  const main = comp.mainInstance();

  const t = v.tokens || {}; const bound = {};
  if (t.fill) bound.fill = bind(main, t.fill, ["fill"]);
  if (t.stroke) bound.stroke = (main.strokes || []).length ? bind(main, t.stroke, ["strokeColor"]) : "no stroke on the base — build it by hand";
  if (t.text) bound.text = penpotUtils.findShapes(s => s.type === "text", main).map(txt => bind(txt, t.text, ["fill"])).every(Boolean);

  const rec = { props: v.props, mainId: main.id, label, bound };
  storage.cf.variants.push(rec);
  created.push(rec);
}
return { created, skipped, missingTokens,
  next: "NEXT call: read tokens of each created mainId; then createVariantGroup names the axes. Propose every token listed in missingTokens — do not substitute a literal." };
