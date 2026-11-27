/**
 * buildComponentBase.js
 * Purpose: build a tokenized base component (flex Board) and register it as a library component.
 * Usage:   paste into execute_code (Phase 1). Edit NAME and the children.
 * Input:   NAME; token names for fill/radius/padding.
 * Output:  { component, mainInstanceId, boardId, bgTokenBound, exceptions } or { reused: true, … }.
 * Note:    use createBoard (NOT createFrame). Every value is bound to a token; a missing token is
 *          reported in `exceptions`, never hidden. Idempotent: an existing component named NAME is reused
 *          (a failed call may already have run — gotchas #19). Verify token apply in a later call (async).
 */
const NAME = "Button"; // REPLACE-ME
const GAP_TOKEN = "spacing.8";    // REPLACE-ME: spacing token names from tokenOverview()
const PAD_Y_TOKEN = "spacing.8";  // REPLACE-ME
const PAD_X_TOKEN = "spacing.16"; // REPLACE-ME

const existing = penpot.library.local.components.find(c => c.name === NAME);
if (existing) {
  storage.cf = storage.cf || {}; storage.cf.baseComponentId = existing.mainInstance().id;
  return { reused: true, component: existing.name, mainInstanceId: existing.mainInstance().id };
}

const board = penpot.createBoard();
board.name = NAME;
const flex = board.addFlexLayout();
flex.dir = "row";
flex.alignItems = "center"; flex.justifyContent = "center";
flex.horizontalSizing = "auto"; flex.verticalSizing = "auto";

const label = penpot.createText("Button");
label.name = "label";
board.appendChild(label);
penpot.currentPage.root.appendChild(board);

// FILL POLICY: a button board IS a surface — it must carry a tokenized fill, never Penpot's default
// opaque white (gotchas #11). Bind the bg token; if it's missing (foundations not run), CLEAR the
// default white and flag it rather than silently shipping an off-system white button.
// (Bind tokens separately; application is async — verify later.)
const bgTok = penpotUtils.findTokenByName("color.action.primary.bg");
if (bgTok) board.applyToken(bgTok, ["fill"]);
else board.fills = [];   // no surface token yet -> transparent + flagged below, not default white
const radTok = penpotUtils.findTokenByName("radius.control");
if (radTok) board.applyToken(radTok, ["borderRadiusTopLeft", "borderRadiusTopRight", "borderRadiusBottomRight", "borderRadiusBottomLeft"]);
const txtTok = penpotUtils.findTokenByName("color.action.primary.text");
if (txtTok) label.applyToken(txtTok, ["fill"]);

// SPACING: bound to tokens, never literals. A missing token falls back to its number and is reported
// in `exceptions` so it can be proposed — not silently shipped as an off-system value.
const exceptions = [];
const FLEX_PROP = { columnGap: "columnGap", paddingTop: "topPadding", paddingBottom: "bottomPadding", paddingLeft: "leftPadding", paddingRight: "rightPadding" };
for (const [tokenName, props, fallback] of [[GAP_TOKEN, ["columnGap"], 8], [PAD_Y_TOKEN, ["paddingTop", "paddingBottom"], 8], [PAD_X_TOKEN, ["paddingLeft", "paddingRight"], 16]]) {
  const t = penpotUtils.findTokenByName(tokenName);
  if (t) board.applyToken(t, props);
  else { for (const p of props) flex[FLEX_PROP[p]] = fallback; exceptions.push({ kind: "missing-token", token: tokenName, props, literal: fallback }); }
}

const comp = penpot.library.local.createComponent([board]);
storage.cf = storage.cf || {}; storage.cf.baseComponentId = comp.mainInstance().id;
return { component: comp.name, mainInstanceId: comp.mainInstance().id, boardId: board.id, bgTokenBound: !!bgTok, bgTokenMissing: !bgTok, exceptions,
  next: "verify the main instance's tokens in the NEXT call (async, gotchas #2)" };
