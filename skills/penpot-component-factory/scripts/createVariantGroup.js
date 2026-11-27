/**
 * createVariantGroup.js  —  Phase 3 (Group the per-cell components into ONE variant container)
 *
 * PURPOSE
 *   Turn the standalone per-cell components (from createVariants.js) into a single VariantContainer
 *   with named axes and per-component values, then lay the container out.
 *
 * GATE (gotchas #12 / mcp-api-findings Finding 10) — version-aware
 *   Penpot >= 2.20.0 (probed live 2026-11-27): variant mutation is safe. The script takes a restore
 *   point with `penpot.currentFile.saveVersion()` and proceeds.
 *   Older instances: variant mutation CORRUPTED live files on 2.16.x (every later save rejected, ~30 s
 *   hangs). There the script REFUSES to run unless the user duplicated the file and accepted the risk:
 *   set `storage.cf.fileDuplicatedConfirmed = true` in a previous execute_code call.
 *
 * PATHS
 *   "helper" — Penpot ≥ 2.17: `penpotUtils.createVariantContainer([{ shape, properties }])` builds the
 *              container with axes + values in ONE call (no renameProperty/setVariantProperty churn).
 *   "legacy" — older instances: `penpot.createVariantFromComponents(mains)` + renameProperty/addProperty
 *              + setVariantProperty per component (the historical, higher-risk path, kept verbatim).
 *   `Board.combineAsVariants(ids)` is listed by penpot_api_info on 2.17 but unverified — never used here.
 *
 * USAGE
 *   Paste into execute_code (Phase 3) after createVariants.js. One call (success = saved, gotchas #19).
 *   In the NEXT call read `penpot.currentFile.validate()` and each component's `variantError`.
 *
 * INPUTS
 *   RECORDS — [{ name: "Button / Size=Medium State=Default", properties: { Size: "Medium", State: "Default" } }]
 *             (REPLACE-ME). `name` must equal the main component's name in penpot.library.local.components.
 *             If RECORDS is left as the placeholder / empty, the script falls back to storage.cf.variants
 *             ({ props, mainId, label }) written by createVariants.js.
 *   CONTAINER_NAME — REPLACE-ME, e.g. "Button".
 *
 * OUTPUT
 *   { containerId, path, properties, components: [...], missing, next }  or  { halted: true, reason }.
 *
 * NOTE
 *   Verify with penpot_api_info("VariantContainer") / penpot_api_info("Variants") if unsure.
 *   Fill policy #11: the container is structural chrome -> fills = [].
 */
const RECORDS = [
  { name: "Button / Size=Medium State=Default", properties: { Size: "Medium", State: "Default" } } // REPLACE-ME
];
const CONTAINER_NAME = "REPLACE-ME-containerName";

// --- gate ---------------------------------------------------------------------------------------
storage.cf = storage.cf || {};
const verParts = String(penpot.version || "0").split(".").map(n => parseInt(n, 10) || 0);
const variantsSafe = verParts[0] > 2 || (verParts[0] === 2 && verParts[1] >= 20);
let restorePoint = null;
if (variantsSafe) {
  try { restorePoint = (await penpot.currentFile.saveVersion("before variants — " + CONTAINER_NAME)).label; }
  catch (e) { restorePoint = "saveVersion failed: " + String(e && e.message || e); }
} else if (!(storage.cf && storage.cf.fileDuplicatedConfirmed === true)) {
  return { halted: true, penpotVersion: penpot.version || null, reason: "Penpot < 2.20: variant mutation corrupted files on 2.16.x (gotchas #12). Duplicate the file and set storage.cf.fileDuplicatedConfirmed = true, or use the standalone-components fallback." };
}

// --- resolve records -> main instances -------------------------------------------------------------
const comps = penpot.library.local.components || [];
let records = RECORDS.filter(r => r && r.name && r.properties);
if (!records.length && storage.cf && Array.isArray(storage.cf.variants)) {
  // input shape from createVariants.js: { props, mainId, label }
  records = storage.cf.variants.map(r => ({ name: r.label, properties: r.props, mainId: r.mainId, label: r.label }));
}
const resolved = [];
const missing = [];
for (const r of records) {
  let main = null;
  try {
    const comp = comps.find(c => c.name === r.name);
    main = comp ? comp.mainInstance() : (r.mainId ? penpotUtils.findShapeById(r.mainId) : null);
  } catch (e) { main = null; }
  if (main) resolved.push({ main, properties: r.properties, label: r.label || r.name });
  else missing.push(r.name);
}
if (resolved.length < 2) return { error: "need >=2 variant component main instances", found: resolved.length, missing };

