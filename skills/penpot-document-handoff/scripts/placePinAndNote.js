/**
 * placePinAndNote.js
 * Purpose: Phase 4 — add ONE numbered annotation: a Pointer/L pin on a region of the design, and a
 *          matching Chip Note in the right-hand notes column. The design is NOT modified.
 * Usage:   paste into execute_code. ONE annotation per call. Run once per pin in the brief's pin list.
 * Input:   PIN below (n, regionId, title, observation, recommendation?). Reads storage.dh.
 * Output:  { n, pinId, noteId, nextY }.
 * Notes:   Pin overlays the region (sibling/elevated, never a child of the design's layout). Note bg is a
 *          SURFACE (bind to color.annotation.surface); inner sections structural (fills=[]). Text auto-height
 *          needs ~100ms to reflow before reading height — we track nextY conservatively. Verify members with
 *          penpot_api_info if unsure. Keeps storage.dh.pins + pinCounter in sync (contiguous numbering).
 */
const PIN = {
  n: (storage.dh && storage.dh.pinCounter || 0) + 1, // auto-increments; override only to fix numbering
  regionId: "REPLACE-ME-region-shape-id",
  title: "REPLACE-ME TITLE",
  observation: "REPLACE-ME observation text.",
  recommendation: null // or "..."
};

const dh = storage.dh || {};
const design = dh.designBoardId && penpotUtils.findShapeById(dh.designBoardId);
const region = penpotUtils.findShapeById(PIN.regionId);
if (!design) return { error: "storage.dh.designBoardId not set." };
if (!region) return { error: `region ${PIN.regionId} not found.` };
const tok = n => (n ? penpotUtils.findTokenByName(n) : null);
const T = dh.tokens || {};
const PIN_L = 40, NOTE_W = 484, NOTE_GAP = 24;

// guard: no duplicate number
dh.pins = dh.pins || [];
if (dh.pins.some(p => p.n === PIN.n)) return { error: `pin #${PIN.n} already exists — fix numbering.` };

// --- 1) the on-canvas Pointer/L pin (overlay; never appended into the design) ---
let pin;
if (dh.kit && dh.kit.pointerLId) {
  const comp = penpot.library.local.components.find(c => c.id === dh.kit.pointerLId)
    || (penpot.library.connected || []).flatMap(l => l.components).find(c => c.id === dh.kit.pointerLId);
  pin = comp && comp.instance();
}
if (!pin) {
  pin = penpot.createBoard(); pin.name = "pin"; pin.resize(PIN_L, PIN_L); pin.borderRadius = 9999; pin.fills = [];
  const acc = tok(T.accent); if (acc) pin.applyToken(acc, ["fill"]);
  const num = penpot.createText(String(PIN.n)); num.align = "center"; num.verticalAlign = "center";
  const on = tok(T.onAccent); if (on) num.applyToken(on, ["fill"]);
  pin.appendChild(num); penpotUtils.setParentXY(num, PIN_L / 2 - 4, PIN_L / 2 - 8);
}
// set the number on the pin (override instance text)
const pinText = penpotUtils.findShape(s => s.type === "text", pin);
if (pinText) pinText.characters = String(PIN.n);
penpot.currentPage.root.appendChild(pin);           // page-level sibling overlay
pin.x = region.x + region.width - PIN_L / 2;          // hug the region's top-right corner
pin.y = region.y - PIN_L / 2;
pin.bringToFront();

