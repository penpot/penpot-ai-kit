/**
 * validateFidelity.js
 * Purpose: compare the migrated Penpot result with the IR and produce the honest fidelity report.
 * Usage:   paste into execute_code (Phase 5). Read-only. Pair with export_shape on each screen (against
 *          the Figma screenshot) for the visual half of the comparison.
 * Input:   IR (storage.mig.ir or REPLACE-ME); SET_PREFIX if migrateTokens.js used one.
 * Output:  { tokens, components, screens, bindings, gaps:[{kind, detail}], carried, integrity, summary, pass }.
 * What it checks — presence by name is not fidelity:
 *   - tokens: present, same TYPE, same value, and resolving (an alias whose target is missing fails);
 *   - components: every variant combination in the IR exists (read from the variant GROUP — the library
 *     lists a group as one entry — or from standalone "Base / Axis=Value" components);
 *   - screens: present, expected number of children, and every IR instance is a real component instance;
 *   - bindings: raw fills / gaps / paddings / radii left on migrated shapes with no token;
 *   - everything the IR itself recorded (ir.gaps, ir.fidelityNotes) is carried into the report.
 */
const IR = (storage.mig && storage.mig.ir) || null; // or REPLACE-ME
const SET_PREFIX = "";
if (!IR) return { error: "no IR available" };

const gaps = [];
const gap = (kind, detail) => gaps.push({ kind, detail });
const lib = penpot.library.local;

// ---- tokens ----------------------------------------------------------------------------------------
const modeSet = (m) => `${SET_PREFIX}modes/${String(m).trim().toLowerCase().replace(/\s+/g, "-")}`;
const allTokens = [];
for (const s of lib.tokens.sets) for (const t of s.tokens) allTokens.push({ set: s.name, active: s.active, name: t.name, type: t.type, value: String(t.value), resolved: t.resolvedValue });
let tokOk = 0;
for (const t of IR.tokens || []) {
  const cands = allTokens.filter(x => x.name === t.name && (!t.mode || x.set === modeSet(t.mode)));
  if (!cands.length) { gap("token-missing", `${t.name}${t.mode ? " (mode " + t.mode + ")" : ""}`); continue; }
  const hit = cands.find(x => x.type === t.type && x.value === String(t.value)) || cands[0];
  if (hit.type !== t.type) { gap("token-type-mismatch", `${t.name}: IR ${t.type}, Penpot ${hit.type}`); continue; }
  if (hit.value !== String(t.value)) { gap("token-value-mismatch", `${t.name}: IR ${t.value}, Penpot ${hit.value}`); continue; }
  if (hit.active && (hit.resolved === null || hit.resolved === undefined || hit.resolved === "")) { gap("token-unresolved", `${t.name} = ${hit.value} does not resolve`); continue; }
  tokOk++;
}

// ---- components ------------------------------------------------------------------------------------
const propsKey = (p) => Object.entries(p || {}).map(([k, v]) => `${k}=${v}`).sort().join(", ");
const parseName = (n) => Object.fromEntries([...String(n || "").matchAll(/([A-Za-z][A-Za-z0-9]*)=([A-Za-z0-9]+)/g)].map(m => [m[1], m[2]]));
const mains = [];                                   // main instances of everything migrated, for the bindings pass
const bases = [...new Set((IR.components || []).map(c => c.name))];
let compOk = 0; let cellsExpected = 0, cellsFound = 0;
for (const base of bases) {
  const expected = (IR.components || []).filter(c => c.name === base);
  const named = (lib.components || []).filter(c => c.name === base);
  const head = named.find(c => c.isVariant && c.isVariant());
  let actual = [];                                  // [{ key, comp }]
  if (head) { let group = []; try { group = head.variants.variantComponents() || []; } catch (e) { group = []; } actual = group.map(c => ({ key: propsKey(c.variantProps), comp: c, error: c.variantError || null })); }
  else actual = (lib.components || []).filter(c => c.name === base || String(c.name).startsWith(base + " / ") || (String(c.name).includes("=") && named.length === 0))
    .map(c => ({ key: propsKey(parseName(c.name)), comp: c, error: null }));
  if (!actual.length) { gap("component-missing", base); cellsExpected += expected.length; continue; }
  let baseOk = true;
  for (const e of expected) {
    cellsExpected++;
    const want = propsKey(e.variantProps);
    const got = actual.find(a => a.key === want) || (!want && actual[0]) || null;
    if (!got) { gap("variant-missing", `${base}${want ? " (" + want + ")" : ""}`); baseOk = false; continue; }
    if (got.error) { gap("variant-error", `${base} (${want}): ${got.error}`); baseOk = false; }
    cellsFound++; mains.push(got.comp.mainInstance());
  }
  if (expected.some(e => e.variantProps) && expected.length > 1 && !head) gap("variants-not-grouped", `${base}: ${expected.length} standalone components instead of a variant group`);
  if (baseOk) compOk++;
}

