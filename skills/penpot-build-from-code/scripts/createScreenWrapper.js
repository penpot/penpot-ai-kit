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
 *   REPLACE-ME-padToken  — spacing token name the board padding MIRRORS, e.g. "spacing.inset.lg".
 *   REPLACE-ME-gapToken  — spacing token name for section gap, e.g. "spacing.6".
 *   REPLACE-ME-bgToken   — surface bg token for the screen, e.g. "color.bg.default" (so dark mode flips).
 *
 * OUTPUT
 *   return { boardId, created, name, w, h }.
 *
 * NOTE
 *   Token application is async (~100 ms) — verify the gap/fill bindings in a LATER execute_code call.
 *   Padding does NOT accept token bindings (gotchas #8 / mcp-api-findings Finding 8) — this script
 *   sets the token's RESOLVED value on the flex and records the mirrored token in the ledger.
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
const bg = penpotUtils.findTokenByName(BG_TOKEN);
board.fills = [];                                     // drop Penpot's default #FFFFFF first
if (bg) board.applyToken(bg, ["fill"]);               // bound surface -> follows light/dark switch

// --- spacing: gap BOUND to a token; padding MIRRORS a token ----------------
const pad = penpotUtils.findTokenByName(PAD_TOKEN);
const gap = penpotUtils.findTokenByName(GAP_TOKEN);

if (gap) board.applyToken(gap, ["rowGap"]);           // gap bindings work — between stacked sections

// Padding does NOT accept token bindings at runtime (gotchas #8): applyToken(tok, ["paddingTop"...])
// throws "Value not valid" for every numeric token type. Set the token's RESOLVED value on the flex
// and record the mirrored token below so governance can re-bind when the API supports it.
let padValue = null;
if (pad) {
  padValue = Number(pad.resolvedValue);
  if (Number.isFinite(padValue)) {
    board.flex.topPadding = board.flex.bottomPadding = padValue;
    board.flex.leftPadding = board.flex.rightPadding = padValue;
  }
}

// --- ledger --------------------------------------------------------------
storage.run = storage.run || {};
storage.run.boardId = board.id;
const raw = penpot.currentFile.getSharedPluginData("penpot-ai", `${RUN_ID}.ledger`);
const ledger = raw ? JSON.parse(raw) : { runId: RUN_ID, phase: 1, created: [], sectionsBuilt: [], proposedTokens: [], exceptions: [] };
ledger.boardId = board.id;
ledger.phase = 1;
if (created) ledger.created.push({ kind: "board", role: "screen", name: NAME, id: board.id });
if (pad) ledger.exceptions.push({ kind: "padding-mirrors-token", shape: board.id, token: PAD_TOKEN, value: padValue, why: "padding rejects token bindings (gotchas #8); resolved value set on flex" });
penpot.currentFile.setSharedPluginData("penpot-ai", `${RUN_ID}.ledger`, JSON.stringify(ledger));
penpot.currentFile.setSharedPluginData("penpot-ai", `${RUN_ID}.phase`, "1");

return { boardId: board.id, created, name: NAME, w: width, h: height, padMirrorsToken: pad ? PAD_TOKEN : null, padValue, gapToken: !!gap, bgToken: !!bg };
