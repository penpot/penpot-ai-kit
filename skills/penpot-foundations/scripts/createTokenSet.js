/**
 * createTokenSet.js
 * Purpose: idempotently create the `primitives` set and add primitive tokens (color/spacing/radius/type).
 * Usage:   paste into execute_code (Phase 1). Edit PRIMITIVES to your scales.
 * Input:   PRIMITIVES array of { type, name, value } using REAL token type strings.
 * Output:  { set, added, total }.
 * Note:    token "type" must be one of shared/tokens-schema.json penpotTokenTypes (camelCase/plural).
 */
const PRIMITIVES = [
  // colors
  { type: "color", name: "color.blue.500", value: "#0066FF" },
  { type: "color", name: "color.gray.50",  value: "#F7F8FA" },
  { type: "color", name: "color.gray.900", value: "#101114" },
  // spacing (4px grid)
  { type: "spacing", name: "spacing.2", value: "8" },
  { type: "spacing", name: "spacing.4", value: "16" },
  { type: "spacing", name: "spacing.6", value: "24" },
  // radius
  { type: "borderRadius", name: "radius.md", value: "8" },
  // type scale (Minor Third from 16)
  { type: "fontSizes", name: "font.size.300", value: "16" },
  { type: "fontSizes", name: "font.size.400", value: "19" }
  // REPLACE-ME: extend with your full ramps
];

const tok = penpot.library.local.tokens;
let set = tok.sets.find(s => s.name === "primitives") || tok.addSet({ name: "primitives" });
if (!set.active) set.toggleActive(); // NEW sets are created INACTIVE; activate so tokens resolve and can affect shapes
let added = 0;
for (const t of PRIMITIVES) {
  if (!set.tokens.find(x => x.name === t.name)) { set.addToken(t); added++; }
}
return { set: set.name, added, total: set.tokens.length };
