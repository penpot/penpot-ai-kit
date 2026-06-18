/**
 * createVariantGroup.js
 * Purpose: group the per-cell variant COMPONENTS (from createVariants.js) into one VariantContainer,
 *          then name the axes and set each component's value per axis.
 * Usage:   paste into execute_code (Phase 3) after createVariants.js populated storage.cf.variants.
 * Input:   storage.cf.variants = [{ props:{axis:value}, mainId, label }].
 * Output:  { containerId, properties, components:[{props}] }.
 * ⚠️ HIGH-RISK (gotchas #12 / mcp-api-findings Finding 10): the property mutations below
 *          (renameProperty / addProperty / setVariantProperty) have CORRUPTED live files — the
 *          backend then rejects every save (unsurfaced HTTP 400) and the session hangs. Run this
 *          ONLY after the user duplicated the file; verify saves persist after the FIRST mutation;
 *          on any ~30 s hang STOP and use the fallback: standalone components named
 *          "Component / Axis=Value", created one at a time (no variant container).
 * Note:    VALIDATED against the live API:
 *          - penpot.createVariantFromComponents(mainInstances: Board[]) returns a VariantContainer
 *            initialised with ONE property "Property 1" whose value, per component, is that component's name.
 *          - There is NO combineAsVariants method.
 *          - Rename/extend axes via variants.renameProperty(pos,name) / addProperty(); set each
 *            component's value via variantComponent.setVariantProperty(pos, value).
 *          - createVariantFromComponents STACKS variants at the same position. ALWAYS give the
 *            container a flex layout afterwards (this script does) so variants arrange + the
 *            container reflows to fit. Some containers ship with a flex already; some don't — handle both.
 */
const records = (storage.cf && storage.cf.variants) || [];
const mains = records.map(r => penpotUtils.findShapeById(r.mainId)).filter(Boolean);
if (mains.length < 2) return { error: "need >=2 variant component main instances", found: mains.length };

const container = penpot.createVariantFromComponents(mains);
// FILL POLICY: the variant container is structural chrome, not a surface. Every board is born with an
// opaque white fill (gotchas #11) — left there it shows behind the variants and its square corners
// defeat each variant's border-radius. Clear it so it's transparent. (Surfaces = the variants themselves.)
container.fills = [];
const variants = container.variants;

// Ordered axis names across all cells (e.g. ["Hierarchy","State"])
const axes = [...new Set(records.flatMap(r => Object.keys(r.props)))];

// The container starts with one property ("Property 1"); rename it to axes[0] and add the rest.
variants.renameProperty(0, axes[0]);
for (let i = 1; i < axes.length; i++) { variants.addProperty(); variants.renameProperty(i, axes[i]); }

// Each variant component's property-0 value is still its original component label — match on that,
// then set the real axis values for every position.
const out = [];
for (const vc of variants.variantComponents()) {
  const initialVal = vc.variantProps ? Object.values(vc.variantProps)[0] : undefined;
  const rec = records.find(r => r.label === initialVal);
  if (!rec) { out.push({ unmatched: vc.variantProps }); continue; }
  axes.forEach((axis, i) => vc.setVariantProperty(i, rec.props[axis]));
  out.push({ props: rec.props });
}

// Organize the container visually: variants stack by default — a flex layout arranges them and
// makes the container reflow to fit. Handle containers that already have a flex and those that don't.
let fl = container.flex || container.addFlexLayout();
fl.dir = "row"; fl.columnGap = 16; fl.rowGap = 16;
fl.topPadding = fl.bottomPadding = 20; fl.leftPadding = fl.rightPadding = 20;
fl.alignItems = "center"; fl.horizontalSizing = "auto"; fl.verticalSizing = "auto";
if ("wrap" in fl) fl.wrap = "wrap";

storage.cf.variantContainerId = container.id;
return { containerId: container.id, properties: variants.properties, components: out, organized: true };
