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

const isColour = t => t.type === "color";
// Create a set only when something will go in it — an empty set is debt (a colour-only brief must not
// leave an empty `semantic` set behind, and vice versa).
const ensureSet = (name, needed) => {
  let s = tok.sets.find(x => x.name === name) || null;
  if (!s && needed) s = tok.addSet({ name });
  if (s && !s.active) s.toggleActive();
  return s;
};
const lightSet = ensureSet("modes/light", SEMANTIC.some(isColour));
const semSet   = ensureSet("semantic", SEMANTIC.some(t => !isColour(t)));
let addedLight = 0, addedSem = 0; const unresolved = [];
for (const t of SEMANTIC) {
  const ref = (t.value.match(/^\{(.+)\}$/) || [])[1];
  if (ref && !primNames.has(ref)) unresolved.push({ name: t.name, ref });
  const target = isColour(t) ? lightSet : semSet;
  if (!target.tokens.find(x => x.name === t.name)) { target.addToken(t); isColour(t) ? addedLight++ : addedSem++; }
}
return {
  sets: { colours: lightSet ? lightSet.name : null, invariant: semSet ? semSet.name : null },
  added: { "modes/light": addedLight, semantic: addedSem },
  totals: { "modes/light": lightSet ? lightSet.tokens.length : 0, semantic: semSet ? semSet.tokens.length : 0 },
  unresolved
};
