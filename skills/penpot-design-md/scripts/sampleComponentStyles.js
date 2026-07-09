// sampleComponentStyles.js — Phase 2 batch sampler for penpot-design-md. READ-ONLY.
// Paste into an `execute_code` call with ≤5 component names (heavy mainInstance() resolution).
// For each: background/border/radius/padding/gap, bound tokens, first text styles, variant axes.
// Reading variants is safe — gotcha #12 forbids MUTATION only.
// Verify any unfamiliar API with penpot_api_info before editing this script.

const NAMES = ["REPLACE-ME-1", "REPLACE-ME-2"]; // ≤5 per call

const lib = penpot.library.local;
const results = [];
for (const name of NAMES) {
  const comp = (lib.components || []).find((c) => c.name === name);
  if (!comp) { results.push({ name, error: "component not found" }); continue; }
  try {
    const root = comp.mainInstance();
    const texts = penpotUtils.findShapes((s) => s.type === "text", root).slice(0, 3);
    const entry = {
      name: comp.name,
      rootType: root.type,
      bg: root.fills && root.fills[0] ? root.fills[0].fillColor : null,
      bgOpacity: root.fills && root.fills[0] ? (root.fills[0].fillOpacity ?? 1) : null,
      stroke: root.strokes && root.strokes[0]
        ? { color: root.strokes[0].strokeColor, width: root.strokes[0].strokeWidth } : null,
      radius: root.borderRadius ?? null,
      radiusCorners: [root.borderRadiusTopLeft, root.borderRadiusTopRight, root.borderRadiusBottomRight, root.borderRadiusBottomLeft],
      padding: root.flex ? [root.flex.topPadding, root.flex.rightPadding, root.flex.bottomPadding, root.flex.leftPadding] : null,
      gap: root.flex ? [root.flex.rowGap, root.flex.columnGap] : null,
      boundTokens: root.tokens || {},
      texts: texts.map((t) => ({
        chars: (t.characters || "").slice(0, 24),
        family: t.fontFamily, size: t.fontSize, weight: t.fontWeight,
        lineHeight: t.lineHeight, letterSpacing: t.letterSpacing,
        fill: t.fills && t.fills[0] ? t.fills[0].fillColor : null,
        boundTokens: t.tokens || {},
      })),
    };
    if (comp.isVariant && comp.isVariant()) {
      entry.variantProps = comp.variantProps || null;
      entry.variantAxes = comp.variants ? comp.variants.properties : null;
    }
    results.push(entry);
  } catch (e) {
    results.push({ name, error: String(e && e.message || e) });
  }
}

storage.run = storage.run || {};
storage.run.componentEntries = (storage.run.componentEntries || []).concat(results);
return { sampled: results.length, results };
