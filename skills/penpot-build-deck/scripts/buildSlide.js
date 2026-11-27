/**
 * buildSlide.js
 * Purpose: build ONE slide as a 1920×1080 Board on the deck page — the surface bound to deck.bg.<tone>,
 *          a flex column with the margin bound to deck.space.margin, and the archetype's recipe inside
 *          (references/03-slide-archetypes.md). One slide per execute_code call, never more.
 * Usage:   paste into execute_code for each slide (Phases 2..N). Precondition: createDeckPage.js
 *          PHASE=verify returned ok:true and setupDeckSystem.js ran.
 * Input:   INDEX, ARCHETYPE, SLUG, TONE, ANCHOR, CONTENT, NOTES (all REPLACE-ME).
 * Output:  { slideId, name, archetype, visualCount, minFontSize, exceptions, flipCleared }.
 * Note:    gotchas #11 (fill policy), #13b (exact font), #14 (page coords for absolute children),
 *          #15 (layoutChild only after append), #16 (clearFlip), #17 (waitForLayoutUpdate).
 *          Verify unfamiliar members with penpot_api_info("Board","addGridLayout") etc.
 */
const INDEX = 1;                       // REPLACE-ME: 1-based slide number
const ARCHETYPE = "cover";             // REPLACE-ME: cover | agenda | section | content-bullets | content-cards | big-number | two-column | feature-grid | bento | quote | timeline | process-steps | image-bleed | chart-placeholder | closing
const SLUG = "launch";                 // REPLACE-ME: kebab-case, ≤ 3 words
const TONE = "dark";                   // REPLACE-ME: dark | light  (tonal arc, references/01)
const ANCHOR = "left";                 // REPLACE-ME: left | right | top | bottom | center (center only for cover/quote/closing)
const CONTENT = {                      // REPLACE-ME: only the fields the archetype consumes (references/03)
  eyebrow: "",                         // small label above the title, ≤ 4 words
  title: "REPLACE-ME title",           // ≤ 8 words
  body: [],                            // bullets or short paragraphs (≤ 6, ≤ 60 chars each)
  stats: [],                           // [{ value: "2.4×", label: "faster onboarding", source: "Internal Q3 report" }] ≤ 4
  columns: [],                         // [{ heading, items: [] }] for two-column / comparison (2)
  quote: null,                         // { text, attribution } (≤ 30 words)
  steps: [],                           // [{ label, detail }] ≤ 5 (timeline / process-steps)
  imageSlots: [],                      // [{ description, url? }] — url only if the USER supplied it
  cards: [],                           // [{ title, detail }] ≤ 6 (content-cards / feature-grid / bento)
};
const NOTES = "";                      // REPLACE-ME: speaker notes → hidden `notes` layer ("" = none)

// ---------- preconditions ----------
if (!(storage.deck && storage.deck.verified && penpot.currentPage.id === storage.deck.pageId)) {
  return { halted: true, reason: "Deck page not verified as current. Run createDeckPage.js PHASE=verify first (gotcha #15)." };
}
const NAME = `${String(INDEX).padStart(2, "0")}-${ARCHETYPE}-${SLUG}`;
const existing = penpot.currentPage.root.children.find((c) => c.type === "board" && c.name === NAME);
if (existing) return { slideId: existing.id, name: NAME, reused: true, note: "Slide already exists — edit it in place or remove() it first." };

// ---------- helpers ----------
const W = 1920, H = 1080, MARGIN = 96, COL = 100, GUTTER = 48;
const span = (n) => n * COL + (n - 1) * GUTTER;          // 4 → 544, 6 → 840, 8 → 1136
const tok = (n) => penpotUtils.findTokenByName(n);
const exceptions = [];
const bind = (shape, tokenName, props, fallback) => {
  const t = tok(tokenName);
  // apply only what is not already bound: a re-applied token toggles its binding OFF (gotchas #2)
  if (t) { try { const todo = props.filter(p => !(shape.tokens && shape.tokens[p] === t.name)); if (todo.length) shape.applyToken(t, todo); return true; } catch (e) { exceptions.push({ kind: "bind-failed", token: tokenName, props, error: String(e) }); } }
  else exceptions.push({ kind: "token-missing", token: tokenName, props });
  if (fallback) fallback();
  return false;
};
const font = (storage.deck.font && (penpot.fonts.all || []).find((f) => f.name === storage.deck.font)) || null;
const variantFor = (weight) => font && (font.variants.find((v) => String(v.fontWeight) === String(weight)) || font.variants[0]);

