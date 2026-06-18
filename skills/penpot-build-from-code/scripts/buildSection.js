/**
 * buildSection.js  —  Phase 2 (Incremental section build), ONE section per call
 *
 * PURPOSE
 *   Build exactly ONE section from a code fragment, on-system:
 *     - prefer an existing library component (instance) for any node with a matching role
 *     - create a flex Board container + bespoke shapes only for genuinely custom parts
 *     - bind EVERY style value to a token via applyToken (never hardcode hex/spacing/radius)
 *   Append children in source order; let flex (not x/y) position them.
 *
 * USAGE
 *   Paste into a single execute_code call, once per section. Requires storage.run.ds + storage.run.boardId.
 *   Token application is async — verify resolvedValue/bindings in a LATER execute_code call.
 *
 * INPUTS  (placeholders — fill from the section's code fragment + Phase 0 style inventory)
 *   RUN_ID_HERE            — run slug.
 *   REPLACE-ME-sectionRole — semantic kebab name, e.g. "header" / "card-container".
 *   REPLACE-ME-flexDir     — "row" | "column".
 *   REPLACE-ME-gapToken    — spacing token for this section's gap, e.g. "spacing.4".
 *   REPLACE-ME-surfaceToken — OPTIONAL bg token IF this section is a genuine surface (card/panel),
 *                             e.g. "color.bg.surface". Leave null for a plain layout container.
 *   REPLACE-ME-nodes       — ordered node spec array, see SPEC below.
 *
 * NODE SPEC (one object per child, in source order):
 *   { kind:"component", role:"button", text:"Save", variants:{ Hierarchy:"Primary", Size:"Medium" } }
 *   { kind:"text",      text:"Settings", tokens:{ fontSize:"font.size.300", fill:"color.text.default" } }
 *   { kind:"rect",      sizing:{ w:48, h:48 }, tokens:{ fill:"color.surface.subtle", borderRadius:"radius.control" } }
 *
 * OUTPUT
 *   return { section, sectionId, created:[...], bound:[...], proposed:[...], usedComponents }.
 *
 * NOTE
 *   Verify unfamiliar signatures with penpot_api_info (e.g. "LibraryComponent" instance,
 *   "Shape" applyToken / switchVariant) before relying on them.
 */

const RUN_ID  = "RUN_ID_HERE";
const ROLE    = "REPLACE-ME-sectionRole";
const FLEXDIR = "REPLACE-ME-flexDir";        // "row" | "column"
const GAPTOK  = "REPLACE-ME-gapToken";
const SURFACE_TOKEN = null;                  // REPLACE-ME-surfaceToken: bg token ONLY if this section is a card/panel surface; else null
const NODES   = "REPLACE-ME-nodes";          // replace with the node spec array (see header)

const ds    = storage.run.ds;
const board = penpotUtils.findShapeById(storage.run.boardId);

// --- idempotency: reuse the section container if it already exists --------
let section = (board.children || []).find(c => c.name === ROLE);
let created = false;
if (!section) {
  section = penpot.createBoard();
  section.name = ROLE;                       // semantic, kebab-case
  board.appendChild(section);                // append BEFORE configuring flex children
  section.addFlexLayout();
  section.flex.dir = FLEXDIR;
  section.layoutChild = section.layoutChild || {};
  section.layoutChild.horizontalSizing = "fill";   // stretch across the screen column
  created = true;
}
// FILL POLICY (gotchas #11): a section is structural by default — clear Penpot's default opaque white
// so the screen bg shows through and dark mode works. Only bind a bg token if it's a genuine surface.
section.fills = [];
const surfTok = SURFACE_TOKEN && penpotUtils.findTokenByName(SURFACE_TOKEN);
if (surfTok) section.applyToken(surfTok, ["fill"]);   // bound surface -> follows light/dark switch

const gapTok = penpotUtils.findTokenByName(GAPTOK);
if (gapTok) section.applyToken(gapTok, [FLEXDIR === "row" ? "columnGap" : "rowGap"]);

// --- helpers -------------------------------------------------------------
const createdList = [];
const boundList = [];
const proposed = [];

function bindTokens(shape, tokenMap) {
  // tokenMap: { property: tokenName }
  for (const prop in tokenMap) {
    const name = tokenMap[prop];
    const tok = penpotUtils.findTokenByName(name);
    if (tok) { shape.applyToken(tok, [prop]); boundList.push({ id: shape.id, prop, token: name }); }
    else proposed.push({ shape: shape.id, prop, wantedToken: name });   // missing token -> propose, never literal
  }
}

let usedComponents = 0;

// --- build nodes in source order -----------------------------------------
for (const node of NODES) {
  if (node.kind === "component") {
    const cat = ds.componentsByRole[node.role];
    if (cat) {
      const comp = penpot.library.local.components.find(c => c.id === cat.id);
      const inst = comp.instance();                 // instance, NOT a redrawn box
      section.appendChild(inst);
      // set label without restructuring the instance (no detach for content-only changes)
      if (node.text) {
        const txt = penpotUtils.findShape(s => s.type === "text", inst);
        if (txt) txt.characters = node.text;
      }
      // map code intent -> variant axes discovered in Phase 0
      if (node.variants) for (const axis in node.variants) {
        try { inst.switchVariant(axis, node.variants[axis]); } catch (e) { proposed.push({ note: "variant axis", axis, value: node.variants[axis] }); }
      }
      usedComponents++;
      createdList.push({ kind: "instance", role: node.role, id: inst.id });
    } else {
      // no component for this role -> record so a human can decide (do not silently fake it)
      proposed.push({ note: "no component for role", role: node.role });
    }
  } else if (node.kind === "text") {
    const t = penpot.createText(node.text || "");
    section.appendChild(t);
    t.growType = "auto-width";                       // reflow; resize() would force "fixed"
    if (node.tokens) bindTokens(t, node.tokens);
    createdList.push({ kind: "text", id: t.id, text: node.text });
  } else if (node.kind === "rect") {
    const r = penpot.createRectangle();
    section.appendChild(r);
    if (node.sizing) r.resize(Number(node.sizing.w), Number(node.sizing.h));  // width/height read-only
    if (node.tokens) bindTokens(r, node.tokens);
    createdList.push({ kind: "rect", id: r.id });
  }
}

// --- ledger --------------------------------------------------------------
const raw = penpot.currentFile.getSharedPluginData("penpot-ai", `${RUN_ID}.ledger`);
const ledger = raw ? JSON.parse(raw) : { runId: RUN_ID, phase: 2, boardId: board.id, created: [], sectionsBuilt: [], proposedTokens: [], exceptions: [] };
ledger.phase = 2;
ledger.created = ledger.created.concat(createdList);
ledger.proposedTokens = ledger.proposedTokens.concat(proposed.filter(p => p.wantedToken).map(p => ({ from: p.wantedToken, prop: p.prop })));
// sectionsBuilt is appended only AFTER the section passes its checkpoint — left to the caller.
penpot.currentFile.setSharedPluginData("penpot-ai", `${RUN_ID}.ledger`, JSON.stringify(ledger));
penpot.currentFile.setSharedPluginData("penpot-ai", `${RUN_ID}.phase`, "2");

return {
  section: ROLE,
  sectionId: section.id,
  sectionCreated: created,
  created: createdList,
  bound: boundList,
  proposed,
  usedComponents
};
