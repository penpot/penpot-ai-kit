/**
 * setupAnnotationKit.js
 * Purpose: Phase 0/2 — inventory the annotation component kit + tokens; with dryRun=false, create the
 *          MINIMAL missing pieces (after the user approved them) and propose/create annotation.* tokens.
 * Usage:   paste into execute_code. Run with DRY_RUN=true first (Phase 0/2 discovery, read-only),
 *          then again with DRY_RUN=false ONLY after the user approved the kit + token table.
 * Input:   DRY_RUN. Reads/writes storage.dh.kit and storage.dh.tokens.
 * Output:  { found, missing, tokensPresent, created? }.
 * Notes:   Idempotent — never recreates an existing component/token. Verify unfamiliar API with
 *          penpot_api_info('Library','createComponent'), penpot_api_info('Variants'), penpot_api_info('TokenSet').
 *          Token creation is a NEVER-AUTOFIX change: only run non-dryRun after approval.
 */
const DRY_RUN = true; // REPLACE-ME: false only after the user approved the kit + tokens

storage.dh = storage.dh || {};
const WANT = ["Critique Card", "Chip Note", "Pointer", "Tooltip"];
const TOKEN_NAMES = [
  "color.annotation.accent", "color.annotation.surface",
  "color.annotation.on-accent", "color.annotation.body",
  "font.annotation.family", "font.annotation.title",
  "font.annotation.body", "font.annotation.label"
];

// --- inventory components across local + connected libraries ---
const libs = [penpot.library.local, ...(penpot.library.connected || [])];
const found = {};
for (const lib of libs) for (const c of (lib.components || [])) {
  for (const w of WANT) if (c.name === w || c.name.startsWith(w)) {
    found[w] = found[w] || { id: c.id, name: c.name, lib: lib.name };
  }
}
const missing = WANT.filter(w => !found[w]);

// --- inventory tokens ---
const tokensPresent = {};
for (const n of TOKEN_NAMES) tokensPresent[n] = !!penpotUtils.findTokenByName(n);

if (DRY_RUN) {
  return { dryRun: true, found, missing, tokensPresent,
    note: "Approve the kit + token table (references/04) before re-running with DRY_RUN=false." };
}

// --- non-dryRun: create only what's missing (idempotent) ---
const created = { components: [], tokens: [] };

// 1) annotation token set + tokens
const REF = {
  "color.annotation.accent":   { type: "color", value: "#1A88E0" },
  "color.annotation.surface":  { type: "color", value: "#E4F3FF" },
  "color.annotation.on-accent":{ type: "color", value: "#FFFFFF" },
  "color.annotation.body":     { type: "color", value: "#000000" },
  "font.annotation.family":    { type: "fontFamilies", value: "Work Sans" },
  "font.annotation.title":     { type: "fontSizes", value: "24" },
  "font.annotation.body":      { type: "fontSizes", value: "14" },
  "font.annotation.label":     { type: "fontSizes", value: "12" }
};
let set = penpot.library.local.tokens.sets.find(s => s.name === "annotation")
  || penpot.library.local.tokens.addSet({ name: "annotation" });
if (!set.active) set.toggleActive();
for (const [name, spec] of Object.entries(REF)) {
  if (!penpotUtils.findTokenByName(name)) { set.addToken({ type: spec.type, name, value: spec.value }); created.tokens.push(name); }
}
const tok = n => penpotUtils.findTokenByName(n);
storage.dh.tokens = {
  accent: "color.annotation.accent", surface: "color.annotation.surface",
  onAccent: "color.annotation.on-accent", body: "color.annotation.body",
  fontFamily: "font.annotation.family", titleSize: "font.annotation.title",
  bodySize: "font.annotation.body", labelSize: "font.annotation.label"
};

// helper: a fully-rounded numbered Pointer board, fill bound to accent
function makePointer(size) {
  const b = penpot.createBoard();
  b.name = `Pointer / ${size === 40 ? "L" : "S"}`;
  b.resize(size, size); b.borderRadius = 9999; b.fills = [];
  const acc = tok("color.annotation.accent"); if (acc) b.applyToken(acc, ["fill"]);
  const t = penpot.createText("1"); t.growType = "auto-width"; t.align = "center"; t.verticalAlign = "center";
  const on = tok("color.annotation.on-accent"); if (on) t.applyToken(on, ["fill"]);
  b.appendChild(t); penpotUtils.setParentXY(t, size / 2 - 4, size / 2 - 8);
  return b;
}

// 2) Pointer (S + L) if missing
if (missing.includes("Pointer")) {
  const pL = makePointer(40), pS = makePointer(24);
  penpot.currentPage.root.appendChild(pL); penpot.currentPage.root.appendChild(pS);
  const cL = penpot.library.local.createComponent([pL]); cL.name = "Pointer / L";
  const cS = penpot.library.local.createComponent([pS]); cS.name = "Pointer / S";
  storage.dh.kit = Object.assign(storage.dh.kit || {}, { pointerLId: cL.id, pointerSId: cS.id });
  created.components.push("Pointer / L", "Pointer / S");
}
// NOTE: Chip Note, Critique Card and Tooltip are larger; build them with references/04 + 01 as the spec
// in their own execute_code steps (one component per call, idempotency-checked) so each can be
// checkpointed. Keep this script focused on the kit's token foundation + the Pointer primitive.

storage.dh.kit = Object.assign(storage.dh.kit || {}, found && Object.fromEntries(
  Object.entries(found).map(([k, v]) => [k.replace(/\s/g, "").replace(/^./, c => c.toLowerCase()) + "Id", v.id])
));
return { dryRun: false, created, tokensNow: TOKEN_NAMES.filter(n => !!penpotUtils.findTokenByName(n)),
  kit: storage.dh.kit };
