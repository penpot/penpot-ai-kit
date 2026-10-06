#!/usr/bin/env node
/**
 * test-anti-slop.mjs — unit tests for the pure scoring script of penpot-anti-slop
 * (skills/penpot-anti-slop/scripts/slopScore.js, shared/anti-slop.md §3) and of scanSlopProbes.js against a
 * mocked shape tree (planted tells must be found; a plain screen must come back clean). Dependency-free.
 * The script is an execute_code body (top-level `return`), so it is loaded with `new Function("storage", src)`.
 *
 * Usage:  node scripts/dev/test-anti-slop.mjs     exit 0 = all pass
 */
import { readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = readFileSync(join(ROOT, "skills/penpot-anti-slop/scripts/slopScore.js"), "utf8");
const run = (slop) => new Function("storage", src)({ slop: structuredClone(slop) });

let passed = 0;
const test = (name, fn) => { try { fn(); passed++; } catch (e) { console.error(`✗ ${name}\n  ${e.message}`); process.exitCode = 1; } };

test("empty input is genuine and passes", () => {
  const r = run({ findings: [], template: null, signals: [] });
  assert.equal(r.score, 0); assert.equal(r.band, "genuine"); assert.equal(r.pass, true);
  assert.deepEqual(r.topFixes, ["No fixes needed."]);
});

test("probe hits count at p = 1 and saturate at 15 points", () => {
  const findings = ["violet-gradient", "placeholder-residue", "gradient-headline", "decorative-glow", "frosted-glass", "centered-hero-stack", "identical-triplet"]
    .map((key, i) => ({ key, weight: [3, 3, 2, 2, 2, 2, 2][i], p: 0.4, source: "probe" }));
  const r = run({ findings, template: null, signals: [] });
  assert.equal(r.points, 16); assert.equal(r.score, 100); assert.equal(r.band, "ai-default"); assert.equal(r.pass, false);
});

test("review bands: 0.65 counts, 0.64 is unsure, 0.34 absent", () => {
  const r = run({ findings: [
    { key: "vague-headline", weight: 2, p: 0.65, source: "review" },
    { key: "abstract-3d-art", weight: 1, p: 0.64, source: "review" },
    { key: "generic-logo-strip", weight: 1, p: 0.34, source: "review" },
  ], template: null, signals: [] });
  const by = Object.fromEntries(r.findings.map((f) => [f.key, f.status]));
  assert.deepEqual(by, { "abstract-3d-art": "unsure", "generic-logo-strip": "absent", "vague-headline": "present" });
  assert.equal(r.points, 1.3); assert.equal(r.score, 9);
});

test("probe beats review for the same key; highest review p wins across regions", () => {
  const r = run({ findings: [
    { key: "identical-triplet", weight: 2, p: 0.2, source: "review", region: "features" },
    { key: "identical-triplet", weight: 2, p: 1, source: "probe", region: "pricing" },
    { key: "bento-grid", weight: 2, p: 0.5, source: "review", region: "features" },
    { key: "bento-grid", weight: 2, p: 0.8, source: "review", region: "content" },
  ], template: null, signals: [] });
  const t = r.findings.find((f) => f.key === "identical-triplet");
  assert.equal(t.source, "probe"); assert.equal(t.p, 1); assert.deepEqual(t.regions.sort(), ["features", "pricing"]);
  assert.equal(r.findings.find((f) => f.key === "bento-grid").p, 0.8);
});

test("inherited and accepted are reported but never counted", () => {
  const r = run({ findings: [
    { key: "default-typeface", weight: 2, p: 1, source: "probe", status: "inherited" },
    { key: "centered-hero-stack", weight: 2, p: 1, source: "probe", status: "accepted" },
  ], template: null, signals: [] });
  assert.equal(r.points, 0); assert.equal(r.score, 0);
  assert.ok(r.findings.every((f) => !f.counted));
});

test("template judgement blends 75/25 only when confidence >= 0.5", () => {
  const f = [{ key: "violet-gradient", weight: 3, p: 1, source: "probe" }];      // s = 0.2
  assert.equal(run({ findings: f, template: { value: 4, confidence: 0.8 }, signals: [] }).score, 40);   // 100*(0.15+0.25)
  assert.equal(run({ findings: f, template: { value: 4, confidence: 0.4 }, signals: [] }).score, 20);   // template ignored
});

test("each authenticity signal subtracts 6, clamped at 0", () => {
  const f = [{ key: "violet-gradient", weight: 3, p: 1, source: "probe" }, { key: "buzzword-density", weight: 2, p: 1, source: "probe" }]; // 33
  const sig = (n) => Array.from({ length: n }, (_, i) => ({ key: `s${i}`, present: true }));
  assert.equal(run({ findings: f, template: null, signals: sig(2) }).score, 21);
  assert.equal(run({ findings: f, template: null, signals: sig(5) }).score, 3);
  assert.equal(run({ findings: [], template: null, signals: sig(3) }).score, 0);
});

test("gate is score <= 35 and bands follow shared/anti-slop.md §3", () => {
  const at = (pts) => run({ findings: [{ key: "violet-gradient", weight: 3, p: 1, source: "probe" }, ...Array.from({ length: pts - 3 }, (_, i) => ({ key: `x${i}`, weight: 1, p: 1, source: "probe" }))], template: null, signals: [] });
  assert.equal(at(5).score, 33); assert.equal(at(5).band, "mostly-genuine"); assert.equal(at(5).pass, true);
  assert.equal(at(6).score, 40); assert.equal(at(6).band, "generic"); assert.equal(at(6).pass, false);
  assert.equal(at(9).band, "templated"); assert.equal(at(12).band, "ai-default");
});

test("top fixes: highest weight × p first, ties in taxonomy order, max 3", () => {
  const r = run({ findings: [
    { key: "emoji-as-icon", weight: 1, p: 1, source: "probe", fix: "e" },
    { key: "identical-triplet", weight: 2, p: 1, source: "probe", fix: "t" },
    { key: "violet-gradient", weight: 3, p: 1, source: "probe", fix: "v" },
    { key: "gradient-headline", weight: 2, p: 1, source: "probe", fix: "g" },
  ], template: null, signals: [] });
  assert.deepEqual(r.topFixes, ["violet-gradient: v", "gradient-headline: g", "identical-triplet: t"]);
});

// ---------- scanSlopProbes.js against a mocked shape tree ----------
const probeSrc = readFileSync(join(ROOT, "skills/penpot-anti-slop/scripts/scanSlopProbes.js"), "utf8");
let uid = 0;
const node = (props, children = []) => {
  const n = { id: `s${++uid}`, hidden: false, x: 0, y: 0, width: 100, height: 100, fills: [], strokes: [], shadows: [], ...props, children };
  for (const c of children) c.parent = n;
  return n;
};
const walk = (r, out = []) => { for (const c of r.children || []) { out.push(c); walk(c, out); } return out; };
const mockPenpot = (root, tokenSets = []) => {
  const all = [root, ...walk(root)];
  const utils = {
    findShapeById: (id) => all.find((s) => s.id === id) || null,
    findShapes: (pred, r) => walk(r || root).filter(pred),
    findShape: (pred, r) => walk(r || root).find(pred) || null,
    isContainedIn: (s, c) => s.x >= c.x && s.y >= c.y && s.x + s.width <= c.x + c.width && s.y + s.height <= c.y + c.height,
  };
  const penpot = { selection: [], root, library: { local: { tokens: { sets: tokenSets } } } };
  return { penpot, utils };
};
const scan = (root, tokenSets) => {
  const { penpot, utils } = mockPenpot(root, tokenSets);
  const storage = { bs: { screenBoardId: root.id } };
  return new Function("penpot", "penpotUtils", "storage", probeSrc)(penpot, utils, storage);
};
const txt = (characters, extra = {}) => {
  const t = node({ type: "text", characters, fontSize: "18", fontFamily: "Inter", fontStyle: "normal", align: "left", ...extra });
  // mixed-family texts: ranges listed in extra.ranges as [start, end, family]; the rest is Inter
  t.getRange = (a) => ({ fontFamily: ((extra.ranges || []).find(([s, e]) => a >= s && a < e) || [0, 0, "Inter"])[2] });
  return t;
};
const card = (x) => node({ type: "board", x, y: 900, width: 320, height: 240 }, [
  node({ type: "board", name: "icon", x, y: 900, width: 48, height: 48, borderRadius: 12 }),
  txt("Seamless sync", { x, y: 960 }),
]);

const sloppy = () => {
  uid = 0;
  return node({ type: "board", name: "Landing", width: 1440, height: 2000, fills: [{ fillColor: "#FFFFFF", fillOpacity: 1 }] }, [
    node({ type: "board", name: "hero", width: 1440, height: 800, flex: { dir: "column" },
      fills: [{ fillOpacity: 1, fillColorGradient: { type: "linear", stops: [{ color: "#6366F1", offset: 0 }, { color: "#A855F7", offset: 1 }] } }] }, [
      node({ type: "board", name: "pill-badge", x: 620, y: 200, width: 200, height: 32, borderRadius: 16 }),
      txt("Unlock the future of work ✨", { x: 220, y: 260, width: 1000, height: 80, fontSize: "64", align: "center", fontFamily: "mixed", ranges: [[11, 17, "Instrument Serif"]] }),
      txt("Supercharge your team — elevate everything — it's not just a tool, it's a revolution — really.", { x: 320, y: 360, width: 800, height: 60, align: "center" }),
      node({ type: "board", name: "button-primary", x: 620, y: 460, width: 200, height: 48 }),
      node({ type: "ellipse", name: "glow", x: 900, y: 100, width: 400, height: 400, blur: { value: 120 } }),
    ]),
    node({ type: "board", name: "features", y: 880, width: 1440, height: 300, flex: { dir: "row" } }, [card(100), card(520), card(940)]),
    node({ type: "board", name: "stats", y: 1200, width: 1440, height: 200, flex: { dir: "row" } }, [
      node({ type: "board", name: "stat", width: 200, height: 100 }, [txt("10k+", { fontSize: "48" })]),
      node({ type: "board", name: "stat", width: 200, height: 100 }, [txt("99.9%", { fontSize: "48" })]),
      node({ type: "board", name: "stat", width: 200, height: 100 }, [txt("5x", { fontSize: "48" })]),
    ]),
    node({ type: "board", name: "footer", y: 1800, width: 1440, height: 200 }, [txt("© 2026 Acme Inc. Lorem ipsum dolor sit amet.")]),
  ]);
};

test("probes find the planted tells on a sloppy landing", () => {
  const r = scan(sloppy());
  assert.ok(!r.error, r.error);
  const keys = new Set(r.findings.map((f) => f.key));
  for (const k of ["violet-gradient", "decorative-glow", "sparkle-ai-marker", "centered-hero-stack", "pill-above-headline", "serif-accent-word",
    "identical-triplet", "icon-in-tile-cards", "round-number-stats", "em-dash-heavy", "buzzword-density", "placeholder-residue", "not-x-but-y", "default-typeface", "trend-typeface"])
    assert.ok(keys.has(k), `missing ${k} (found: ${[...keys].join(", ")})`);
  assert.equal(r.regions.find((x) => x.name === "hero").kind, "hero");
  assert.ok(!keys.has("emoji-as-icon"), "© in the footer must not count as an emoji icon (live regression)");
  assert.equal(r.signals[0].present, false);
});

test("probes + score: the sloppy landing fails the gate", () => {
  const r = scan(sloppy());
  const scored = run({ findings: r.findings, template: { value: 4, confidence: 0.9 }, signals: r.signals });
  assert.equal(scored.pass, false); assert.equal(scored.band, "ai-default");
});

test("labeled placeholders are honest, unlabeled ones are residue (live regression)", () => {
  uid = 0;
  const b = node({ type: "board", name: "Page", width: 1440, height: 400 }, [
    node({ type: "board", name: "footer", width: 1440, height: 200 }, [txt("FOOTER — company name, address and contact from the brief"), txt("Revenue: metric TBD")]),
  ]);
  assert.ok(!scan(b).findings.some((f) => f.key === "placeholder-residue"));
  uid = 0;
  const c = node({ type: "board", name: "Page", width: 1440, height: 400 }, [node({ type: "board", name: "footer", width: 1440, height: 200 }, [txt("Your company name here")])]);
  assert.ok(scan(c).findings.some((f) => f.key === "placeholder-residue"));
});

test("Inter bound in a type token is reported as inherited, not counted", () => {
  const sets = [{ active: true, tokens: [{ type: "fontFamilies", name: "font.family.base", value: "Inter", resolvedValue: ["Inter"] }] }];
  const f = scan(sloppy(), sets).findings.find((x) => x.key === "default-typeface");
  assert.equal(f.status, "inherited");
});

test("a deliberate, plain screen comes back clean", () => {
  uid = 0;
  const clean = node({ type: "board", name: "Invoices", width: 1440, height: 1200, fills: [{ fillColor: "#FAFAF7", fillOpacity: 1 }] }, [
    node({ type: "board", name: "hero", width: 1440, height: 500, flex: { dir: "row" } }, [
      txt("Send invoices your accountant can read", { fontSize: "48", fontFamily: "IBM Plex Sans", width: 640, height: 120 }),
      txt("Line items, tax and due dates in one table — exported to your ledger.", { fontFamily: "IBM Plex Sans", y: 140 }),
    ]),
    node({ type: "board", name: "features", y: 520, width: 1440, height: 400, flex: { dir: "column" } }, [
      node({ type: "board", name: "row", width: 1200, height: 60 }, [txt("Recurring invoices on the 1st", { fontFamily: "IBM Plex Sans" })]),
      node({ type: "board", name: "row", width: 1200, height: 60 }, [txt("Late reminders after 7 days", { fontFamily: "IBM Plex Sans" })]),
    ]),
  ]);
  const r = scan(clean);
  assert.deepEqual(r.findings.map((f) => f.key), []);
  assert.equal(r.signals[0].present, true);
  assert.equal(run({ findings: r.findings, template: { value: 1, confidence: 0.7 }, signals: r.signals }).score, 0);
});

console.log(process.exitCode ? `anti-slop: ${passed} passed, some FAILED` : `✓ anti-slop: ${passed} tests passed`);
