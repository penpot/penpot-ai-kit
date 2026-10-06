/**
 * slopScore.js
 * Purpose: compute the slop score (shared/anti-slop.md §3) from probe + review findings. Pure — no Penpot calls.
 * Usage:   paste into execute_code AFTER scanSlopProbes.js and the review pass have filled storage.slop
 *          (or set INPUT below). Also loaded by scripts/dev/test-anti-slop.mjs via `new Function("storage", src)`.
 * Input:   storage.slop = { findings:[{ key, weight, p, source:"probe"|"review", status?, region?, shapeIds?, evidence?, fix? }],
 *                           template:{ value:0..4, confidence:0..1 } | null,
 *                           signals:[{ key, present, evidence? }] }
 * Output:  { score, band, pass, points, findings (deduped + banded), topFixes, templateJudgement, signalsPresent }
 */
const INPUT = (typeof storage !== "undefined" && storage && storage.slop) || { findings: [], template: null, signals: [] };

const ORDER = [
  "violet-gradient", "gradient-headline", "decorative-glow", "frosted-glass", "faint-grid-backdrop", "dark-neon-default",
  "sparkle-ai-marker", "emoji-as-icon", "icon-in-tile-cards", "abstract-3d-art",
  "centered-hero-stack", "pill-above-headline", "serif-accent-word", "identical-triplet", "bento-grid",
  "single-edge-accent", "numbered-steps-default",
  "generic-logo-strip", "round-number-stats", "vague-headline", "slogan-triads", "not-x-but-y",
  "em-dash-heavy", "buzzword-density", "placeholder-residue",
  "default-typeface", "trend-typeface",
];
// Default fix lines (short form of the Fix column in shared/anti-slop.md §1) — used when a finding carries none.
const FIXES = {
  "violet-gradient": "flat surface token; brand violet only on the primary action",
  "gradient-headline": "one solid text token; emphasis by size/weight",
  "decorative-glow": "delete the glow; at most one neutral elevation level",
  "frosted-glass": "opaque surface token",
  "faint-grid-backdrop": "remove the lattice; one real rule if structure must show",
  "dark-neon-default": "start light unless the brief asks for dark; restrained accent",
  "sparkle-ai-marker": "say what the feature does in words",
  "emoji-as-icon": "system icons, or just the word",
  "icon-in-tile-cards": "show the feature (a product fragment) instead of a boxed icon",
  "abstract-3d-art": "a labeled product-UI placeholder instead of decorative art",
  "centered-hero-stack": "left-align to the grid or split copy/product",
  "pill-above-headline": "put the news in the headline or delete the pill",
  "serif-accent-word": "one face and style for the headline",
  "identical-triplet": "vary the rhythm: one dominant item + supporting, or a list/table",
  "bento-grid": "give the strongest idea its own section; list the rest",
  "single-edge-accent": "remove the stripe; spend emphasis on one element",
  "numbered-steps-default": "show the real states, or a plain ordered list",
  "generic-logo-strip": "one real customer quote from the brief — or nothing (never invent)",
  "round-number-stats": "keep the one sourced metric from the brief; drop the rest",
  "vague-headline": "headline = product + who + outcome, ≤ 7 words",
  "slogan-triads": "keep the one adjective that is true and specific",
  "not-x-but-y": "state what it is",
  "em-dash-heavy": "commas and full stops",
  "buzzword-density": "replace each buzzword with what actually happens",
  "placeholder-residue": "real content from the brief, or a labeled placeholder",
  "default-typeface": "propose a type token chosen for the brief (system first)",
  "trend-typeface": "propose a face chosen for the product, not the year",
};
const SATURATION = 15;          // weighted points for a fully generic design
const W_TELLS = 0.75, W_TEMPLATE = 0.25, SIGNAL_CREDIT = 6, GATE = 35;

function bandOf(p) { return p >= 0.65 ? "present" : p >= 0.35 ? "unsure" : "absent"; }
function scoreBand(score) {
  if (score <= 15) return "genuine";
  if (score <= 35) return "mostly-genuine";
  if (score <= 55) return "generic";
  if (score <= 75) return "templated";
  return "ai-default";
}

function computeSlopScore(input) {
  // 1. one entry per key: probe beats review; otherwise the highest p across regions wins
  const byKey = new Map();
  for (const raw of input.findings || []) {
    const f = { ...raw, p: Math.max(0, Math.min(1, Number(raw.p) || 0)) };
    if (f.source === "probe" && f.p > 0) f.p = 1;
    const prev = byKey.get(f.key);
    const strength = (x) => (x.source === "probe" && x.p > 0 ? 2 : 0) + x.p;   // a probe hit outranks any review answer
    const regions = [...new Set([...(prev?.regions || []), f.region].filter(Boolean))];
    const shapeIds = [...new Set([...(prev?.shapeIds || []), ...(f.shapeIds || [])])];
    byKey.set(f.key, !prev || strength(f) > strength(prev) ? { ...f, regions, shapeIds } : { ...prev, regions, shapeIds });
  }
  // 2. band + counted
  const findings = [...byKey.values()].map((f) => {
    const status = f.status === "inherited" || f.status === "accepted" ? f.status : bandOf(f.p);
    // inherited (from the file's own tokens/components) and accepted (user asked for it) are reported, never counted:
    // the build loop cannot fix them without a human decision, so they must not hold the gate shut.
    const counted = status === "present";
    return { ...f, weight: f.weight || 1, status, counted };
  });
  // 3. points, tell share, template, signals
  const points = findings.filter((f) => f.counted).reduce((sum, f) => sum + f.weight * f.p, 0);
  const s = Math.min(1, points / SATURATION);
  const t = input.template && Number(input.template.confidence) >= 0.5
    ? Math.max(0, Math.min(4, Math.round(Number(input.template.value)))) : null;
  const signalsPresent = (input.signals || []).filter((x) => x.present).length;
  const base = t == null ? 100 * s : 100 * (W_TELLS * s + W_TEMPLATE * (t / 4));
  const score = Math.max(0, Math.min(100, Math.round(base) - SIGNAL_CREDIT * signalsPresent));
  // 4. top fixes: highest weight × p, ties in taxonomy order
  const rank = (k) => { const i = ORDER.indexOf(k); return i < 0 ? ORDER.length : i; };
  const topFixes = findings.filter((f) => f.counted)
    .sort((a, b) => (b.weight * b.p - a.weight * a.p) || (rank(a.key) - rank(b.key)))
    .slice(0, 3)
    .map((f) => `${f.key}: ${f.fix || FIXES[f.key] || "see shared/anti-slop.md §1"}`);
  return {
    score, band: scoreBand(score), pass: score <= GATE,
    points: Math.round(points * 100) / 100,
    templateJudgement: input.template ? { ...input.template, counted: t != null } : null,
    signalsPresent,
    findings: findings.sort((a, b) => rank(a.key) - rank(b.key)),
    topFixes: topFixes.length ? topFixes : ["No fixes needed."],
  };
}

if (typeof module !== "undefined" && module.exports) { module.exports = { computeSlopScore }; }
const result = computeSlopScore(INPUT);
if (typeof storage !== "undefined" && storage && storage.slop) storage.slop.result = result;
return result;
