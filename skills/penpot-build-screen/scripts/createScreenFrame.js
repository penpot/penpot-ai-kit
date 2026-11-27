/**
 * createScreenFrame.js  —  Phase 1 (Screen frame)
 *
 * PURPOSE
 *   Idempotently create the screen Board: viewport-sized, flex column, bg/gap/padding bound to tokens,
 *   ledger initialised under RUN_ID. Sections are appended later by buildSection.js.
 *
 * USAGE
 *   Paste into a single execute_code call after Phase 0. Re-running with the same SCREEN_NAME reuses
 *   the existing top-level board on the current page.
 *
 * INPUTS  (placeholders)
 *   SCREEN_NAME   — view name, e.g. "Dashboard" (REPLACE-ME).
 *   WIDTH/HEIGHT  — viewport px (1440 / 1024 default).
 *   BG_TOKEN      — surface bg token for the screen root (fill policy #11), e.g. "color.bg.default".
 *   PADDING_TOKEN — spacing token for the four paddings, e.g. "spacing.32".
 *   GAP_TOKEN     — spacing token for the section gap, e.g. "spacing.24".
 *   RUN_ID        — run slug (RUN_ID_HERE).
 *
 * OUTPUT
 *   return { screenBoardId, reused, bound: [...], exceptions: [...] }.
 *
 * NOTE
 *   Token application is async (#2) — verify bindings in a LATER call. Padding binds on ≥ 2.17; on 2.16.x
 *   applyToken(tok, [side]) throws → mirror the resolved number + a `padding-mirrors-token` exception (#8).
 *   Verify with penpot_api_info("Board", "addFlexLayout") / penpot_api_info("Shape", "applyToken") if unsure.
 */
const SCREEN_NAME   = "REPLACE-ME-screenName";
const WIDTH         = 1440;
const HEIGHT        = 1024;
const BG_TOKEN      = "color.bg.default";
const PADDING_TOKEN = "spacing.32";
const GAP_TOKEN     = "spacing.24";
const RUN_ID        = "RUN_ID_HERE";

const bound = [];
const exceptions = [];

// --- idempotency: reuse a top-level board with this name on the current page ------------------
const root = penpot.currentPage.root;
let screen = (root.children || []).find(c => c.type === "board" && c.name === SCREEN_NAME) || null;
const reused = !!screen;

if (!screen) {
  screen = penpot.createBoard();
  screen.name = SCREEN_NAME;
  root.appendChild(screen);                          // on canvas first (#7); layoutChild only after append (#15)
  screen.resize(WIDTH, HEIGHT);                      // width/height are read-only (#5)
  const flex = screen.addFlexLayout();
  flex.dir = "column";
  flex.horizontalSizing = "fix";
  flex.verticalSizing = "auto";
}
if (!screen.flex) { const f = screen.addFlexLayout(); f.dir = "column"; f.horizontalSizing = "fix"; f.verticalSizing = "auto"; }

// --- FILL POLICY (#11): the screen root is THE surface — bound bg, never the default white ------
// Re-run safety (gotcha #2): re-applying a bound token toggles it OFF, and writing a literal to a bound
// property drops the binding — so every write below is skipped when the binding is already in place.
const has = (prop, name) => !!(screen.tokens && screen.tokens[prop] === name);
const bgTok = penpotUtils.findTokenByName(BG_TOKEN);
if (bgTok && has("fill", BG_TOKEN)) bound.push({ prop: "fill", token: BG_TOKEN, already: true });
else {
  screen.fills = [];
  if (bgTok) { screen.applyToken(bgTok, ["fill"]); bound.push({ prop: "fill", token: BG_TOKEN }); }
}
if (!bgTok) exceptions.push({ kind: "missing-token", token: BG_TOKEN, prop: "fill" });

// --- gap ------------------------------------------------------------------------------------------
const gapTok = penpotUtils.findTokenByName(GAP_TOKEN);
if (gapTok && has("rowGap", GAP_TOKEN)) bound.push({ prop: "rowGap", token: GAP_TOKEN, already: true });
else if (gapTok) { screen.applyToken(gapTok, ["rowGap"]); bound.push({ prop: "rowGap", token: GAP_TOKEN }); }
else exceptions.push({ kind: "missing-token", token: GAP_TOKEN, prop: "rowGap" });

// --- padding: bind per side; mirror the resolved number where the instance rejects it (#8) -------
// Capability ledger: if gotcha #8 is known to reproduce on this instance, skip straight to the mirror.
let caps = null;
try { const rawCaps = penpot.currentFile.getSharedPluginData("penpot-ai", "capabilities"); caps = rawCaps ? JSON.parse(rawCaps) : null; } catch (e) { caps = null; }
const skipPaddingBind = !!(caps && caps.gotcha8 === "reproduces");
const padTok = penpotUtils.findTokenByName(PADDING_TOKEN);
if (padTok) {
  const padValue = Number(padTok.resolvedValue);
  const SIDES = ["paddingTop", "paddingBottom", "paddingLeft", "paddingRight"];
  const FLEX_PROP = { paddingTop: "topPadding", paddingBottom: "bottomPadding", paddingLeft: "leftPadding", paddingRight: "rightPadding" };
  const mirrored = [];
  for (const side of SIDES) {
    if (has(side, PADDING_TOKEN)) { bound.push({ prop: side, token: PADDING_TOKEN, already: true }); continue; }
    if (!skipPaddingBind) {
      try { screen.applyToken(padTok, [side]); bound.push({ prop: side, token: PADDING_TOKEN }); continue; } catch (e) { /* mirror below */ }
    }
    if (Number.isFinite(padValue)) screen.flex[FLEX_PROP[side]] = padValue;
    mirrored.push(side);
  }
  if (mirrored.length) exceptions.push({ kind: "padding-mirrors-token", shape: screen.id, token: PADDING_TOKEN, sides: mirrored, value: padValue, why: skipPaddingBind ? "capabilities.gotcha8 = reproduces" : "applyToken rejected padding on this instance (gotcha #8); resolved value set on flex" });
} else {
  exceptions.push({ kind: "missing-token", token: PADDING_TOKEN, prop: "padding" });
}

// --- state + ledger -------------------------------------------------------------------------------
storage.bs = Object.assign(storage.bs || {}, { screenBoardId: screen.id, runId: RUN_ID });
let ledger = null;
try { const raw = penpot.currentFile.getSharedPluginData("penpot-ai", `${RUN_ID}.ledger`); ledger = raw ? JSON.parse(raw) : null; } catch (e) { ledger = null; }
ledger = Object.assign({ runId: RUN_ID, phase: 1, screenBoardId: screen.id, sections: [] }, ledger || {}, { phase: 1, screenBoardId: screen.id });
ledger.exceptions = (ledger.exceptions || []).concat(exceptions);
penpot.currentFile.setSharedPluginData("penpot-ai", `${RUN_ID}.ledger`, JSON.stringify(ledger));

return { screenBoardId: screen.id, reused, bound, exceptions };
