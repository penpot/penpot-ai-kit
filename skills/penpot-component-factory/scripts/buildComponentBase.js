/**
 * buildComponentBase.js
 * Purpose: build a tokenized base component (flex Board) and register it as a library component.
 * Usage:   paste into execute_code (Phase 1). Edit NAME and the children.
 * Input:   NAME; token names for fill/radius/padding.
 * Output:  { component, mainInstanceId, boardId }.
 * Note:    use createBoard (NOT createFrame). Bind values to tokens; verify token apply later (async).
 */
const NAME = "Button"; // REPLACE-ME

const board = penpot.createBoard();
board.name = NAME;
const flex = board.addFlexLayout();
flex.dir = "row";
flex.alignItems = "center"; flex.justifyContent = "center";
flex.rowGap = 8; flex.columnGap = 8;
flex.topPadding = flex.bottomPadding = 8;
flex.leftPadding = flex.rightPadding = 16;
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

const comp = penpot.library.local.createComponent([board]);
storage.cf = storage.cf || {}; storage.cf.baseComponentId = comp.mainInstance().id;
return { component: comp.name, mainInstanceId: comp.mainInstance().id, boardId: board.id, bgTokenBound: !!bgTok, bgTokenMissing: !bgTok };
