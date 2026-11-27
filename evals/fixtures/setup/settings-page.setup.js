/**
 * settings-page.setup.js — scripted fixture for evals that need an EXISTING design system
 * (build-screen-direct, and any eval whose brief says "reuse the file's tokens and components").
 *
 * PURPOSE
 *   Without this, the brief promised `primitives` / `semantic` tokens and Button / Input / Select /
 *   Toggle, the scratch file had none, and the agent under test invented its own — so component
 *   reuse (the point of the skill) was never exercised. This script builds that minimal system the
 *   same way every time, so the eval measures the skill and not the agent's fixture improvisation.
 *
 * USAGE  — paste into execute_code once per phase, in this order, in a SCRATCH file:
 *   PHASE = "tokens"      create + activate the two token sets
 *   PHASE = "components"  build the four tokenized components (token application is async …)
 *   PHASE = "verify"      … so bindings are read here, in a later call; must return ok: true
 *   PHASE = "teardown"    remove everything this fixture created (run at eval cleanup)
 *   Every phase is idempotent by name and safe to re-run (a failed call may have run — gotchas #19).
 *
 * OUTPUT
 *   tokens:     { sets: [{ name, created, tokens }] }
 *   components: { components: [{ name, created, id }] }
 *   verify:     { ok, components: [{ name, missing: [...] }] }
 *   teardown:   { removed: { components, sets } }
 *
 * NOTE
 *   Names are deliberately NOT prefixed (the brief looks components up as `Button`, etc.); what was
 *   created is recorded in shared plugin data ("penpot-ai" → "fixture.settings-page") so teardown
 *   removes exactly that and never a set or component the file already had.
 */
const PHASE = "REPLACE-ME-phase"; // "tokens" | "components" | "verify" | "teardown"
const NS = "penpot-ai", KEY = "fixture.settings-page";

const PRIMITIVES = [
  ["color", "color.gray.0", "#FFFFFF"], ["color", "color.gray.50", "#F6F7F9"], ["color", "color.gray.200", "#DFE2E8"],
  ["color", "color.gray.400", "#878A96"], ["color", "color.gray.600", "#565B66"], ["color", "color.gray.900", "#16181D"],
  ["color", "color.blue.600", "#2457D6"], ["color", "color.red.600", "#C4281C"],
  ["spacing", "spacing.4", "4"], ["spacing", "spacing.8", "8"], ["spacing", "spacing.12", "12"], ["spacing", "spacing.16", "16"],
  ["spacing", "spacing.24", "24"], ["spacing", "spacing.32", "32"], ["spacing", "spacing.48", "48"],
  ["borderRadius", "radius.sm", "4"], ["borderRadius", "radius.md", "8"], ["borderRadius", "radius.full", "999"],
  ["fontSizes", "font.size.14", "14"], ["fontSizes", "font.size.16", "16"], ["fontSizes", "font.size.24", "24"], ["fontSizes", "font.size.32", "32"],
];
const SEMANTIC = [
  ["color", "color.bg.default", "{color.gray.50}"], ["color", "color.bg.surface", "{color.gray.0}"],
  ["color", "color.text.default", "{color.gray.900}"], ["color", "color.text.muted", "{color.gray.600}"],
  ["color", "color.text.onAction", "{color.gray.0}"],
  ["color", "color.border.default", "{color.gray.200}"], ["color", "color.border.control", "{color.gray.400}"],
  ["color", "color.action.primary.bg", "{color.blue.600}"], ["color", "color.action.danger.bg", "{color.red.600}"],
];
const SETS = [["primitives", PRIMITIVES], ["semantic", SEMANTIC]];
const COMPONENTS = ["Button", "Input", "Select", "Toggle"];
// what verify expects on each component's main board (text/knob children are checked for a fill binding)
const EXPECT = {
  Button: ["fill", "paddingTop", "paddingLeft", "borderRadiusTopLeft"],
  Input:  ["fill", "strokeColor", "paddingTop", "paddingLeft", "borderRadiusTopLeft"],
  Select: ["fill", "strokeColor", "paddingTop", "paddingLeft", "borderRadiusTopLeft", "columnGap"],
  Toggle: ["fill", "paddingTop", "paddingLeft", "borderRadiusTopLeft"],
};

const file = penpot.currentFile, cat = penpot.library.local.tokens, lib = penpot.library.local;
const readRecord = () => { try { const raw = file.getSharedPluginData(NS, KEY); return raw ? JSON.parse(raw) : { sets: [], components: [] }; } catch (e) { return { sets: [], components: [] }; } };
const writeRecord = (r) => file.setSharedPluginData(NS, KEY, JSON.stringify(r));
const findSet = (name) => (cat.sets || []).find((s) => s.name === name) || null;
// resolve from the fixture's own sets first, so a same-named token elsewhere in the file cannot win
const tok = (name) => { for (const [setName] of SETS) { const s = findSet(setName); const t = s && s.tokens.find((x) => x.name === name); if (t) return t; } return penpotUtils.findTokenByName(name); };
// apply only where not already bound: re-applying a bound token toggles it OFF (gotchas #2)
const bind = (shape, name, props) => { const t = tok(name); if (!t) return; const todo = props.filter((p) => !(shape.tokens && shape.tokens[p] === name)); if (todo.length) shape.applyToken(t, todo); };
const CORNERS = ["borderRadiusTopLeft", "borderRadiusTopRight", "borderRadiusBottomRight", "borderRadiusBottomLeft"];
const findComponent = (name) => (lib.components || []).find((c) => c.name === name) || null;