// --- 2) the matching Chip Note in the notes column ---
let note;
if (dh.kit && dh.kit.chipNoteId) {
  const comp = penpot.library.local.components.find(c => c.id === dh.kit.chipNoteId)
    || (penpot.library.connected || []).flatMap(l => l.components).find(c => c.id === dh.kit.chipNoteId);
  note = comp && comp.instance();
}
if (!note) {
  // minimal fallback note per references/01 (header + observation + optional recommendation)
  note = penpot.createBoard(); note.name = "note-card";
  const f = penpotUtils.addFlexLayout(note, "column"); f.rowGap = 24;
  f.topPadding = f.bottomPadding = 24; f.leftPadding = f.rightPadding = 12;
  f.horizontalSizing = "fix"; f.verticalSizing = "auto";
  note.fills = []; const surf = tok(T.surface); if (surf) note.applyToken(surf, ["fill"]);
  const accent = tok(T.accent), body = tok(T.body);
  // VALIDATED: family+weight via Font API (fontFamilies token does NOT apply via applyToken);
  // fontSize/fill via tokens. See references/04 "Validated API gotchas".
  const ws = penpot.fonts.findByName("Work Sans");
  const vReg = ws.variants.find(v => v.fontWeight == "400"), vMed = ws.variants.find(v => v.fontWeight == "500");
  const mkText = (chars, { size, medium, upper, fill } = {}) => { const t = penpot.createText(String(chars == null ? "" : chars));
    t.growType = "auto-height"; ws.applyToText(t, medium ? vMed : vReg);
    const s = tok(size); if (s) t.applyToken(s, ["fontSize"]); if (upper) t.textTransform = "uppercase";
    const f = tok(fill); if (f) t.applyToken(f, ["fill"]); return t; };
  // header: small pin badge + uppercase title
  const header = penpot.createBoard(); header.name = "header";
  const hf = penpotUtils.addFlexLayout(header, "row"); hf.columnGap = 8; hf.alignItems = "center";
  hf.horizontalSizing = "fill"; hf.verticalSizing = "auto"; header.fills = [];
  const badge = penpot.createBoard(); badge.name = "badge"; badge.fills = []; if (accent) badge.applyToken(accent, ["fill"]);
  badge.resize(24, 24); badge.borderRadius = 9999;
  const bnum = mkText(String(PIN.n), { size: T.labelSize, medium: true, fill: T.onAccent }); bnum.align = "center";
  badge.appendChild(bnum); penpotUtils.setParentXY(bnum, 8, 4);
  const title = mkText(PIN.title, { size: T.labelSize, medium: true, upper: true, fill: T.accent });
  header.appendChild(badge); header.appendChild(title);
  if (badge.layoutChild) badge.layoutChild.horizontalSizing = "fix";
  function block(label, text) {
    const b = penpot.createBoard(); b.name = label.toLowerCase();
    const bf = penpotUtils.addFlexLayout(b, "column"); bf.rowGap = 4; bf.horizontalSizing = "fill"; bf.verticalSizing = "auto"; b.fills = [];
    b.appendChild(mkText(label, { size: T.labelSize, medium: true, upper: true, fill: T.accent }));
    b.appendChild(mkText(text, { size: T.bodySize, fill: T.body }));
    return b;
  }
  note.appendChild(header);
  note.appendChild(block("Observation", PIN.observation));
  if (PIN.recommendation) note.appendChild(block("Recommendation", PIN.recommendation));
  penpot.currentPage.root.appendChild(note);
  note.resize(484, note.height);
  // VALIDATED: make body/label text fill width so it wraps (auto-height needs a width). Keep the title filling too.
  penpotUtils.findShapes(s => s.type === "text", note).forEach(t => { if (t.layoutChild && t !== bnum) try { t.layoutChild.horizontalSizing = "fill"; } catch (e) {} });
  penpotUtils.findShapes(s => s.type === "board" && s.flex, note).forEach(s => { if (s.layoutChild) try { s.layoutChild.horizontalSizing = "fill"; } catch (e) {} });
} else {
  // override instance text by layer role
  const setByName = (re, val) => { const t = penpotUtils.findShape(s => s.type === "text" && re.test(s.name), note); if (t) t.characters = val; };
  const texts = penpotUtils.findShapes(s => s.type === "text", note);
  const badgeNum = texts.find(t => /^\d+$/.test((t.characters || "").trim())); if (badgeNum) badgeNum.characters = String(PIN.n);
  penpot.currentPage.root.appendChild(note);
}

note.resize(NOTE_W, note.height);
note.x = dh.notesColumnX != null ? dh.notesColumnX : design.x + design.width + 80;
note.y = dh.notesNextY != null ? dh.notesNextY : design.y;

// advance the ledger (contiguous numbering + running y). note.height may need ~100ms to settle;
// we add a conservative gap so notes don't overlap even before reflow.
dh.notesColumnX = note.x;
dh.notesNextY = Math.round(note.y + (note.height || 167) + NOTE_GAP);
dh.pins.push({ n: PIN.n, regionId: PIN.regionId, pinId: pin.id, noteId: note.id });
dh.pinCounter = Math.max(dh.pinCounter || 0, PIN.n);
storage.dh = dh;
return { n: PIN.n, pinId: pin.id, noteId: note.id, nextY: dh.notesNextY };