// ---- screens ---------------------------------------------------------------------------------------
let screenOk = 0;
for (const s of IR.screens || []) {
  const board = penpotUtils.findShape(x => x.type === "board" && x.name === s.name);
  if (!board) { gap("screen-missing", s.name); continue; }
  mains.push(board);
  const kids = board.children || [];
  const wantKids = (s.children || []).length;
  let ok = true;
  if (kids.length !== wantKids) { gap("screen-children-mismatch", `${s.name}: IR ${wantKids}, Penpot ${kids.length}`); ok = false; }
  const wantInst = (s.children || []).filter(c => c.kind === "instance").length;
  const gotInst = kids.filter(k => { try { return k.isComponentInstance && k.isComponentInstance(); } catch (e) { return false; } }).length;
  if (gotInst < wantInst) { gap("instance-redrawn", `${s.name}: ${wantInst - gotInst} of ${wantInst} component uses are not instances`); ok = false; }
  if (s.layout && s.layout.type === "flex" && !board.flex) { gap("layout-lost", `${s.name}: Auto Layout did not become a flex layout`); ok = false; }
  if (ok) screenOk++;
}

// ---- token bindings on what was migrated -----------------------------------------------------------
const PADS = { paddingTop: "topPadding", paddingRight: "rightPadding", paddingBottom: "bottomPadding", paddingLeft: "leftPadding" };
let rawCount = 0;
const rawOf = (sh) => {
  const tk = sh.tokens || {}; const raw = [];
  if ((sh.fills || []).some(f => f && f.fillColor) && !tk.fill) raw.push("fill");
  if (typeof sh.borderRadius === "number" && sh.borderRadius !== 0 && !tk.borderRadiusTopLeft) raw.push("borderRadius");
  if (sh.flex) {
    for (const g of ["rowGap", "columnGap"]) if (sh.flex[g] && !tk[g]) raw.push(g);
    for (const [p, fp] of Object.entries(PADS)) if (sh.flex[fp] && !tk[p]) raw.push(p);
  }
  return raw;
};
const seen = new Set();
for (const m of mains) {
  if (!m || seen.has(m.id)) continue; seen.add(m.id);
  for (const sh of [m, ...penpotUtils.findShapes(x => x.id !== m.id, m)]) {
    let inInstance = false; try { inInstance = sh.id !== m.id && sh.isComponentInstance && sh.isComponentInstance(); } catch (e) {}
    if (inInstance) continue;                       // an instance's values belong to its component
    const raw = rawOf(sh);
    if (raw.length) { rawCount += raw.length; gap("untokenized-on-canvas", `${m.name} > ${sh.name}: ${raw.join(", ")}`); }
  }
}

// ---- carry what the IR already knew ----------------------------------------------------------------
const carried = { irGaps: (IR.gaps || []).length, offGridSnaps: (IR.fidelityNotes || []).filter(n => n.kind === "off-grid-snap").length };
for (const g of IR.gaps || []) gaps.push(typeof g === "string" ? { kind: "ir-gap", detail: g } : { kind: g.kind || "ir-gap", detail: g.detail });
for (const n of IR.fidelityNotes || []) gaps.push({ kind: n.kind || "fidelity-note", detail: n.kind === "off-grid-snap" ? `${n.where}.${n.property}: ${n.from} -> ${n.to}` : JSON.stringify(n) });

let integrity = null; try { integrity = penpot.currentFile.validate(); } catch (e) { integrity = "validate() unavailable"; }
const blocking = gaps.filter(g => /missing|mismatch|unresolved|error|redrawn|layout-lost/.test(g.kind));
return {
  tokens: { expected: (IR.tokens || []).length, ok: tokOk },
  components: { expected: bases.length, ok: compOk, cellsExpected, cellsFound },
  screens: { expected: (IR.screens || []).length, ok: screenOk },
  bindings: { rawValues: rawCount },
  gaps, carried, integrity,
  summary: `Tokens ${tokOk}/${(IR.tokens || []).length} · Components ${compOk}/${bases.length} (${cellsFound}/${cellsExpected} variants) · Screens ${screenOk}/${(IR.screens || []).length} · ${gaps.length} gaps (${blocking.length} blocking)`,
  pass: blocking.length === 0 && !(Array.isArray(integrity) && integrity.length),
  note: "pass=true means nothing is missing or wrong — the remaining gaps (snaps, untokenized values, unsupported features) still go in the report. Pair with export_shape per screen."
};
