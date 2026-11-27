/**
 * createScreenWrapper.js  —  Phase 1 (Screen wrapper)
 *
 * PURPOSE
 *   Idempotently create the screen Board that the code will be rebuilt into: sized to the target
 *   viewport, given a vertical flex layout, with padding/gap bound to spacing TOKENS (not literals).
 *
 * USAGE
 *   Paste into a single execute_code call AFTER inspectDesignSystem.js (storage.run.ds must exist).
 *
 * INPUTS  (placeholders)
 *   RUN_ID_HERE          — run slug.
 *   REPLACE-ME-screenName — e.g. "screen-settings" (kebab, "screen-" prefix).
 *   REPLACE-ME-width / REPLACE-ME-height — viewport px (e.g. 1440 / 1024).
 *   REPLACE-ME-padToken  — spacing token name for the board padding, e.g. "spacing.inset.lg".
 *   REPLACE-ME-gapToken  — spacing token name for section gap, e.g. "spacing.6".
 *   REPLACE-ME-bgToken   — surface bg token for the screen, e.g. "color.bg.default" (so dark mode flips).
 *
 * OUTPUT
 *   return { boardId, created, name, w, h, bound, exceptions }.
 *
 * NOTE
 *   Token application is async (~100 ms) — verify the gap/fill bindings in a LATER execute_code call.
 *   Padding binds on Penpot ≥ 2.17; mirrors resolved numbers on 2.16.x (gotcha #8). Each side is tried
 *   with applyToken(tok, [side]); on failure (or when the capability ledger says gotcha8 reproduces)
 *   the token's RESOLVED value is set on the flex and ONE `padding-mirrors-token` exception is recorded.
 *   Verify signatures with penpot_api_info("Board", "addFlexLayout") if unsure.
 */

const RUN_ID    = "RUN_ID_HERE";
const NAME      = "REPLACE-ME-screenName";
const W         = "REPLACE-ME-width";   // replace with a number, e.g. 1440
const H         = "REPLACE-ME-height";  // replace with a number, e.g. 1024
const PAD_TOKEN = "REPLACE-ME-padToken";
const GAP_TOKEN = "REPLACE-ME-gapToken";
const BG_TOKEN  = "REPLACE-ME-bgToken";   // surface bg token for the screen root

const width  = Number(W);
const height = Number(H);

// --- idempotency: reuse an existing board with this name -----------------
let board = penpotUtils.findShape(s => s.type === "board" && s.name === NAME, penpot.currentPage.root);
let created = false;

if (!board) {
  board = penpot.createBoard();
  board.name = NAME;                                  // semantic, kebab-case
  penpot.currentPage.root.appendChild(board);         // not on canvas until appended
  board.resize(width, height);                        // width/height are read-only — use resize()
  penpotUtils.setParentXY(board, 0, 0);               // parentX/parentY are read-only
  board.addFlexLayout();                               // vertical screen stack
  board.flex.dir = "column";
  created = true;
}

// --- FILL POLICY: the screen root is THE one surface for this screen ------
// Every board is born with an opaque white fill (gotchas #11). The screen carries the single bg, bound
// to a token so it flips in dark mode; sections nested inside stay transparent (see buildSection.js).
// Re-run safety (gotchas #2): re-applying a bound token toggles the binding OFF and a literal write
// drops it, so every write below is skipped when the binding is already in place.
const has = (prop, name) => !!(board.tokens && board.tokens[prop] === name);
const bg = penpotUtils.findTokenByName(BG_TOKEN);
if (!(bg && has("fill", BG_TOKEN))) {
  board.fills = [];                                   // drop Penpot's default #FFFFFF first
  if (bg) board.applyToken(bg, ["fill"]);             // bound surface -> follows light/dark switch
}

// --- spacing: gap + padding BOUND to tokens (padding falls back to mirrored numbers) ---
const pad = penpotUtils.findTokenByName(PAD_TOKEN);
const gap = penpotUtils.findTokenByName(GAP_TOKEN);
const bound = [];
const exceptions = [];

if (gap) { if (!has("rowGap", GAP_TOKEN)) board.applyToken(gap, ["rowGap"]); bound.push({ prop: "rowGap", token: GAP_TOKEN }); }

// Capability ledger (written by the probe / earlier runs): if gotcha #8 is known to reproduce on this
// instance, skip straight to the numeric mirror instead of throwing four times.
let caps = null;
try {
  const rawCaps = penpot.currentFile.getSharedPluginData("penpot-ai", "capabilities");
  caps = rawCaps ? JSON.parse(rawCaps) : null;
} catch (e) { caps = null; }
const skipPaddingBind = !!(caps && caps.gotcha8 === "reproduces");

// Padding binds on ≥ 2.17. On 2.16.x applyToken(tok, ["paddingTop"...]) throws "Value not valid" — then
// set the token's RESOLVED value on the flex and record ONE mirrored-token exception so governance can
// re-bind later.
let padValue = null;
if (pad) {
  padValue = Number(pad.resolvedValue);
  const SIDES = ["paddingTop", "paddingBottom", "paddingLeft", "paddingRight"];
  const FLEX_PROP = { paddingTop: "topPadding", paddingBottom: "bottomPadding", paddingLeft: "leftPadding", paddingRight: "rightPadding" };
  const mirrored = [];
  for (const side of SIDES) {
    if (has(side, PAD_TOKEN)) { bound.push({ prop: side, token: PAD_TOKEN }); continue; }
    if (!skipPaddingBind) {
      try { board.applyToken(pad, [side]); bound.push({ prop: side, token: PAD_TOKEN }); continue; } catch (e) { /* fall through to mirror */ }
    }
    if (Number.isFinite(padValue)) board.flex[FLEX_PROP[side]] = padValue;   // gotcha #8 fallback (2.16.x)
    mirrored.push(side);
  }
  if (mirrored.length) exceptions.push({ kind: "padding-mirrors-token", shape: board.id, token: PAD_TOKEN, sides: mirrored, value: padValue, why: skipPaddingBind ? "capabilities.gotcha8 = reproduces" : "applyToken rejected padding on this instance (gotcha #8); resolved value set on flex" });
}

// --- ledger --------------------------------------------------------------
storage.run = storage.run || {};
storage.run.boardId = board.id;
const raw = penpot.currentFile.getSharedPluginData("penpot-ai", `${RUN_ID}.ledger`);
const ledger = raw ? JSON.parse(raw) : { runId: RUN_ID, phase: 1, created: [], sectionsBuilt: [], proposedTokens: [], exceptions: [] };
ledger.boardId = board.id;
ledger.phase = 1;
ledger.exceptions = ledger.exceptions || [];
if (created) ledger.created.push({ kind: "board", role: "screen", name: NAME, id: board.id });
for (const ex of exceptions) ledger.exceptions.push(ex);
penpot.currentFile.setSharedPluginData("penpot-ai", `${RUN_ID}.ledger`, JSON.stringify(ledger));
penpot.currentFile.setSharedPluginData("penpot-ai", `${RUN_ID}.phase`, "1");

return { boardId: board.id, created, name: NAME, w: width, h: height, bound, exceptions, gapToken: !!gap, bgToken: !!bg };
