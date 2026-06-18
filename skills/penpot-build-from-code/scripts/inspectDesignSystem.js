/**
 * inspectDesignSystem.js  —  Phase 0 (Discovery), read-only
 *
 * PURPOSE
 *   Enumerate the EXISTING Penpot design system so code values have somewhere to land:
 *     - every token (name, type, resolvedValue, set)
 *     - a REVERSE index keyed by normalized resolved value  (codeValue -> token name)
 *     - the component library, catalogued by inferred ROLE  (button/input/card/...)
 *   Caches everything into storage.run.ds for later phases and resume.
 *
 * USAGE
 *   Paste into a single execute_code call. Read-only — creates nothing.
 *
 * INPUTS  (placeholders)
 *   RUN_ID_HERE  — stable run slug, e.g. "bfc-2026-06-05-a".
 *
 * OUTPUT
 *   return { tokenCount, componentCount, sets, rolesFound, sample } (small + structured).
 *
 * NOTE
 *   Verify any unfamiliar member with penpot_api_info (e.g. penpot_api_info("LibraryComponent"),
 *   penpot_api_info("Token", "resolvedValue")) before relying on its shape.
 */

const RUN_ID = "RUN_ID_HERE";

// --- helpers -------------------------------------------------------------
function normValue(v) {
  if (v == null) return null;
  let s = String(v).trim().toLowerCase();
  s = s.replace(/px$/, "");                 // "16px" -> "16"
  // expand 3-digit hex -> 6-digit
  const m = s.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/);
  if (m) s = `#${m[1]}${m[1]}${m[2]}${m[2]}${m[3]}${m[3]}`;
  return s;
}

const ROLE_VOCAB = [
  "button", "input", "card", "badge", "avatar", "icon", "nav", "tab",
  "checkbox", "radio", "switch", "select", "modal", "tooltip", "chip",
  "menu", "list", "table", "header", "footer", "field", "alert", "banner"
];
function inferRole(name) {
  const n = String(name || "").toLowerCase();
  for (const role of ROLE_VOCAB) if (n.includes(role)) return role;
  return null;
}

// --- enumerate tokens ----------------------------------------------------
const tokensByName = {};
const tokensByValue = {};   // normalized resolvedValue -> PREFER semantic name
const setNames = [];

const tokenLib = penpot.library.local.tokens;       // { sets, themes, addSet, addTheme }
const sets = (tokenLib && tokenLib.sets) || [];
for (const set of sets) {
  setNames.push(set.name);
  const toks = set.tokens || [];
  for (const t of toks) {
    const resolved = t.resolvedValue != null ? t.resolvedValue : t.value;
    tokensByName[t.name] = { type: t.type, value: t.value, resolvedValue: resolved, set: set.name };
    const key = normValue(resolved);
    if (key != null) {
      const existing = tokensByValue[key];
      // prefer a semantic-set token over a primitive one for the same value
      const isSemantic = /semantic/i.test(set.name);
      if (!existing || isSemantic) tokensByValue[key] = t.name;
    }
  }
}

// --- enumerate components, catalogue by role -----------------------------
const componentsByRole = {};
const componentsAll = [];
const comps = penpot.library.local.components || [];
for (const c of comps) {
  let variants = null;
  try { variants = c.variants || (c.variantProperties ? c.variantProperties : null); } catch (e) { variants = null; }
  const entry = { id: c.id, name: c.name, variants: variants };
  componentsAll.push(entry);
  const role = inferRole(c.name);
  if (role && !componentsByRole[role]) componentsByRole[role] = entry; // first match wins
}

// --- cache for later phases / resume ------------------------------------
storage.run = storage.run || {};
storage.run.runId = RUN_ID;
storage.run.ds = {
  tokensByName,
  tokensByValue,
  componentsByRole,
  componentsAll,
  setNames
};

// --- small structured return (do NOT dump the whole map) -----------------
const sampleTokens = Object.keys(tokensByName).slice(0, 8)
  .map(n => ({ name: n, type: tokensByName[n].type, resolved: tokensByName[n].resolvedValue }));

return {
  runId: RUN_ID,
  tokenCount: Object.keys(tokensByName).length,
  componentCount: componentsAll.length,
  sets: setNames,
  rolesFound: Object.keys(componentsByRole),
  reverseIndexSize: Object.keys(tokensByValue).length,
  sample: sampleTokens
};
