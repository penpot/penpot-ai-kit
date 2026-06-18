/**
 * buildContextCard.js
 * Purpose: Phase 3 — build (or instance) the Critique Card, fill it from the brief, and place it to the
 *          LEFT of the design. Does NOT touch the design.
 * Usage:   paste into execute_code (one call). Requires storage.dh.designBoardId, storage.dh.brief,
 *          storage.dh.tokens (from setupAnnotationKit.js).
 * Input:   reads storage.dh; CARD_WIDTH, GUTTER below.
 * Output:  { contextCardId, x, y }.
 * Notes:   Prefer instancing an existing "Critique Card" component (storage.dh.kit.critiqueCardId) and
 *          overriding text. Bind colors/type to annotation tokens; never hardcode. Card is a SURFACE
 *          (bind bg to color.annotation.surface); inner section boards are structural (fills = []).
 *          Verify Text/Board members with penpot_api_info if unsure.
 */
const CARD_WIDTH = 520;   // matches the reference system
const GUTTER = 80;        // on-grid gap between card and design

const dh = storage.dh || {};
const brief = dh.brief;
const design = dh.designBoardId && penpotUtils.findShapeById(dh.designBoardId);
if (!design) return { error: "storage.dh.designBoardId not set — run Phase 0 first." };
if (!brief)  return { error: "storage.dh.brief not set — run Phase 1 first." };
const tok = n => (n ? penpotUtils.findTokenByName(n) : null);
const T = dh.tokens || {};

// idempotency: don't build a second card
if (dh.contextCardId && penpotUtils.findShapeById(dh.contextCardId)) {
  return { contextCardId: dh.contextCardId, note: "Context card already exists — reusing." };
}

let card;
if (dh.kit && dh.kit.critiqueCardId) {
  const comp = penpot.library.local.components.find(c => c.id === dh.kit.critiqueCardId)
    || (penpot.library.connected || []).flatMap(l => l.components).find(c => c.id === dh.kit.critiqueCardId);
  card = comp && comp.instance();
}
if (!card) {
  // minimal fallback card (build per references/01 + 04). Flex column-reverse like the reference.
  card = penpot.createBoard(); card.name = "context-card";
  const f = penpotUtils.addFlexLayout(card, "column"); // visual top->bottom; reference uses column-reverse + reversed append
  f.rowGap = 24; f.topPadding = f.bottomPadding = 24; f.leftPadding = f.rightPadding = 12;
  f.horizontalSizing = "fix"; f.verticalSizing = "auto";
  card.fills = []; const surf = tok(T.surface); if (surf) card.applyToken(surf, ["fill"]);

  const accent = tok(T.accent), body = tok(T.body);
  const sizeLabel = tok(T.labelSize), sizeBody = tok(T.bodySize), sizeTitle = tok(T.titleSize);
  // VALIDATED: set family+weight via the Font API (a fontFamilies token does NOT apply via applyToken),
  // and apply fontSize/fill tokens. See references/04 "Validated API gotchas".
  const ws = penpot.fonts.findByName("Work Sans");
  const vReg = ws.variants.find(v => v.fontWeight == "400"), vMed = ws.variants.find(v => v.fontWeight == "500");
  function mkText(chars, { size, medium, upper, fill } = {}) {
    const t = penpot.createText(String(chars == null ? "" : chars)); t.growType = "auto-height";
    ws.applyToText(t, medium ? vMed : vReg);
    const s = tok(size); if (s) t.applyToken(s, ["fontSize"]);
    if (upper) t.textTransform = "uppercase";
    const f = tok(fill); if (f) t.applyToken(f, ["fill"]);
    return t;
  }
  function section(labelText, bodyText, opts = {}) {
    const sec = penpot.createBoard(); sec.name = labelText.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const sf = penpotUtils.addFlexLayout(sec, "column"); sf.rowGap = 4; sf.horizontalSizing = "fill"; sf.verticalSizing = "auto";
    sec.fills = [];
    sec.appendChild(mkText(labelText, { size: T.labelSize, medium: true, upper: true, fill: T.accent }));
    if (bodyText) sec.appendChild(mkText(bodyText, { size: opts.title ? T.titleSize : T.bodySize, fill: T.body }));
    card.appendChild(sec);
    return sec;
  }
  // order top->bottom
  section(`#${brief.usNumber || ""}  ${brief.title || ""}`.trim(), "");
  section("Goal/Purpose of these designs", brief.goal || "", { title: true });
  if (brief.links && brief.links.length) section("Links", brief.links.join("\n"));
  if (brief.designers && brief.designers.length) section("Designer(s)", brief.designers.join(", "));
  section("Context", brief.context || "");
  if (brief.feedbackWanted) section("What type of feedback we're looking for", brief.feedbackWanted);
  if (brief.feedbackNot) section("What type of feedback we're NOT looking for", brief.feedbackNot);
  penpot.currentPage.root.appendChild(card);
  card.resize(CARD_WIDTH, card.height);
  // VALIDATED: auto-height text only wraps once it fills its container's width — otherwise the card
  // renders absurdly tall. Set every text (and section board) to fill. See references/04.
  penpotUtils.findShapes(s => s.type === "text", card).forEach(t => { if (t.layoutChild) try { t.layoutChild.horizontalSizing = "fill"; } catch (e) {} });
  penpotUtils.findShapes(s => s.type === "board" && s.flex, card).forEach(s => { if (s.layoutChild) try { s.layoutChild.horizontalSizing = "fill"; } catch (e) {} });
}

card.resize(CARD_WIDTH, card.height);
card.x = design.x - GUTTER - CARD_WIDTH;
card.y = design.y;
dh.contextCardId = card.id;
storage.dh = dh;
return { contextCardId: card.id, x: Math.round(card.x), y: Math.round(card.y),
  reused: !!(dh.kit && dh.kit.critiqueCardId) };