// Ordered axis names across all cells (e.g. ["Size","State"])
const axes = [...new Set(resolved.flatMap(r => Object.keys(r.properties)))];

// --- legacy path (the previous script's low-level flow, kept verbatim) -----------------------------
function legacyPath() {
  const mains = resolved.map(r => r.main);
  // VALIDATED against the live API: createVariantFromComponents(mainInstances: Board[]) returns a
  // VariantContainer initialised with ONE property "Property 1" whose value, per component, is that
  // component's name. It STACKS variants at the same position — the flex below fixes that.
  const container = penpot.createVariantFromComponents(mains);
  const variants = container.variants;

  // The container starts with one property ("Property 1"); rename it to axes[0] and add the rest.
  variants.renameProperty(0, axes[0]);
  for (let i = 1; i < axes.length; i++) { variants.addProperty(); variants.renameProperty(i, axes[i]); }

  // Each variant component's property-0 value is still its original component label — match on that,
  // then set the real axis values for every position.
  const out = [];
  for (const vc of variants.variantComponents()) {
    const initialVal = vc.variantProps ? Object.values(vc.variantProps)[0] : undefined;
    const rec = resolved.find(r => r.label === initialVal || r.main.name === initialVal);
    if (!rec) { out.push({ unmatched: vc.variantProps }); continue; }
    axes.forEach((axis, i) => vc.setVariantProperty(i, rec.properties[axis]));
    out.push({ props: rec.properties });
  }
  return { container, out };
}

// --- helper path (Penpot >= 2.17) -------------------------------------------------------------------
let container, out, path;
if (typeof penpotUtils.createVariantContainer === "function") {
  container = penpotUtils.createVariantContainer(resolved.map(r => ({ shape: r.main, properties: r.properties })));
  out = resolved.map(r => ({ props: r.properties }));
  path = "helper";
} else {
  const res = legacyPath();
  container = res.container; out = res.out; path = "legacy";
}

// FILL POLICY (gotchas #11): the variant container is structural chrome, not a surface. Every board is
// born with an opaque white fill — left there it shows behind the variants and its square corners
// defeat each variant's border-radius. Clear it. (Surfaces = the variants themselves.)
container.fills = [];
if (CONTAINER_NAME && !/REPLACE-ME/.test(CONTAINER_NAME)) container.name = CONTAINER_NAME;

// Organize the container visually: variants stack by default — a flex layout arranges them and
// makes the container reflow to fit. Handle containers that already have a flex and those that don't.
let fl = container.flex || container.addFlexLayout();
fl.dir = "row";
// Container spacing: bound to a spacing token when the file has one (first match), literal otherwise —
// the container is canvas chrome, so a missing token is reported, not blocking.
const chromeTok = ["spacing.16", "spacing.inset.md", "spacing.24"].map(n => penpotUtils.findTokenByName(n)).find(Boolean) || null;
const CHROME_PROPS = ["columnGap", "rowGap", "paddingTop", "paddingBottom", "paddingLeft", "paddingRight"];
let containerSpacing;
if (chromeTok) {
  const todo = CHROME_PROPS.filter(p => !(container.tokens && container.tokens[p] === chromeTok.name));
  if (todo.length) container.applyToken(chromeTok, todo);
  containerSpacing = { token: chromeTok.name };
} else {
  fl.columnGap = 16; fl.rowGap = 16; fl.topPadding = fl.bottomPadding = 16; fl.leftPadding = fl.rightPadding = 16;
  containerSpacing = { literal: 16, note: "no spacing token found — propose one" };
}
fl.alignItems = "center"; fl.horizontalSizing = "auto"; fl.verticalSizing = "auto";
if ("wrap" in fl) fl.wrap = "wrap";

let properties = axes;
try { properties = (container.variants && container.variants.properties) || axes; } catch (e) { properties = axes; }

storage.cf = storage.cf || {};
storage.cf.variantContainerId = container.id;
return {
  containerId: container.id,
  path,
  properties,
  components: out,
  missing,
  penpotVersion: penpot.version || null,
  containerSpacing,
  restorePoint,
  validation: (() => { try { return penpot.currentFile.validate(); } catch (e) { return "validate() unavailable: " + String(e && e.message || e); } })(),
  next: "in the NEXT call re-read penpot.currentFile.validate() and each component's variantError; non-empty -> stop, report, offer the restore point"
};