const textColorToken = TONE === "dark" ? "deck.text.on-dark" : "deck.text.on-light";
const sizes = { stat: 180, title: 88, section: 44, body: 32, caption: 22 };
const text = (str, role, { weight = 400, color = textColorToken, width = null, align = "left", name = role } = {}) => {
  const t = penpot.createText(str);
  t.name = name;
  if (font) { try { font.applyToText(t, variantFor(weight)); } catch (e) { exceptions.push({ kind: "font-apply-failed", error: String(e) }); } }
  // Re-assert after applyToText (gotcha #13b): size from token, line-height by role.
  const sizeTok = tok(`deck.font.size.${role}`);
  t.fontSize = String(sizeTok ? sizeTok.resolvedValue : sizes[role]);
  t.lineHeight = role === "stat" ? "1" : role === "title" ? "1.1" : role === "section" ? "1.15" : "1.35";
  t.letterSpacing = role === "title" || role === "stat" ? "-1.5" : "0";
  t.align = align;
  t.fontWeight = String(weight);
  if (width) { t.resize(width, 10); t.growType = "auto-height"; } else { t.growType = "auto-width"; }
  bind(t, color, ["fill"], () => { t.fills = [{ fillColor: TONE === "dark" ? "#F5F7FA" : "#15181F", fillOpacity: 1 }]; });
  if (sizeTok) { try { t.applyToken(sizeTok, ["fontSize"]); } catch {} }
  return t;
};
const box = (name, parent, { dir = "column", gap = 24, align = "start", justify = "start", w = null, h = null, hSizing = "fix", vSizing = "auto", surface = null } = {}) => {
  const b = penpot.createBoard();
  b.name = name;
  if (w || h) b.resize(w || 100, h || 100);
  const f = b.addFlexLayout();
  f.dir = dir; f[dir.startsWith("row") ? "columnGap" : "rowGap"] = gap; f.alignItems = align; f.justifyContent = justify;
  f.horizontalSizing = hSizing; f.verticalSizing = vSizing;
  b.fills = [];                                           // structural by default (fill policy #11)
  if (surface) { bind(b, surface, ["fill"]); bind(b, "deck.radius.card", ["borderRadiusTopLeft", "borderRadiusTopRight", "borderRadiusBottomRight", "borderRadiusBottomLeft"], () => { b.borderRadius = 24; }); }
  parent.appendChild(b);                                  // append FIRST, then layoutChild (gotcha #15)
  return b;
};
const placeholder = (parent, w, h, description) => {
  const p = penpot.createBoard();
  p.name = "img-placeholder";
  p.resize(w, h);
  const f = p.addFlexLayout(); f.alignItems = "center"; f.justifyContent = "center"; f.horizontalSizing = "fix"; f.verticalSizing = "fix";
  p.fills = [];
  bind(p, "deck.surface.placeholder", ["fill"], () => { p.fills = [{ fillColor: TONE === "dark" ? "#232A3D" : "#E6E8EC", fillOpacity: 1 }]; });
  bind(p, "deck.radius.card", ["borderRadiusTopLeft", "borderRadiusTopRight", "borderRadiusBottomRight", "borderRadiusBottomLeft"], () => { p.borderRadius = 24; });
  parent.appendChild(p);
  const label = text(`IMAGE — ${description || "describe the image here"}`, "caption", { color: "deck.text.muted", align: "center", name: "caption" });
  p.appendChild(label);
  return p;
};
const stat = (parent, s) => {
  const col = box("stat", parent, { dir: "column", gap: 8 });
  col.appendChild(text(s.value, "stat", { weight: 700, name: "stat-value" }));
  col.appendChild(text(s.label, "body", { color: "deck.text.muted", name: "stat-label" }));
  if (s.source) col.appendChild(text(`Source: ${s.source}`, "caption", { color: "deck.text.muted", name: "caption" }));
  return col;
};

