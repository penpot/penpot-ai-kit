/**
 * buildSection.js
 * Purpose: build ONE section as a tokenized flex Board, reusing components where possible.
 * Usage:   paste into execute_code (Phase 2..N). One section per call.
 * Input:   SECTION_NAME, PARENT_ID (screen board), token names, component names to instance.
 * Output:  { sectionId, reused, children, bound, exceptions, flipCleared }.
 * Note:    flex positions children; bind tokens (async — verify shape.tokens in the NEXT call); name
 *          layers semantically. Spacing is BOUND to tokens, never written as literals: a missing token
 *          falls back to its number and is reported in `exceptions` (propose the token, don't hide it).
 *          Idempotent by name: a re-run reuses the section and never re-applies a bound token (gotcha #2
 *          — re-applying toggles the binding off; a failed call may already have run, gotcha #19).
 *          A clearFlip sweep runs before the return — fill-sized children can come back with flipX=true (gotcha #16).
 */
const SECTION_NAME = "nav";        // REPLACE-ME (semantic)
const PARENT_ID = storage.bs && storage.bs.screenBoardId; // or "SCREEN_BOARD_ID"
const REUSE_COMPONENTS = ["Button"]; // REPLACE-ME
const SURFACE_TOKEN = null;          // REPLACE-ME: bg token ONLY if this section is a card/panel surface (e.g. "color.bg.surface"); else null
const GAP_TOKEN = "spacing.16";      // REPLACE-ME: spacing token names from tokenOverview()
const PAD_Y_TOKEN = "spacing.16";    // REPLACE-ME
const PAD_X_TOKEN = "spacing.24";    // REPLACE-ME

const bound = []; const exceptions = [];
const FLEX_PROP = { rowGap: "rowGap", columnGap: "columnGap", paddingTop: "topPadding", paddingBottom: "bottomPadding", paddingLeft: "leftPadding", paddingRight: "rightPadding" };
// Bind a spacing token to layout props. Skips props already bound to it (re-apply would toggle OFF);
// with no such token, writes the fallback number and records the exception.
function bindSpacing(board, tokenName, props, fallback) {
  const tok = penpotUtils.findTokenByName(tokenName);
  const todo = props.filter(p => !(board.tokens && board.tokens[p] === tokenName));
  if (tok && todo.length) { board.applyToken(tok, todo); bound.push({ shape: board.name, token: tokenName, props: todo }); }
  if (!tok) { for (const p of props) board.flex[FLEX_PROP[p]] = fallback; exceptions.push({ kind: "missing-token", shape: board.name, token: tokenName, props, literal: fallback }); }
}

const parent = PARENT_ID ? penpotUtils.findShapeById(PARENT_ID) : penpot.currentPage.root;
let section = (parent.children || []).find(c => c.type === "board" && c.name === SECTION_NAME) || null;
const reused = !!section;
if (!section) {
  section = penpot.createBoard();
  section.name = SECTION_NAME;
  const flex = section.addFlexLayout();
  flex.dir = "row"; flex.alignItems = "center"; flex.justifyContent = "space-between";
  flex.horizontalSizing = "fill"; flex.verticalSizing = "auto";
  parent.appendChild(section);
  section.fills = [];                // fill policy, see below — only on creation (a literal write drops a binding)
}
bindSpacing(section, GAP_TOKEN, ["columnGap"], 16);
bindSpacing(section, PAD_Y_TOKEN, ["paddingTop", "paddingBottom"], 16);
bindSpacing(section, PAD_X_TOKEN, ["paddingLeft", "paddingRight"], 24);

// FILL POLICY (gotchas #11): a section is structural by default — clear Penpot's default opaque white
// so the screen bg shows through and dark mode works. DON'T paint every section with color.bg.default
// (that stacks opaque light boxes and breaks dark). Only bind a bg token for a genuine card/panel surface.
const surfTok = SURFACE_TOKEN && penpotUtils.findTokenByName(SURFACE_TOKEN);
if (surfTok && !(section.tokens && section.tokens.fill === SURFACE_TOKEN)) { section.applyToken(surfTok, ["fill"]); bound.push({ shape: section.name, token: SURFACE_TOKEN, props: ["fill"] }); }
if (SURFACE_TOKEN && !surfTok) exceptions.push({ kind: "missing-token", shape: section.name, token: SURFACE_TOKEN, props: ["fill"] });

const children = [];
for (const name of (reused ? [] : REUSE_COMPONENTS)) {   // a reused section already holds its instances
  const comp = penpot.library.local.components.find(c => c.name === name);
  if (comp) { const inst = comp.instance(); section.appendChild(inst); children.push({ component: name, id: inst.id }); }
}

// LAYOUT INVARIANT: every container is a flex (or grid) Board — NEVER a plain Group and NEVER absolute x/y.
// When you group elements inside this section (a card, a row of stats, a form field, a button cluster),
// create a nested Board and give it its own layout BEFORE appending children. Helper to keep it consistent:
function flexContainer(name, parentBoard, { dir = "row", gapToken = GAP_TOKEN, gap = 16, alignItems = "center", justifyContent = "start", hSizing = "fill", vSizing = "auto" } = {}) {
  const box = penpot.createBoard();
  box.name = name;
  const f = box.addFlexLayout();
  f.dir = dir;
  f.alignItems = alignItems; f.justifyContent = justifyContent;
  f.horizontalSizing = hSizing; f.verticalSizing = vSizing;
  box.fills = []; // structural by default (fill policy); bind a surface token only for real cards/panels
  parentBoard.appendChild(box); // append the container, THEN append its own children (flex orders by append)
  bindSpacing(box, gapToken, [dir === "row" ? "columnGap" : "rowGap"], gap);   // token-bound gap; `gap` is only the fallback
  return box;
}
// e.g. const stats = flexContainer("stats", section, { dir: "row", gapToken: "spacing.24", gap: 24 });

// gotcha #16: fill-sized children can come back with flipX=true — sweep the section before reporting.
// Canonical helper lives in shared/visual-effects.md.
const clearFlip = (sh) => { let n = 0; const walk = (s) => { if (s.flipX) { s.flipX = false; n++; } (s.children || []).forEach(walk); }; walk(sh); return n; };
const flipCleared = clearFlip(section);

return { sectionId: section.id, reused, children, bound, exceptions, flipCleared,
  next: "verify shape.tokens for every `bound` entry in the NEXT call (gotcha #2)" };
