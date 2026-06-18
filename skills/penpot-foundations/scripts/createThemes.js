/**
 * createThemes.js  (dark mode = the parallel `modes/dark` colour set; the USER activates it)
 * Purpose: create a `modes/dark` set mirroring EVERY colour name in `modes/light` with dark values,
 *          leaving `modes/light` active as the default. Spacing/radius/type live in `semantic` and are
 *          mode-invariant — they are NOT duplicated here. See shared/modes-and-policies.md.
 * Usage:   paste into execute_code (Phase 3) after `modes/light` exists (createSemanticTokens.js).
 * Input:   DARK = [{type:"color",name,value}] mirroring every `modes/light` colour name with dark values.
 * Output:  { darkCount, added, mirrored, missing, light, dark, howToActivate }.
 * Why not Themes? `theme.addSet()` does NOT persist via the plugin API (activeSets stays empty), and the
 *   plugin's own read lags a switch — so build the set, leave light active, hand the toggle to the user.
 *   See references/04-themes-modes.md.
 */
const tok = penpot.library.local.tokens;
const prim = tok.sets.find(s => s.name === "primitives"); if (prim && !prim.active) prim.toggleActive();
const light = tok.sets.find(s => s.name === "modes/light");
if (!light) return { error: "modes/light not found — run createSemanticTokens.js first" };
let dark = tok.sets.find(s => s.name === "modes/dark") || tok.addSet({ name: "modes/dark" });
if (!dark.active) dark.toggleActive();   // active while adding so reference tokens validate

// REPLACE-ME: mirror EVERY colour name in `modes/light`, re-pointing to DARK primitive values.
const DARK = [
  { type:"color", name:"color.bg.default",        value:"{color.gray.900}" },
  { type:"color", name:"color.text.default",      value:"{color.gray.50}" },
  { type:"color", name:"color.action.primary.bg", value:"{color.blue.500}" }
  // ...add the rest so modes/dark covers every colour name in modes/light.
];

// Coverage check: which modes/light colours are NOT yet mirrored in DARK above.
const lightColourNames = light.tokens.filter(t => t.type === "color").map(t => t.name);
const darkNamesPlanned = new Set(DARK.map(t => t.name));
const missing = lightColourNames.filter(n => !darkNamesPlanned.has(n));

const added = [];
for (const t of DARK) if (!dark.tokens.find(x => x.name === t.name)) { dark.addToken(t); added.push(t.name); }

// Restore the LIGHT default: modes/light active, modes/dark inactive.
if (!light.active) light.toggleActive();
if (dark.active) dark.toggleActive();

return {
  darkCount: dark.tokens.length, added: added.length, mirrored: lightColourNames.length,
  missing, // names you still need to add to DARK so dark mode is complete
  light: light.name, dark: dark.name,
  howToActivate: "User: in the Tokens panel, activate 'modes/dark' and deactivate 'modes/light' (or build a Dark theme there that toggles the pair). The agent cannot render the switch via the plugin API."
};