// ---------- slide frame (the surface) ----------
const slide = penpot.createBoard();
slide.name = NAME;
slide.resize(W, H);
const i = INDEX - 1;
slide.x = (i % 4) * (W + 160); slide.y = Math.floor(i / 4) * (H + 160);   // contact grid on the deck page
slide.clipContent = true;
if ("showInViewMode" in slide) slide.showInViewMode = true;
const root = slide.addFlexLayout();
root.dir = "column"; root.horizontalSizing = "fix"; root.verticalSizing = "fix";
root.justifyContent = ANCHOR === "bottom" ? "end" : ANCHOR === "center" ? "center" : "start";
root.alignItems = ANCHOR === "right" ? "end" : ANCHOR === "center" ? "center" : "start";
root.rowGap = 48;
slide.fills = [];
bind(slide, `deck.bg.${TONE}`, ["fill"], () => { slide.fills = [{ fillColor: TONE === "dark" ? "#0B1020" : "#F7F7F5", fillOpacity: 1 }]; });
penpot.currentPage.root.appendChild(slide);
for (const side of ["paddingTop", "paddingBottom", "paddingLeft", "paddingRight"]) {
  const ok = bind(slide, "deck.space.margin", [side]);
  if (!ok) root[side.replace("padding", "").toLowerCase() + "Padding"] = MARGIN;
}
const contentW = W - 2 * MARGIN;          // 1728

// ---------- archetype recipes (references/03-slide-archetypes.md) ----------
let visualCount = 0;
const head = (parent, { titleWidth = span(8), titleRole = "title" } = {}) => {
  const h = box("header", parent, { dir: "column", gap: 16 });
  if (CONTENT.eyebrow) h.appendChild(text(CONTENT.eyebrow.toUpperCase(), "caption", { weight: 600, color: "deck.accent", name: "eyebrow" }));
  h.appendChild(text(CONTENT.title, titleRole, { weight: 700, width: titleWidth, name: "h1" }));
  return h;
};
const bullets = (parent, items, width) => {
  const list = box("list", parent, { dir: "column", gap: 20 });
  for (const it of items.slice(0, 6)) list.appendChild(text(it, "body", { width, name: "p" }));
  return list;
};

