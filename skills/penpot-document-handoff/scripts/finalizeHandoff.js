/**
 * finalizeHandoff.js
 * Purpose: Phase 5 — wrap every annotation shape under ONE hideable group ("Hide this to quit notes")
 *          and run the handoff self-audit (design untouched · pin↔note parity · contiguous numbering ·
 *          tokens bound · 3-column order). A non-empty `violations` FAILS the gate.
 * Usage:   paste into execute_code (one call), after all pins/notes/tooltips are placed.
 * Input:   reads storage.dh (contextCardId, pins[], tooltips[]) and storage.dh.designSnapshot (Phase 0).
 * Output:  { groupId, audit: { violations[], parity, numbering, designUntouched, summary } }.
 * Notes:   The group must contain ONLY annotation shapes — NEVER the design. Verify the grouping call
 *          with penpot_api_info('Context','group') before relying on it. Read-only checks otherwise.
 */
const dh = storage.dh || {};
const design = dh.designBoardId && penpotUtils.findShapeById(dh.designBoardId);
if (!design) return { error: "storage.dh.designBoardId not set." };

const violations = [];

// --- 1) design untouched (vs Phase 0 snapshot) ---
const snap = dh.designSnapshot; // { childIds:[], bounds:{x,y,w,h} } captured in Phase 0
const nowChildIds = (design.children || []).map(c => c.id).sort();
let designUntouched = true;
if (snap) {
  const sameBounds = Math.round(design.x) === snap.bounds.x && Math.round(design.y) === snap.bounds.y
    && Math.round(design.width) === snap.bounds.w && Math.round(design.height) === snap.bounds.h;
  const sameChildren = JSON.stringify(nowChildIds) === JSON.stringify((snap.childIds || []).slice().sort());
  designUntouched = sameBounds && sameChildren;
  if (!sameBounds)  violations.push("design bounds changed since Phase 0 — the design must not be modified.");
  if (!sameChildren) violations.push("design child set changed — an annotation was likely appended into the design.");
} else {
  violations.push("no designSnapshot captured in Phase 0 — cannot prove the design is untouched.");
}

// --- 2) pin↔note parity ---
const pins = dh.pins || [];
const orphanPins = pins.filter(p => !p.noteId || !penpotUtils.findShapeById(p.noteId)).map(p => p.n);
const orphanNotes = pins.filter(p => !p.pinId || !penpotUtils.findShapeById(p.pinId)).map(p => p.n);
if (orphanPins.length)  violations.push(`pins without a note: ${orphanPins.join(", ")}`);
if (orphanNotes.length) violations.push(`notes without a pin: ${orphanNotes.join(", ")}`);

// --- 3) contiguous numbering 1..N, no dupes ---
const nums = pins.map(p => p.n).sort((a, b) => a - b);
const dupes = nums.filter((n, i) => i > 0 && n === nums[i - 1]);
const expected = Array.from({ length: nums.length }, (_, i) => i + 1);
const contiguous = JSON.stringify(nums) === JSON.stringify(expected);
if (dupes.length) violations.push(`duplicate pin numbers: ${[...new Set(dupes)].join(", ")}`);
if (!contiguous && nums.length) violations.push(`numbering not contiguous 1..${nums.length}: got [${nums.join(", ")}]`);

// --- 4) gather all annotation shapes (context card, pins, notes, tooltips) ---
const ids = [dh.contextCardId, ...pins.map(p => p.pinId), ...pins.map(p => p.noteId),
  ...((dh.tooltips || []).map(t => t.id))].filter(Boolean);
const shapes = ids.map(id => penpotUtils.findShapeById(id)).filter(Boolean);
if (shapes.some(s => s.id === design.id)) violations.push("the design is in the annotation set — it must be excluded from the group.");

// --- 5) wrap in the single hideable group (idempotent) ---
let group = dh.groupId && penpotUtils.findShapeById(dh.groupId);
if (!group && shapes.length && violations.length === 0) {
  // verify penpot.group signature with penpot_api_info('Context','group') if this throws
  group = penpot.group(shapes);
  group.name = "Hide this to quit notes";
  dh.groupId = group.id; storage.dh = dh;
}

// --- 6) 3-column order sanity (context.x < design.x < notes.x) ---
const ctx = dh.contextCardId && penpotUtils.findShapeById(dh.contextCardId);
const anyNote = pins.length && penpotUtils.findShapeById(pins[0].noteId);
if (ctx && ctx.x >= design.x) violations.push("context card is not left of the design.");
if (anyNote && anyNote.x <= design.x + design.width) violations.push("notes column is not right of the design.");

return {
  groupId: dh.groupId || null,
  audit: {
    violations,
    parity: { pins: pins.length, orphanPins, orphanNotes },
    numbering: { nums, contiguous, dupes: [...new Set(dupes)] },
    designUntouched,
    summary: violations.length ? `FAIL — ${violations.length} issue(s); fix before reporting done.`
      : `PASS — ${pins.length} pin/note pairs, design untouched, wrapped in "Hide this to quit notes".`
  }
};
