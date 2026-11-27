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
// Verified with penpot_api_info("Penpot", …) on 2.20: generateMarkup(shapes, { type: "html" | "svg" }),
// generateStyle(shapes, { type: "css", withPrelude?, includeChildren? }). Re-verify if the output looks short.
const MARKUP_OPTS = { type: "html" };
const STYLE_OPTS  = { type: "css", includeChildren: true };
const MAX_NODES = 300;   // cap; `truncated` says when the selection is larger

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
function spacingOf(s) {                        // layout spacing lives on EVERY flex board, not only the root
  return s.flex ? {
    dir: s.flex.dir, rowGap: s.flex.rowGap, columnGap: s.flex.columnGap,
    topPadding: s.flex.topPadding, rightPadding: s.flex.rightPadding,
    bottomPadding: s.flex.bottomPadding, leftPadding: s.flex.leftPadding,
  } : null;
}
function nodeInfo(s) {
  const boundTokens = s.tokens ? Object.fromEntries(Object.entries(s.tokens)) : {};
  return {
    id: s.id,
    name: s.name,
    type: s.type,
    parent: (s.parent && s.parent.name) || null,
    boundTokens,                               // { property: tokenName } or {}
    rawFill: colorOf(s),
    rawStroke: (Array.isArray(s.strokes) && s.strokes[0]) ? { strokeColor: s.strokes[0].strokeColor ?? null, strokeWidth: s.strokes[0].strokeWidth ?? null } : null,
    spacing: spacingOf(s),
    radius: s.borderRadius ?? null,
    width: s.width, height: s.height,
    typography: typographyOf(s),
  };
}

// Walk the selection and ALL its descendants — a one-level walk misses labels and icons nested inside
// rows and wrappers, and with them most of the drift.
const perNode = []; let truncated = false;
const walk = (s) => {
  if (perNode.length >= MAX_NODES) { truncated = true; return; }
  perNode.push(nodeInfo(s));
  for (const k of (Array.isArray(s.children) ? s.children : [])) walk(k);
};
for (const s of sel) walk(s);

// Reverse index of the file's tokens: "type:VALUE" -> [names]. tokenOverview() only lists names, so the
// values are read from the sets. Lets the report suggest the token an untokenized value should use.
const tokenIndex = {};
for (const set of penpot.library.local.tokens.sets || []) {
  if (!set.active) continue;                   // an inactive set reports values resolved from the active ones
  for (const t of set.tokens || []) {
    const key = `${t.type}:${String(t.resolvedValue).toUpperCase()}`;
    (tokenIndex[key] = tokenIndex[key] || []).push(t.name);
  }
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
if (truncated) notes.push(`selection has more than ${MAX_NODES} nodes — perNode is truncated; review a smaller selection.`);
storage.run.extracted = { markup, style, perNode, spacing, tokenIndex, notes };

return { ok: true, count: sel.length, nodes: perNode.length, truncated, markup, style, perNode, spacing, tokenTypes: Object.keys(tokenIndex).length, notes };