switch (ARCHETYPE) {
  case "cover": {
    head(slide, { titleWidth: span(9) });
    if (CONTENT.body[0]) slide.appendChild(text(CONTENT.body[0], "section", { weight: 400, color: "deck.text.muted", width: span(8), name: "h2" }));
    const deco = penpot.createEllipse();                 // the motif — an accent form hanging off the edge (visual #1)
    deco.name = "deco-glow"; deco.resize(720, 720);
    deco.fills = [{ fillColor: "#4F7CFF", fillOpacity: 0.35 }];
    bind(deco, "deck.accent", ["fill"]);
    slide.appendChild(deco); deco.layoutChild.absolute = true;
    deco.x = slide.x + W - 360; deco.y = slide.y - 240;   // page coords (gotcha #14), clipped by the board
    deco.sendToBack();
    visualCount++;
    break;
  }
  case "agenda": {
    const row = box("safe-area", slide, { dir: "row", gap: GUTTER, align: "start" });
    const left = box("col-left", row, { dir: "column", gap: 24, w: span(5) });
    head(left, { titleWidth: span(5) });
    const right = box("col-right", row, { dir: "column", gap: 20, w: span(7) });
    CONTENT.body.slice(0, 6).forEach((it, k) => {
      const line = box("agenda-item", right, { dir: "row", gap: 32, align: "center" });
      line.appendChild(text(String(k + 1).padStart(2, "0"), "section", { weight: 700, color: "deck.accent", name: "stat" }));
      line.appendChild(text(it, "body", { width: span(5), name: "p" }));
    });
    visualCount++;                                       // the numeral column is the visual device
    break;
  }
  case "section": {
    head(slide, { titleWidth: span(10) });
    const num = text(String(INDEX).padStart(2, "0"), "stat", { weight: 700, color: "deck.accent", name: "stat" });
    slide.appendChild(num); num.layoutChild.absolute = true;
    num.x = slide.x + W - 520; num.y = slide.y + H - 300;
    visualCount++;
    break;
  }
  case "content-bullets": {
    const row = box("safe-area", slide, { dir: "row", gap: GUTTER, align: "start" });
    const left = box("col-left", row, { dir: "column", gap: 32, w: span(7) });
    head(left, { titleWidth: span(7) });
    bullets(left, CONTENT.body, span(7));
    const slot = CONTENT.imageSlots[0] || { description: "supporting visual" };
    placeholder(row, span(5), 700, slot.description);
    visualCount++;
    break;
  }
  case "content-cards":
  case "feature-grid": {
    head(slide);
    const cards = CONTENT.cards.slice(0, 6);
    const cols = cards.length <= 3 ? cards.length || 3 : 3;
    const rows = Math.ceil(cards.length / cols) || 1;
    const grid = penpot.createBoard(); grid.name = "grid"; grid.resize(contentW, 560); grid.fills = [];
    slide.appendChild(grid);
    let useGrid = false;
    try {
      const g = grid.addGridLayout(); g.rows = rows; g.columns = cols; g.rowGap = 32; g.columnGap = GUTTER;
      useGrid = true;
    } catch (e) { exceptions.push({ kind: "grid-unavailable", error: String(e) }); grid.remove(); }
    const host = useGrid ? grid : box("cards-row", slide, { dir: "row", gap: GUTTER });
    cards.forEach((c, k) => {
      const card = penpot.createBoard(); card.name = "card"; card.resize(useGrid ? 100 : (contentW - GUTTER * (cols - 1)) / cols, 240);
      const f = card.addFlexLayout(); f.dir = "column"; f.rowGap = 12; f.verticalPadding = 32; f.horizontalPadding = 32; f.verticalSizing = "auto";
      card.fills = [];
      bind(card, TONE === "dark" ? "deck.surface.card" : "deck.bg.light", ["fill"], () => { card.fills = [{ fillColor: TONE === "dark" ? "#161C2E" : "#FFFFFF", fillOpacity: 1 }]; });
      bind(card, "deck.radius.card", ["borderRadiusTopLeft", "borderRadiusTopRight", "borderRadiusBottomRight", "borderRadiusBottomLeft"], () => { card.borderRadius = 24; });
      if (useGrid) host.grid.appendChild(card, Math.floor(k / cols) + 1, (k % cols) + 1); else host.appendChild(card);
      card.appendChild(text(c.title, "section", { weight: 600, name: "h2" }));
      if (c.detail) card.appendChild(text(c.detail, "body", { color: "deck.text.muted", width: 440, name: "p" }));
    });
    visualCount += cards.length ? 1 : 0;
    break;
  }
  case "big-number": {
    const row = box("safe-area", slide, { dir: "row", gap: GUTTER * 2, align: "end" });
    const s0 = CONTENT.stats[0] || { value: "—", label: "metric TBD", source: "" };
    stat(row, s0);
    const right = box("col-right", row, { dir: "column", gap: 24, w: span(6) });
    right.appendChild(text(CONTENT.title, "section", { weight: 700, width: span(6), name: "h1" }));
    bullets(right, CONTENT.body, span(6));
    if (CONTENT.stats.length > 1) {
      const more = box("stats-row", slide, { dir: "row", gap: GUTTER * 2 });
      CONTENT.stats.slice(1, 4).forEach((s) => stat(more, { ...s, value: s.value }));
    }
    visualCount++;
    break;
  }
  case "two-column": {
    head(slide);
    const row = box("safe-area", slide, { dir: "row", gap: GUTTER * 2, align: "start" });
    (CONTENT.columns.length ? CONTENT.columns : [{ heading: "Before", items: [] }, { heading: "After", items: [] }]).slice(0, 2).forEach((c, k) => {
      const col = box(`col-${k + 1}`, row, { dir: "column", gap: 20, w: span(6) });
      col.appendChild(text(c.heading, "section", { weight: 700, color: k === 1 ? "deck.accent" : textColorToken, name: "h2" }));
      bullets(col, c.items || [], span(6));
    });
    const rule = penpot.createRectangle(); rule.name = "divider"; rule.resize(2, 520);
    rule.fills = [{ fillColor: "#8A93A6", fillOpacity: 0.4 }]; bind(rule, "deck.text.muted", ["fill"]);
    row.insertChild(1, rule);
    visualCount++;
    break;
  }
  case "bento": {
    head(slide);
    const row = box("safe-area", slide, { dir: "row", gap: GUTTER, align: "start" });
    const cards = CONTENT.cards.slice(0, 3);
    const dominant = box("card-dominant", row, { dir: "column", gap: 16, w: span(8), h: 520, vSizing: "fix", surface: TONE === "dark" ? "deck.surface.card" : "deck.bg.light" });
    dominant.flex.verticalPadding = 40; dominant.flex.horizontalPadding = 40;
    dominant.appendChild(text((cards[0] && cards[0].title) || CONTENT.title, "section", { weight: 700, width: span(7), name: "h2" }));
    if (cards[0] && cards[0].detail) dominant.appendChild(text(cards[0].detail, "body", { color: "deck.text.muted", width: span(7), name: "p" }));
    const stack = box("card-stack", row, { dir: "column", gap: GUTTER, w: span(4) });
    cards.slice(1, 3).forEach((c) => {
      const small = box("card", stack, { dir: "column", gap: 12, w: span(4), h: 236, vSizing: "fix", surface: TONE === "dark" ? "deck.surface.card" : "deck.bg.light" });
      small.flex.verticalPadding = 32; small.flex.horizontalPadding = 32;
      small.appendChild(text(c.title, "body", { weight: 600, name: "h3" }));
      if (c.detail) small.appendChild(text(c.detail, "caption", { color: "deck.text.muted", width: span(4) - 64, name: "p" }));
    });
    visualCount++;
    break;
  }
  case "quote": {
    const q = CONTENT.quote || { text: CONTENT.title, attribution: "" };
    const mark = text("“", "stat", { weight: 700, color: "deck.accent", name: "quote-mark" });
    slide.appendChild(mark);
    slide.appendChild(text(q.text, "section", { weight: 500, width: span(10), name: "blockquote" }));
    if (q.attribution) slide.appendChild(text(`— ${q.attribution}`, "body", { color: "deck.text.muted", name: "cite" }));
    visualCount++;
    break;
  }
  case "timeline":
  case "process-steps": {
    head(slide);
    const row = box("safe-area", slide, { dir: "row", gap: GUTTER, align: "start" });
    const steps = CONTENT.steps.slice(0, 5);
    const w = Math.floor((contentW - GUTTER * (steps.length - 1)) / Math.max(steps.length, 1));
    steps.forEach((s, k) => {
      const col = box("step", row, { dir: "column", gap: 16, w });
      const dot = penpot.createEllipse(); dot.name = "step-marker"; dot.resize(24, 24);
      dot.fills = [{ fillColor: "#4F7CFF", fillOpacity: 1 }]; bind(dot, "deck.accent", ["fill"]);
      col.appendChild(dot);
      col.appendChild(text(`${String(k + 1).padStart(2, "0")}  ${s.label}`, "body", { weight: 600, width: w, name: "h3" }));
      if (s.detail) col.appendChild(text(s.detail, "caption", { color: "deck.text.muted", width: w, name: "p" }));
    });
    visualCount++;
    break;
  }
  case "image-bleed": {
    const row = box("safe-area", slide, { dir: "row", gap: GUTTER, align: "center" });
    const left = box("col-left", row, { dir: "column", gap: 24, w: span(5) });
    head(left, { titleWidth: span(5) });
    if (CONTENT.body[0]) left.appendChild(text(CONTENT.body[0], "body", { color: "deck.text.muted", width: span(5), name: "p" }));
    const slot = CONTENT.imageSlots[0] || { description: "full-height image" };
    const img = placeholder(row, span(7) + MARGIN, H, slot.description);   // bleeds past the right margin; the board clips it
    img.layoutChild.absolute = true; img.x = slide.x + W - (span(7) + MARGIN); img.y = slide.y;
    img.sendToBack();
    visualCount++;
    break;
  }
  case "chart-placeholder": {
    head(slide, { titleWidth: span(10) });                 // the title states the insight, the chart shows it
    const chart = placeholder(slide, contentW, 600, `chart: ${CONTENT.body[0] || "describe the data"}`);
    chart.name = "chart-placeholder";
    visualCount++;
    break;
  }
  case "closing": {
    head(slide, { titleWidth: span(9) });
    if (CONTENT.body[0]) slide.appendChild(text(CONTENT.body[0], "section", { weight: 400, color: "deck.text.muted", width: span(8), name: "p" }));
    const bar = penpot.createRectangle(); bar.name = "deco-block"; bar.resize(640, H);
    bar.fills = [{ fillColor: "#4F7CFF", fillOpacity: 0.9 }]; bind(bar, "deck.accent", ["fill"]);
    slide.appendChild(bar); bar.layoutChild.absolute = true; bar.x = slide.x + W - 400; bar.y = slide.y; bar.sendToBack();
    visualCount++;
    break;
  }
  default:
    exceptions.push({ kind: "unknown-archetype", archetype: ARCHETYPE });
}

