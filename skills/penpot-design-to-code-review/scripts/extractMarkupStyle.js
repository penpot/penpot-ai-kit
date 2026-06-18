/**
 * extractMarkupStyle.js — Phase 1 of penpot-design-to-code-review
 *
 * PURPOSE
 *   Extract the design's HTML (generateMarkup) and CSS (generateStyle) for the
 *   current selection, plus a per-node map of BOUND TOKENS vs RAW values. This is
 *   the design-side input to the drift diff in Phase 4.
 *
 * USAGE
 *   Paste into a single `execute_code` call. Run AFTER Phase 0 has confirmed a
 *   non-empty selection. Read-only — mutates nothing.
 *
 * INPUTS
 *   - The current Penpot selection (penpot.selection). No placeholders required.
 *   - Optional: replace MARKUP_OPTS / STYLE_OPTS once you have confirmed the
 *     accepted opts keys via penpot_api_info (see note below). Leave as {} to use
 *     defaults — passing an unknown opts key silently yields default output.
 *
 * OUTPUT
 *   { ok, count, markup, style, perNode:[...], spacing, notes }
 *
 * VERIFY-DON'T-GUESS
 *   Confirm the opts surface before customizing:
 *     penpot_api_info("Penpot", "generateMarkup")
 *     penpot_api_info("Penpot", "generateStyle")
 *     penpot_api_info("Shape", "tokens")
 *   generateMarkup/generateStyle take an ARRAY of shapes (pass penpot.selection),
 *   not a single shape.
 */

// ---- opts: leave {} until verified with penpot_api_info ----
const MARKUP_OPTS = {}; // REPLACE-ME-IF-VERIFIED
const STYLE_OPTS  = {}; // REPLACE-ME-IF-VERIFIED

const sel = penpot.selection || [];
if (sel.length === 0) {
  return { ok: false, reason: "empty-selection",
           hint: "Select the component/board to review (Phase 0), then re-run." };
}

// Design HTML + CSS for the whole selection (array argument!).
const markup = penpot.generateMarkup(sel, MARKUP_OPTS);
const style  = penpot.generateStyle(sel, STYLE_OPTS);

// Per-node token / raw-value map. shape.tokens is the source of truth for
// "is this property tokenized." A raw value with no bound token is itself a finding.
function colorOf(s) {
  return (Array.isArray(s.fills) && s.fills[0]) ? {
    fillColor: s.fills[0].fillColor ?? null,
    fillOpacity: s.fills[0].fillOpacity ?? 1,
  } : null;
}
function typographyOf(s) {
  return s.type === "text" ? {
    fontFamily: s.fontFamily ?? null,
    fontSize: s.fontSize ?? null,
    fontWeight: s.fontWeight ?? null,
    lineHeight: s.lineHeight ?? null,
    letterSpacing: s.letterSpacing ?? null,
  } : null;
}
function nodeInfo(s) {
  const boundTokens = s.tokens ? Object.fromEntries(Object.entries(s.tokens)) : {};
  return {
    id: s.id,
    name: s.name,
    type: s.type,
    boundTokens,                               // { property: tokenName } or {}
    rawFill: colorOf(s),
    radius: s.borderRadius ?? null,
    width: s.width, height: s.height,
    typography: typographyOf(s),
  };
}

// Walk selection + one level of children (shallow; deeper reads via shapeStructure).
const perNode = [];
for (const s of sel) {
  perNode.push(nodeInfo(s));
  const kids = Array.isArray(s.children) ? s.children : [];
  for (const k of kids) perNode.push(nodeInfo(k));
}

// Spacing lives on the container's flex/grid layout, not on leaf shapes.
const board = sel.find(s => s.flex || s.grid) || null;
const spacing = (board && board.flex) ? {
  source: board.name,
  dir: board.flex.dir,
  rowGap: board.flex.rowGap,
  columnGap: board.flex.columnGap,
  topPadding: board.flex.topPadding,
  rightPadding: board.flex.rightPadding,
  bottomPadding: board.flex.bottomPadding,
  leftPadding: board.flex.leftPadding,
} : null;

const notes = [];
if (typeof markup === "string" && markup.trim().length < 20)
  notes.push("markup is very short — verify you passed the array and correct opts (penpot_api_info).");
if (typeof style === "string" && style.trim().length < 20)
  notes.push("style is very short — likely wrong opts key or single-shape arg; re-check before concluding 'no drift'.");

// Cache for resume / later phases (read-only on canvas, so storage only).
storage.run = storage.run || {};
storage.run.extracted = { markup, style, perNode, spacing };

return { ok: true, count: sel.length, markup, style, perNode, spacing, notes };