if (PHASE === "tokens") {
  const rec = readRecord(); const out = [];
  for (const [setName, defs] of SETS) {
    let set = findSet(setName); const created = !set;
    if (!set) { set = cat.addSet({ name: setName }); if (!rec.sets.includes(setName)) rec.sets.push(setName); }
    if (!set.active) set.toggleActive();                       // new sets are born inactive (gotchas #8)
    for (const [type, name, value] of defs) if (!set.tokens.find((t) => t.name === name)) set.addToken({ type, name, value });
    out.push({ name: setName, created, tokens: set.tokens.length });
  }
  writeRecord(rec);
  return { phase: PHASE, sets: out, next: 'run PHASE = "components"' };
}

if (PHASE === "components") {
  const rec = readRecord(); const out = [];
  const root = penpot.currentPage.root;
  const base = (name, x) => {                                   // tokenized flex board, hugging its content
    const b = penpot.createBoard(); b.name = name; root.appendChild(b); b.x = x; b.y = -400;
    const f = b.addFlexLayout(); f.dir = "row"; f.alignItems = "center"; f.justifyContent = "center";
    f.horizontalSizing = "auto"; f.verticalSizing = "auto";
    return b;
  };
  const label = (parent, chars, colorToken) => {
    const t = penpot.createText(chars); t.name = "label"; parent.appendChild(t); t.growType = "auto-width";
    bind(t, colorToken, ["fill"]); bind(t, "font.size.14", ["fontSize"]);
    return t;
  };
  const field = (name, x) => {                                  // shared by Input and Select
    const b = base(name, x);
    b.strokes = [{ strokeColor: "#878A96", strokeOpacity: 1, strokeWidth: 1, strokeStyle: "solid", strokeAlignment: "inner" }];
    bind(b, "color.bg.surface", ["fill"]); bind(b, "color.border.control", ["strokeColor"]);
    bind(b, "spacing.8", ["paddingTop", "paddingBottom"]); bind(b, "spacing.12", ["paddingLeft", "paddingRight"]);
    bind(b, "radius.md", CORNERS);
    b.flex.justifyContent = "space-between"; b.flex.horizontalSizing = "fix"; b.resize(280, b.height);
    b.flex.verticalSizing = "auto";
    return b;
  };
  const BUILD = {
    Button: (x) => { const b = base("Button", x);
      bind(b, "color.action.primary.bg", ["fill"]); bind(b, "spacing.8", ["paddingTop", "paddingBottom"]);
      bind(b, "spacing.16", ["paddingLeft", "paddingRight"]); bind(b, "radius.md", CORNERS);
      label(b, "Button", "color.text.onAction"); return b; },
    Input: (x) => { const b = field("Input", x); label(b, "Placeholder", "color.text.muted"); return b; },
    Select: (x) => { const b = field("Select", x); bind(b, "spacing.8", ["columnGap"]);
      label(b, "Option", "color.text.default");
      const chevron = penpot.createText("v"); chevron.name = "chevron"; b.appendChild(chevron); chevron.growType = "auto-width";
      bind(chevron, "color.text.muted", ["fill"]); bind(chevron, "font.size.14", ["fontSize"]); return b; },
    Toggle: (x) => { const b = base("Toggle", x);
      b.flex.justifyContent = "start"; b.flex.horizontalSizing = "fix"; b.flex.verticalSizing = "fix"; b.resize(44, 24);
      bind(b, "color.border.control", ["fill"]); bind(b, "spacing.4", ["paddingTop", "paddingBottom", "paddingLeft", "paddingRight"]);
      bind(b, "radius.full", CORNERS);
      const knob = penpot.createEllipse(); knob.name = "knob"; knob.resize(16, 16); b.appendChild(knob);
      bind(knob, "color.bg.surface", ["fill"]); return b; },
  };
  COMPONENTS.forEach((name, i) => {
    let comp = findComponent(name); const created = !comp;
    if (!comp) { comp = lib.createComponent([BUILD[name](i * 340)]); comp.name = name; if (!rec.components.includes(name)) rec.components.push(name); }
    out.push({ name, created, id: comp.id });
  });
  writeRecord(rec);
  return { phase: PHASE, components: out, next: 'run PHASE = "verify" in a NEW call (token application is async)' };
}

if (PHASE === "verify") {
  const out = COMPONENTS.map((name) => {
    const comp = findComponent(name); if (!comp) return { name, missing: ["component"] };
    const main = comp.mainInstance(); const t = main.tokens || {};
    const missing = EXPECT[name].filter((p) => !t[p]);
    for (const child of main.children || []) if (!(child.tokens && child.tokens.fill)) missing.push(`${child.name}.fill`);
    return { name, id: main.id, missing };
  });
  const sets = SETS.map(([setName, defs]) => { const s = findSet(setName); return { name: setName, active: !!(s && s.active), tokens: s ? s.tokens.length : 0, expected: defs.length }; });
  const ok = out.every((c) => !c.missing.length) && sets.every((s) => s.active && s.tokens >= s.expected);
  return { phase: PHASE, ok, sets, components: out, integrity: file.validate(), next: ok ? "fixture ready — run the skill" : 're-run PHASE = "components" (it only applies what is missing), then verify again' };
}

if (PHASE === "teardown") {
  const rec = readRecord(); const removed = { components: [], sets: [] };
  for (const name of rec.components) { const c = findComponent(name); if (c) { c.remove(); removed.components.push(name); } }
  for (const name of rec.sets) { const s = findSet(name); if (s) { s.remove(); removed.sets.push(name); } }
  writeRecord({ sets: [], components: [] });
  return { phase: PHASE, removed, note: "removed components stay in the library trash (deletedComponents); the API cannot purge them" };
}

return { error: `PHASE must be "tokens" | "components" | "verify" | "teardown", got: ${PHASE}` };
