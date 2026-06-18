/**
 * createSemanticTokens.js
 * Purpose: idempotently create the semantic layer that REFERENCES primitives, ROUTED into two sets:
 *            - COLOUR semantics -> `modes/light`   (the colours that flip per mode)
 *            - mode-INVARIANT semantics (spacing/radius/type) -> `semantic`
 *          This split is what lets dark mode = a parallel `modes/dark` set holding only colours, and
 *          keeps spacing/radius/type from being duplicated per mode. See shared/modes-and-policies.md.
 * Usage:   paste into execute_code (Phase 2) after primitives exist.
 * Input:   SEMANTIC array of { type, name, value } where value is a "{primitive.ref}".
 * Output:  { sets, added, totals, unresolved }.
 * Note:    values use reference syntax "{...}". resolvedValue is computed async (read later).
 *          A reference "{...}" FAILS validation unless the referenced set is ACTIVE — both target sets
 *          are activated below. createThemes.js later mirrors `modes/light`'s colours into `modes/dark`.
 */
const SEMANTIC = [
  // colour semantics -> modes/light
  { type: "color", name: "color.bg.default",        value: "{color.gray.50}" },
  { type: "color", name: "color.text.default",      value: "{color.gray.900}" },
  { type: "color", name: "color.action.primary.bg", value: "{color.blue.500}" },
  // mode-invariant semantics -> semantic
  { type: "spacing", name: "spacing.inset.md",       value: "{spacing.4}" },
  { type: "borderRadius", name: "radius.control",    value: "{radius.md}" }
  // REPLACE-ME: extend with your semantic roles (colours route to modes/light automatically)
];

const tok = penpot.library.local.tokens;
const prim = tok.sets.find(s => s.name === "primitives");
const primNames = new Set(prim ? prim.tokens.map(t => t.name) : []);
// CRITICAL: referenced set (primitives) must be ACTIVE or "{...}" tokens fail validation.
if (prim && !prim.active) prim.toggleActive();

const lightSet = tok.sets.find(s => s.name === "modes/light") || tok.addSet({ name: "modes/light" });
const semSet   = tok.sets.find(s => s.name === "semantic")    || tok.addSet({ name: "semantic" });
if (!lightSet.active) lightSet.toggleActive();
if (!semSet.active)   semSet.toggleActive();

const isColour = t => t.type === "color";
let addedLight = 0, addedSem = 0; const unresolved = [];
for (const t of SEMANTIC) {
  const ref = (t.value.match(/^\{(.+)\}$/) || [])[1];
  if (ref && !primNames.has(ref)) unresolved.push({ name: t.name, ref });
  const target = isColour(t) ? lightSet : semSet;
  if (!target.tokens.find(x => x.name === t.name)) { target.addToken(t); isColour(t) ? addedLight++ : addedSem++; }
}
return {
  sets: { colours: lightSet.name, invariant: semSet.name },
  added: { "modes/light": addedLight, semantic: addedSem },
  totals: { "modes/light": lightSet.tokens.length, semantic: semSet.tokens.length },
  unresolved
};
