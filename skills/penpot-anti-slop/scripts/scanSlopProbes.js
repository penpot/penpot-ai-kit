/**
 * scanSlopProbes.js
 * Purpose: the deterministic half of the anti-slop diagnosis (shared/anti-slop.md §1, `probe` rows).
 *          Walks the shape tree of one screen board (or every slide of a deck page) and reports which
 *          generic-AI tells are measurably present. Read-only — never mutates.
 * Usage:   paste into ONE execute_code call (Phase 1 of penpot-anti-slop diagnose).
 * Input:   ROOT_ID  — board id to scan; falls back to storage.bs.screenBoardId, then the first selected shape.
 *          MODE     — "screen" (default) or "deck" (each direct child board of ROOT_ID — or of the page root — is a slide).
 * Output:  { listsVersion, scope, regions, findings:[{ key, weight, p:1, source:"probe", status?, region, shapeIds, evidence }],
 *            signals:[{ key:"chosen-typeface", present, evidence }], primaryFamily, stats }
 *          and writes storage.slop = { findings, signals, template:null } (probe findings only; the review pass appends).
 * Notes:   - LISTS is a copy of shared/anti-slop/lists.json — keep LISTS_VERSION equal to its `version`
 *            (scripts/dev/validate-kit.mjs checks it).
 *          - Property names verified with penpot_api_info (Text.align/fontFamily/fontStyle are "mixed" when ranges
 *            differ; fontSize is a string; Board.backgroundBlur / ShapeBase.blur are { value, hidden }; Gradient.stops;
 *            TextRange.fontFamily via text.getRange(i, i+1) for mixed texts).
 *          - Validated live on a Penpot file (2026-10-06): 15/15 planted probe tells found on the sloppy-landing fixture.
 *          - Region kinds come from semantic layer names (shared/naming-conventions.md); unnamed files degrade to
 *            "content" + a hero guessed from the largest text near the top. Run penpot-rename-layers first for best results.
 */
const ROOT_ID = "REPLACE-ME";   // or leave as-is to use storage.bs.screenBoardId / the selection
const MODE = "screen";          // "screen" | "deck"