// ---------- speaker notes (kit convention: hidden `notes` layer) ----------
if (NOTES) {
  const n = penpot.createText(NOTES); n.name = "notes"; n.growType = "auto-height"; n.resize(600, 10);
  slide.appendChild(n); n.layoutChild.absolute = true; n.x = slide.x + 32; n.y = slide.y + H + 40;   // outside the clipped area
  n.hidden = true;
}

// ---------- settle + sweep ----------
if (typeof slide.waitForLayoutUpdate === "function") { try { await slide.waitForLayoutUpdate(); storage.deck.capabilities.waitForLayoutUpdate = "works"; } catch (e) { storage.deck.capabilities.waitForLayoutUpdate = "throws"; } }
const clearFlip = (sh) => { let n = 0; const walk = (s) => { if (s.flipX) { s.flipX = false; n++; } (s.children || []).forEach(walk); }; walk(sh); return n; };
const flipCleared = clearFlip(slide);
let minFontSize = Infinity;
penpotUtils.analyzeDescendants(slide, (r, d) => { if (d.type === "text" && !d.hidden) minFontSize = Math.min(minFontSize, parseFloat(d.fontSize) || Infinity); return null; }, 8);

storage.deck.slides = (storage.deck.slides || []).filter((s) => s.name !== NAME);
storage.deck.slides.push({ n: INDEX, id: slide.id, name: NAME, archetype: ARCHETYPE, tone: TONE, anchor: ANCHOR, done: true });
storage.deck.slides.sort((a, b) => a.n - b.n);
storage.deck.exceptions = [...(storage.deck.exceptions || []), ...exceptions];
try {
  const runId = storage.deck.runId || "RUN_ID_HERE";
  const led = JSON.parse(penpot.currentFile.getSharedPluginData("penpot-ai", runId + ".ledger") || "{}");
  led.slides = storage.deck.slides; led.exceptions = storage.deck.exceptions; led.phase = INDEX <= 3 ? 2 : 3;
  penpot.currentFile.setSharedPluginData("penpot-ai", runId + ".ledger", JSON.stringify(led));
} catch {}

return { slideId: slide.id, name: NAME, archetype: ARCHETYPE, tone: TONE, anchor: ANCHOR, visualCount, minFontSize: isFinite(minFontSize) ? minFontSize : null, exceptions, flipCleared, next: "export_shape(slideId) → look → fix (max 2) → next slide" };
