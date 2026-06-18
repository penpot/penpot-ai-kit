/**
 * createVariants.js
 * Purpose: build ONE COMPONENT per variant matrix cell (clone the base board, retokenize, then
 *          createComponent). Variant grouping happens in the next step (createVariantGroup).
 * Usage:   paste into execute_code (Phase 2) after the base component board exists.
 * Input:   BASE_NAME; MATRIX of { props:{axis:value}, bg: tokenName }.
 * Output:  { created:[{props, mainId, label}], skipped:[...] }.
 * Note:    VALIDATED FLOW — createVariantFromComponents needs component MAIN INSTANCES, so each variant
 *          must be its own component. Token apply is async; ensure token SETS are active (foundations).
 *          Apply per-cell tokens to comp.mainInstance() AFTER createComponent (NOT to the clone before),
 *          or the binding won't survive onto the generated main instance. Idempotent: skips a cell whose
 *          component label already exists.
 * FILL POLICY: each variant cell is a SINGLE surface board (cloned from the base) carrying a tokenized
 *          fill + radius. Never wrap a cell in an extra board — an outer square-cornered board with the
 *          same fill defeats the inner radius (gotchas #11). Retokenizing REPLACES the fill (applyToken),
 *          it does not add a layer.
 */
const BASE_NAME = "Button"; // REPLACE-ME — name of the base component board
const MATRIX = [
  { props: { Hierarchy: "Primary",   State: "Default" }, bg: "color.action.primary.bg" },
  { props: { Hierarchy: "Secondary", State: "Default" }, bg: "color.bg.default" }
  // REPLACE-ME: extend across Size / Hierarchy / State / Icon (each cell -> its own component)
];

const base = penpotUtils.findShape(s => s.type === "board" && s.name === BASE_NAME, penpot.currentPage.root);
if (!base) return { error: `base board "${BASE_NAME}" not found` };

storage.cf = storage.cf || {}; storage.cf.variants = storage.cf.variants || [];
const created = []; const skipped = [];

for (const v of MATRIX) {
  const label = `${BASE_NAME} ` + Object.entries(v.props).map(([k, val]) => `${k}=${val}`).join(" ");
  if (penpot.library.local.components.find(c => c.name === label)) { skipped.push(label); continue; }
  const clone = base.clone();
  clone.name = label;
  penpot.currentPage.root.appendChild(clone);
  const comp = penpot.library.local.createComponent([clone]);
  // Retokenize the cell AFTER createComponent, binding to the component's MAIN instance.
  // Applying the token to the clone BEFORE createComponent does NOT reliably survive onto the
  // generated main instance (token apply is async and is snapshotted at component-creation time).
  const main = comp.mainInstance();
  const tok = penpotUtils.findTokenByName(v.bg);
  if (tok) main.applyToken(tok, ["fill"]);     // async; verify in a later call (createVariantGroup/validateComponent)
  const rec = { props: v.props, mainId: main.id, label, bg: v.bg };
  storage.cf.variants.push(rec);
  created.push(rec);
}
return { created, skipped, note: "Next: createVariantGroup combines these main instances and names the axes." };
