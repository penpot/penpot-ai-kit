/**
 * setupDeckSystem.js
 * Purpose: create (or reuse) the `deck` token set the slides bind to, resolve fonts by EXACT name,
 *          and optionally create small master components. Aliases existing brand tokens where they
 *          exist ("{color.brand.500}") so the deck stays on the file's system; literal values only
 *          where nothing exists — and every literal is reported for approval (AGENTS.md §5).
 * Usage:   paste into execute_code once (Phase 1), after createDeckPage.js PHASE=verify returned ok.
 * Input:   DECK_TOKENS, ALIAS_TO_EXISTING, FONT_CANDIDATES, CREATE_MASTERS.
 * Output:  { setId, added, existing, aliased, literal, fonts, masters, next }.
 * Note:    token values are STRINGS; new sets are INACTIVE until toggleActive() (gotcha #8);
 *          references only resolve when the referenced set is active (Finding 1).
 *          Verify unfamiliar members with penpot_api_info("TokenSet","addToken").
 */
const SET_NAME = "deck";
// REPLACE-ME: adjust values to the chosen deck style (references/02-deck-styles.md). Types per shared/tokens-schema.json.
const DECK_TOKENS = [
  { type: "color",        name: "deck.bg.dark",              value: "#0B1020" },
  { type: "color",        name: "deck.bg.light",             value: "#F7F7F5" },
  { type: "color",        name: "deck.text.on-dark",         value: "#F5F7FA" },
  { type: "color",        name: "deck.text.on-light",        value: "#15181F" },
  { type: "color",        name: "deck.text.muted",           value: "#8A93A6" },   // legacy single grey: fails on light (2.9:1)
  { type: "color",        name: "deck.text.muted-on-dark",   value: "#A3ABBD" },   // 8.2:1 on deck.bg.dark, 7.3:1 on deck.surface.card
  { type: "color",        name: "deck.text.muted-on-light",  value: "#5A6272" },   // 5.7:1 on deck.bg.light
  { type: "color",        name: "deck.accent",               value: "#4F7CFF" },
  { type: "color",        name: "deck.surface.card",         value: "#161C2E" },
  { type: "color",        name: "deck.surface.glass",        value: "#FFFFFF" },
  { type: "color",        name: "deck.surface.placeholder",  value: "#232A3D" },
  { type: "fontSizes",    name: "deck.font.size.stat",       value: "180" },
  { type: "fontSizes",    name: "deck.font.size.title",      value: "88" },
  { type: "fontSizes",    name: "deck.font.size.section",    value: "44" },
  { type: "fontSizes",    name: "deck.font.size.body",       value: "32" },
  { type: "fontSizes",    name: "deck.font.size.caption",    value: "22" },
  { type: "fontFamilies", name: "deck.font.family.display",  value: "Inter" },
  { type: "fontFamilies", name: "deck.font.family.body",     value: "Inter" },
  { type: "spacing",      name: "deck.space.margin",         value: "96" },
  { type: "spacing",      name: "deck.space.gutter",         value: "48" },
  { type: "spacing",      name: "deck.space.stack",          value: "24" },
  { type: "borderRadius", name: "deck.radius.card",          value: "24" },
];
// REPLACE-ME: map deck tokens onto EXISTING tokens of the file when they exist (value becomes a reference).
const ALIAS_TO_EXISTING = {
  // "deck.accent": "color.brand.500",
  // "deck.bg.light": "color.bg.default",
};
const FONT_CANDIDATES = ["Inter", "Work Sans", "Source Sans 3"]; // REPLACE-ME, in order of preference
const CREATE_MASTERS = false;                                    // REPLACE-ME: true → creates DeckEyebrow/DeckFooter boards as components (one per call is safer)

const tokens = penpot.library.local.tokens;
let set = tokens.sets.find((s) => s.name === SET_NAME);
const createdSet = !set;
if (!set) set = tokens.addSet({ name: SET_NAME });
if (!set.active) set.toggleActive();

// Activate any set that an alias references (Finding 1: refs fail while the referenced set is inactive).
const aliased = [], literal = [], added = [], existing = [];
for (const [deckName, targetName] of Object.entries(ALIAS_TO_EXISTING)) {
  const target = penpotUtils.findTokenByName(targetName);
  if (target) {
    const owner = penpotUtils.getTokenSet(target);
    if (owner && !owner.active) owner.toggleActive();
  }
}

const have = new Set(set.tokens.map((t) => t.name));
for (const spec of DECK_TOKENS) {
  if (have.has(spec.name)) { existing.push(spec.name); continue; }
  const alias = ALIAS_TO_EXISTING[spec.name];
  const target = alias && penpotUtils.findTokenByName(alias);
  const value = target ? `{${alias}}` : String(spec.value);
  try {
    set.addToken({ type: spec.type, name: spec.name, value });
    added.push(spec.name);
    (target ? aliased : literal).push({ name: spec.name, value });
  } catch (e) {
    storage.deck = storage.deck || { exceptions: [] };
    storage.deck.exceptions.push({ kind: "token-add-failed", name: spec.name, value, error: String(e) });
  }
}

// Fonts — EXACT name match only (gotcha #13b: findByName matches substrings).
const all = penpot.fonts.all || [];
const available = FONT_CANDIDATES.filter((n) => all.some((f) => f.name === n));
const chosen = available[0] || null;
const chosenFont = chosen && all.find((f) => f.name === chosen);
const weights = chosenFont ? chosenFont.variants.map((v) => v.fontWeight) : [];

// Optional masters — tiny reusable parts (eyebrow, footer). Kept off by default; one component per call.
const masters = [];
if (CREATE_MASTERS) {
  const mk = (name, w, h) => {
    const b = penpot.createBoard(); b.name = name; b.resize(w, h); b.fills = [];
    const f = b.addFlexLayout(); f.dir = "row"; f.alignItems = "center"; f.columnGap = 12;
    penpot.currentPage.root.appendChild(b);
    const comp = penpot.library.local.createComponent([b]); comp.name = name;
    return { name, id: b.id, componentId: comp.id };
  };
  if (!penpot.library.local.components.some((c) => c.name === "DeckEyebrow")) masters.push(mk("DeckEyebrow", 320, 32));
}

storage.deck = Object.assign(storage.deck || {}, {
  tokenSet: SET_NAME, font: chosen, fontWeights: weights,
});
const runId = storage.deck.runId || "RUN_ID_HERE";
try {
  const led = JSON.parse(penpot.currentFile.getSharedPluginData("penpot-ai", runId + ".ledger") || "{}");
  Object.assign(led, { phase: 1, tokenSet: SET_NAME, font: chosen, tokensAdded: added, tokensLiteral: literal.map((l) => l.name) });
  penpot.currentFile.setSharedPluginData("penpot-ai", runId + ".ledger", JSON.stringify(led));
} catch {}

return {
  setId: set.id, createdSet, added, existing, aliased, literal,
  fonts: { candidates: FONT_CANDIDATES, available, chosen, weights },
  masters,
  next: chosen ? "✋ present the token list (aliased vs literal) for approval, then Phase 2 (style freeze)"
               : "No candidate font found — list penpot.fonts.all names and ask the user to pick one before building slides",
};