const LISTS_VERSION = "2026.10.1";
const LISTS = {
  fontsDefault: ["Inter", "Inter Tight", "Geist", "Geist Sans", "Roboto", "Arial", "Helvetica", "Helvetica Neue", "system-ui", "-apple-system", "BlinkMacSystemFont", "SF Pro", "SF Pro Display", "SF Pro Text", "Segoe UI", "Open Sans", "Poppins", "Montserrat", "Lato", "Source Sans Pro", "Source Sans 3", "Work Sans", "sans-serif"],
  fontsTrend: ["Space Grotesk", "Instrument Serif", "Instrument Sans", "DM Sans", "DM Serif Display", "Plus Jakarta Sans", "Outfit", "Manrope", "Satoshi", "Sora", "Bricolage Grotesque", "Fraunces", "Playfair Display", "General Sans", "Cabinet Grotesk", "Clash Display", "Onest"],
  buzzwords: ["seamless", "seamlessly", "unlock", "supercharge", "elevate", "effortless", "effortlessly", "revolutionize", "revolutionise", "leverage", "game-changer", "game-changing", "next-level", "harness", "empower", "streamline", "cutting-edge", "robust", "all-in-one", "unleash", "reimagine", "transform your", "10x", "in today's fast-paced", "skyrocket", "unparalleled", "world-class", "best-in-class", "frictionless", "magic", "delightful",
    "sin fisuras", "sin esfuerzo", "desbloquea", "potencia", "potenciar", "impulsa", "impulsar", "revoluciona", "revolucionar", "lleva al siguiente nivel", "siguiente nivel", "de vanguardia", "todo en uno", "transforma tu", "optimiza", "eleva", "libera", "reimagina", "sin límites", "de clase mundial", "en el mundo acelerado de hoy", "mágico", "mágica"],
  placeholders: ["lorem ipsum", "dolor sit amet", "acme inc", "acme corp", "acme", "your company", "company name", "john doe", "jane doe", "john smith", "tu empresa", "nombre de la empresa", "empresa s.a.", "fulano", "mengano", "juan pérez", "item 1", "elemento 1", "placeholder", "texto de ejemplo"],
  roundStat: /^\s*[+~]?\d+([.,]\d+)?\s*(k|m|b|x|%|\+|\/7|★)\+?\s*$/i,
  step: /^\s*(step|paso)?\s*0?[1-9][.):]?\s*$/i,
  notXButY: [/\bnot (just|only|merely) [^.,;]{1,40}[,;—-]\s*(it'?s|it is|but)\b/i, /\bisn'?t (just|only) [^.,;]{1,40}[,;—-]\s*(it'?s|it is)\b/i, /\bno (es|son) (solo|sólo|solamente|simplemente) [^.,;]{1,40}[,;—-]\s*(es|son)\b/i],
  sparkleChars: ["✨", "✦", "✧", "⭐", "🌟", "💫", "⚡"],
  sparkleLayerNames: ["sparkle", "sparkles", "stars", "magic", "ai-star", "destello"],
};
const WEIGHTS = { "violet-gradient": 3, "gradient-headline": 2, "decorative-glow": 2, "frosted-glass": 2, "faint-grid-backdrop": 1, "dark-neon-default": 2, "sparkle-ai-marker": 1, "emoji-as-icon": 1, "icon-in-tile-cards": 2, "centered-hero-stack": 2, "pill-above-headline": 2, "serif-accent-word": 1, "identical-triplet": 2, "bento-grid": 2, "single-edge-accent": 1, "numbered-steps-default": 1, "round-number-stats": 1, "slogan-triads": 1, "not-x-but-y": 1, "em-dash-heavy": 1, "buzzword-density": 2, "placeholder-residue": 3, "default-typeface": 2, "trend-typeface": 1 };

// ---------- resolve scope ----------
const rootId = ROOT_ID !== "REPLACE-ME" ? ROOT_ID : (storage.bs && storage.bs.screenBoardId) || (penpot.selection[0] && penpot.selection[0].id);
const root = rootId ? penpotUtils.findShapeById(rootId) : (MODE === "deck" ? penpot.root : null);
if (!root) return { error: "No scope: pass ROOT_ID, select the screen board, or run after penpot-build-screen (storage.bs.screenBoardId)." };

// ---------- color helpers ----------
function hsl(hex) {
  const m = /^#?([0-9a-f]{6})/i.exec(String(hex || ""));
  if (!m) return null;
  const n = parseInt(m[1], 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (d === 0) return { h: 0, s: 0, l, c: 0 };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s, l, c: d };
}
const chromatic = (x) => x && x.c >= 0.11 && x.s >= 0.12;
const isViolet = (x) => chromatic(x) && x.h >= 232 && x.h < 320;
const isNeon = (x) => chromatic(x) && x.s >= 0.6 && x.l >= 0.45 && ((x.h >= 75 && x.h < 200) || (x.h >= 232 && x.h < 330));
const gradientsOf = (s) => [
  ...(s.fills || []).map((f) => f && f.fillColorGradient).filter(Boolean),
  ...(s.strokes || []).map((f) => f && f.strokeColorGradient).filter(Boolean),
];
const solidFills = (s) => (s.fills || []).filter((f) => f && f.fillColor && !f.fillColorGradient && !f.fillImage);

// ---------- collect ----------
const all = [root, ...penpotUtils.findShapes(() => true, root)].filter((s) => !s.hidden);
const isBoard = (s) => s.type === "board" || s.type === "frame";
const texts = all.filter((s) => s.type === "text" && typeof s.characters === "string");
const size = (t) => { const n = parseFloat(t.fontSize); return Number.isFinite(n) ? n : 0; };
const kids = (s) => (s.children || []).filter((c) => !c.hidden);
const byKey = {};
const hit = (key, region, shape, evidence, extra) => {
  const f = byKey[key] || (byKey[key] = { key, weight: WEIGHTS[key] || 1, p: 1, source: "probe", region, regions: [], shapeIds: [], evidence: [] });
  if (region && !f.regions.includes(region)) f.regions.push(region);
  if (shape && f.shapeIds.length < 12 && !f.shapeIds.includes(shape.id)) f.shapeIds.push(shape.id);
  if (evidence && f.evidence.length < 4) f.evidence.push(evidence);
  if (extra) Object.assign(f, extra);
};

// ---------- regions ----------
const KIND = [[/hero|masthead|cover|portada/i, "hero"], [/^(nav|header)|navbar|topbar|menu/i, "nav"], [/logo|trusted|client|testimonial|proof|quote|cita/i, "proof"],
  [/feature|benefit|ventaja|caracter/i, "features"], [/pricing|plan|precio/i, "pricing"], [/stat|metric|kpi|number|cifra/i, "stats"],
  [/step|how-it|process|paso|proceso/i, "steps"], [/cta|call-to-action|signup|contact/i, "cta"], [/footer|pie/i, "footer"]];
const kindOf = (name) => { for (const [re, k] of KIND) if (re.test(name || "")) return k; return "content"; };
let regionShapes = MODE === "deck" ? kids(root).filter(isBoard) : kids(root).filter((c) => isBoard(c) || c.type === "group");
if (MODE !== "deck" && regionShapes.length === 1 && kids(regionShapes[0]).length > 1 && /main/i.test(regionShapes[0].name || "")) regionShapes = kids(regionShapes[0]);
const regions = regionShapes.map((s) => ({ id: s.id, name: s.name, kind: MODE === "deck" ? "slide" : kindOf(s.name), shape: s }));
if (MODE !== "deck" && !regions.some((r) => r.kind === "hero") && texts.length) {
  const top = texts.filter((t) => t.y - root.y < 1100).sort((a, b) => size(b) - size(a))[0];
  const owner = top && regions.find((r) => penpotUtils.isContainedIn(top, r.shape) || r.shape.id === (top.parent && top.parent.id));
  if (owner) owner.kind = "hero";
}
const regionById = new Map();
for (const r of regions) { regionById.set(r.shape.id, r); for (const x of penpotUtils.findShapes(() => true, r.shape)) regionById.set(x.id, r); }
const regionOf = (s) => regionById.get(s.id) || null;
const regionLabel = (s) => { const r = regionOf(s); return r ? `${r.kind}:${r.name}` : "page"; };
const heroes = regions.filter((r) => r.kind === "hero" || (MODE === "deck" && regions.indexOf(r) === 0));

// ---------- 1a surface & effects ----------
for (const s of all) {
  for (const g of gradientsOf(s)) {
    const violetStop = (g.stops || []).find((st) => isViolet(hsl(st.color)));
    if (violetStop) hit("violet-gradient", regionLabel(s), s, `${s.name}: ${g.type} gradient stop ${violetStop.color}`);
    if (s.type === "text") hit("gradient-headline", regionLabel(s), s, `${s.name}: gradient text fill`);
    if (g.type === "radial" && (g.stops || []).some((st) => (st.opacity ?? 1) <= 0.1)) hit("decorative-glow", regionLabel(s), s, `${s.name}: radial gradient fading to transparent`);
  }
  if (s.blur && !s.blur.hidden && (s.blur.value || 0) > 0) hit("decorative-glow", regionLabel(s), s, `${s.name}: layer blur ${s.blur.value}`);
  for (const sh of s.shadows || []) {
    if (sh.hidden) continue;
    const c = hsl(sh.color && sh.color.color);
    if (chromatic(c) && (sh.blur || 0) >= 8) hit("decorative-glow", regionLabel(s), s, `${s.name}: colored shadow ${sh.color.color}`);
  }
  if (s.backgroundBlur && !s.backgroundBlur.hidden && (s.backgroundBlur.value || 0) > 0
      && (s.fills || []).some((f) => (f.fillOpacity ?? 1) < 1)) hit("frosted-glass", regionLabel(s), s, `${s.name}: background blur ${s.backgroundBlur.value} over a translucent fill`);
}
for (const r of heroes) {
  const thin = penpotUtils.findShapes((x) => (x.type === "rect" || x.type === "rectangle" || x.type === "path") && (x.width <= 2 || x.height <= 2), r.shape);
  const patterned = penpotUtils.findShape((x) => /grid|dots|pattern|lattice|cuadr/i.test(x.name || "") && x.width >= r.shape.width * 0.5, r.shape);
  if (thin.length >= 6 || patterned) hit("faint-grid-backdrop", `${r.kind}:${r.name}`, patterned || thin[0], patterned ? `${patterned.name}: pattern layer` : `${thin.length} hairlines behind the hero`);
}
{
  const bg = hsl((solidFills(root)[0] || {}).fillColor);
  if (bg && bg.l < 0.12) {
    const neon = all.find((s) => s !== root && solidFills(s).some((f) => isNeon(hsl(f.fillColor))));
    if (neon) hit("dark-neon-default", "page", neon, `near-black root (${solidFills(root)[0].fillColor}) with neon accent on ${neon.name}`);
  }
}

// ---------- 1b ornaments ----------
// ©, ®, ™, ‼, ⁉ are Extended_Pictographic in Unicode but are ordinary typography, not emoji (found live: a © footer).
const EMOJI = /(?![©®™‼⁉])\p{Extended_Pictographic}/u;
for (const t of texts) {
  const ch = t.characters;
  if (LISTS.sparkleChars.some((c) => ch.includes(c))) hit("sparkle-ai-marker", regionLabel(t), t, `${t.name}: sparkle character`);
  const lines = ch.split(/\n/);
  if (lines.some((l) => EMOJI.test(l.trim().slice(0, 2))) || (ch.trim().length <= 2 && EMOJI.test(ch))) hit("emoji-as-icon", regionLabel(t), t, `${t.name}: emoji used as icon/bullet`);
}
for (const s of all) if (s.type !== "text" && LISTS.sparkleLayerNames.some((n) => new RegExp(`(^|[-_ ])${n}($|[-_ ])`, "i").test(s.name || ""))) hit("sparkle-ai-marker", regionLabel(s), s, `${s.name}: sparkle icon layer`);

const firstVisual = (card) => kids(card).slice().sort((a, b) => (a.y - b.y) || (a.x - b.x))[0];
const isIconTile = (x) => x && x.type !== "text" && x.width >= 24 && x.width <= 64 && Math.abs(x.width - x.height) <= 2
  && (x.type === "ellipse" || (x.borderRadius || x.borderRadiusTopLeft || 0) > 0 || /icon/i.test(x.name || ""));
for (const s of all.filter((b) => isBoard(b) && (b.flex || b.grid))) {
  const cards = kids(s).filter(isBoard);
  if (cards.length >= 3 && cards.filter((c) => isIconTile(firstVisual(c))).length >= 3) hit("icon-in-tile-cards", regionLabel(s), s, `${s.name}: ${cards.length} cards open with an icon tile`);
}

// ---------- 1c composition ----------
for (const r of heroes) {
  const ht = penpotUtils.findShapes((x) => x.type === "text" && !x.hidden, r.shape).sort((a, b) => size(b) - size(a));
  const headline = ht[0];
  if (!headline) continue;
  const cx = r.shape.x + r.shape.width / 2;
  const centeredText = ht.slice(0, 3).filter((t) => t.align === "center").length >= 2;
  const buttons = penpotUtils.findShapes((x) => isBoard(x) && /button|btn|cta|boton|botón/i.test(x.name || ""), r.shape);
  const centeredButtons = buttons.length > 0 && Math.abs(
    (Math.min(...buttons.map((b) => b.x)) + Math.max(...buttons.map((b) => b.x + b.width))) / 2 - cx) <= 12;
  if (centeredText && (centeredButtons || buttons.length === 0)) hit("centered-hero-stack", `${r.kind}:${r.name}`, headline, `headline + subheading centered${centeredButtons ? ", buttons centered" : ""}`);
  const pill = penpotUtils.findShape((x) => x.id !== headline.id && x.type !== "text" && x.height <= 40 && x.width <= 360 && x.width > x.height * 1.6
    && (x.borderRadius || x.borderRadiusTopLeft || 0) >= x.height / 2 - 1 && x.y + x.height <= headline.y + 2 && headline.y - (x.y + x.height) <= 120, r.shape);
  if (pill) hit("pill-above-headline", `${r.kind}:${r.name}`, pill, `${pill.name}: ${Math.round(pill.width)}×${Math.round(pill.height)} pill above the headline`);
}
for (const t of texts) if (size(t) >= 28 || (t.fontSize === "mixed" && t.characters.length <= 120)) {
  if (t.fontFamily === "mixed" || t.fontStyle === "mixed") hit("serif-accent-word", regionLabel(t), t, `${t.name}: mixed ${t.fontFamily === "mixed" ? "family" : "style"} inside a headline`);
}
const signature = (b) => kids(b).map((c) => c.type).join(",");
for (const s of all.filter((b) => isBoard(b) && (b.flex || b.grid))) {
  const c = kids(s);
  if (c.length === 3 && c.every(isBoard)
      && c.every((x) => Math.abs(x.width - c[0].width) <= 2 && Math.abs(x.height - c[0].height) <= 2)
      && c.every((x) => signature(x) === signature(c[0]))) hit("identical-triplet", regionLabel(s), s, `${s.name}: 3 identical ${Math.round(c[0].width)}×${Math.round(c[0].height)} cards`);
  if (s.grid && c.length >= 4 && c.some((x) => (x.layoutCell && ((x.layoutCell.rowSpan || 1) > 1 || (x.layoutCell.columnSpan || 1) > 1)))
      && c.filter((x) => (x.borderRadius || 0) > 0).length >= 3) hit("bento-grid", regionLabel(s), s, `${s.name}: grid of ${c.length} rounded tiles with mixed spans`);
}
for (const card of all.filter((b) => isBoard(b) && b !== root && b.width >= 120 && b.height >= 60)) {
  const stripe = kids(card).find((x) => x.type !== "text" && solidFills(x).some((f) => chromatic(hsl(f.fillColor)))
    && ((x.width <= 4 && x.height >= card.height * 0.8) || (x.height <= 4 && x.width >= card.width * 0.8)));
  if (stripe) hit("single-edge-accent", regionLabel(card), card, `${card.name}: ${Math.round(stripe.width)}×${Math.round(stripe.height)} accent stripe`);
}
const groupBy = (list, keyFn) => list.reduce((m, x) => { const k = keyFn(x); if (k) (m[k] = m[k] || []).push(x); return m; }, {});
const grand = (t) => t.parent && t.parent.parent ? t.parent.parent.id : t.parent && t.parent.id;
for (const [, g] of Object.entries(groupBy(texts.filter((t) => LISTS.step.test(t.characters)), grand))) if (g.length >= 3) hit("numbered-steps-default", regionLabel(g[0]), g[0], `${g.length} numbered step labels`);
for (const [, g] of Object.entries(groupBy(texts.filter((t) => size(t) >= 24 && LISTS.roundStat.test(t.characters)), grand))) if (g.length >= 3) hit("round-number-stats", regionLabel(g[0]), g[0], `${g.map((t) => t.characters.trim()).join(" · ")}`);

// ---------- 1d copy ----------
const copy = texts.map((t) => t.characters).join("\n");
const lower = copy.toLowerCase();
const words = (copy.match(/[\p{L}\p{N}'’-]+/gu) || []).length;
const dashes = (copy.match(/—/g) || []).length;
if (dashes >= 3 && words > 0 && dashes / words * 100 >= 0.5) hit("em-dash-heavy", "page", null, `${dashes} em dashes in ${words} words`);
const wordRe = (w) => new RegExp(`(^|[^\\p{L}\\p{N}])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^\\p{L}\\p{N}])`, "iu");
const buzz = LISTS.buzzwords.filter((w) => wordRe(w).test(lower));
if (buzz.length >= 3) hit("buzzword-density", "page", null, `${buzz.length} buzzwords: ${buzz.slice(0, 6).join(", ")}`);
for (const t of texts) {
  const found = LISTS.placeholders.find((w) => wordRe(w).test(t.characters.toLowerCase()));
  // a LABELED placeholder is honest (shared/anti-slop.md §1d): an ALL-CAPS label + dash ("IMAGE — …", "FOOTER — …") or "TBD"
  const labeled = /^[A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ ]{2,23}\s*[—–-]\s/.test(t.characters.trim()) || /\bTBD\b/.test(t.characters);
  if (found && !labeled) hit("placeholder-residue", regionLabel(t), t, `${t.name}: "${found}"`);
}
const triad = /(^|[\n.!?]\s*)([\p{L}]+)\.\s+([\p{L}]+)\.\s+([\p{L}]+)\./gu;
const listTriad = /^[^\n]{0,60}\b[\p{L}]+, [\p{L}]+,? (and|y|&) [\p{L}]+[.!]?$/gimu;
const triads = (copy.match(triad) || []).length + (copy.match(listTriad) || []).length;
if (triads >= 2) hit("slogan-triads", "page", null, `${triads} three-beat slogans`);
const nxy = texts.find((t) => LISTS.notXButY.some((re) => re.test(t.characters)));
if (nxy) hit("not-x-but-y", regionLabel(nxy), nxy, `${nxy.name}: "not just X, it's Y" construction`);

// ---------- 1e typography ----------
const tally = {};
for (const t of texts) {
  if (t.fontFamily && t.fontFamily !== "mixed") { tally[t.fontFamily] = (tally[t.fontFamily] || 0) + t.characters.length; continue; }
  // mixed families (e.g. one serif accent word): tally per character via TextRange — ~2 ms/char, so cap at 300 chars
  if (t.fontFamily === "mixed" && typeof t.getRange === "function" && t.characters.length <= 300)
    for (let i = 0; i < t.characters.length; i++) { const f = t.getRange(i, i + 1).fontFamily; if (f && f !== "mixed") tally[f] = (tally[f] || 0) + 1; }
}
const primaryFamily = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
const inList = (fam, list) => !!fam && list.some((f) => f.toLowerCase() === String(fam).toLowerCase());
const tokenFamilies = [];
try {
  for (const set of penpot.library.local.tokens.sets) if (set.active) for (const tok of set.tokens)
    if (tok.type === "fontFamilies" || tok.type === "typography") tokenFamilies.push(JSON.stringify(tok.resolvedValue ?? tok.value).toLowerCase());
} catch (e) { /* no token catalog — nothing is inherited */ }
const inheritedFamily = (fam) => tokenFamilies.some((v) => v.includes(String(fam).toLowerCase()));
if (inList(primaryFamily, LISTS.fontsDefault)) hit("default-typeface", "page", null, `primary family ${primaryFamily}`, inheritedFamily(primaryFamily) ? { status: "inherited" } : null);
const trendUsed = Object.keys(tally).filter((f) => inList(f, LISTS.fontsTrend));
if (trendUsed.length) hit("trend-typeface", "page", null, `trend families: ${trendUsed.join(", ")}`, trendUsed.every(inheritedFamily) ? { status: "inherited" } : null);
const signals = [{ key: "chosen-typeface", present: !!primaryFamily && !inList(primaryFamily, LISTS.fontsDefault) && !inList(primaryFamily, LISTS.fontsTrend), evidence: `primary family ${primaryFamily || "none"}` }];

// ---------- emit ----------
const findings = Object.values(byKey).map((f) => ({ ...f, region: f.regions.join(", ") || f.region, evidence: f.evidence.join("; ") }));
storage.slop = { listsVersion: LISTS_VERSION, scopeId: root.id, findings, signals, template: null };
return {
  listsVersion: LISTS_VERSION,
  scope: `${root.name} (${root.id})${MODE === "deck" ? ` — ${regions.length} slides` : ""}`,
  regions: regions.map(({ id, name, kind }) => ({ id, name, kind })),
  findings, signals, primaryFamily,
  stats: { shapes: all.length, texts: texts.length, words },
};
