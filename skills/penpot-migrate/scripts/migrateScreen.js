/**
 * migrateScreen.js
 * Purpose: build one screen from an IR screen node, reusing the migrated components.
 * Usage:   paste into execute_code (Phase 4). One screen per call; export it and compare with the Figma
 *          screenshot before the checkpoint.
 * Input:   IR_SCREEN { name, size:[w,h], fill?: tokenName,
 *            layout?: { type:"flex", dir, rowGap, columnGap, padding:[t,r,b,l], tokens?: { rowGap, columnGap, padding } },
 *            children: [{ kind:"instance", component, variantProps? } | { kind:"text", name, text, fill? }] }.
 * Output:  { screenId, reused, placed:[...], missingComponents:[...], exceptions:[...] }.
 * Note:    - A variant is found through its GROUP: library.components lists a variant group as a single
 *            entry, so the match is made on head.variants.variantComponents()[].variantProps.
 *          - Layout values bind to the migrated tokens; a number with no token is written as a literal and
 *            reported in `exceptions`. Gaps and paddings are bound in separate calls (gotchas #2).
 *          - Idempotent by name: an existing top-level board with this name that already has children is
 *            returned untouched (a failed call may have run — gotchas #19).
 */
const IR_SCREEN = null; // REPLACE-ME (e.g. the IR's screens[0])
if (!IR_SCREEN) return { error: "no IR screen provided" };
const exceptions = [];
const tok = (n) => (n ? penpotUtils.findTokenByName(n) : null);
const bind = (shape, name, props, literal, apply) => {
  const t = tok(name);
  if (t) { const todo = props.filter(p => !(shape.tokens && shape.tokens[p] === name)); if (todo.length) shape.applyToken(t, todo); return; }
  if (literal != null && apply) { apply(literal); exceptions.push({ kind: name ? "missing-token" : "untokenized-source-value", shape: shape.name, token: name || null, props, literal }); }
};

const root = penpot.currentPage.root;
let screen = (root.children || []).find(c => c.type === "board" && c.name === IR_SCREEN.name) || null;
if (screen && (screen.children || []).length) return { screenId: screen.id, reused: true, note: "screen already built — read it before deciding whether anything is missing" };
if (!screen) { screen = penpot.createBoard(); screen.name = IR_SCREEN.name; root.appendChild(screen); }
if (IR_SCREEN.size) screen.resize(IR_SCREEN.size[0], IR_SCREEN.size[1]);
if (IR_SCREEN.fill && tok(IR_SCREEN.fill)) { screen.fills = []; bind(screen, IR_SCREEN.fill, ["fill"]); }

const L = IR_SCREEN.layout || null;
if (L && L.type === "flex") {
  const T = L.tokens || {};
  const f = screen.flex || screen.addFlexLayout();
  f.dir = L.dir || "column";
  const gapProp = /^row/.test(f.dir) ? "columnGap" : "rowGap";
  if (T[gapProp] || L[gapProp]) bind(screen, T[gapProp], [gapProp], L[gapProp], v => { f[gapProp] = v; });
  if (T.padding || L.padding) bind(screen, T.padding, ["paddingTop", "paddingBottom", "paddingLeft", "paddingRight"], L.padding,
    p => { f.topPadding = p[0]; f.rightPadding = p[1]; f.bottomPadding = p[2]; f.leftPadding = p[3]; });
}

// Resolve a component, variant-aware.
const lib = penpot.library.local;
const sameProps = (a, b) => { const ka = Object.keys(a || {}), kb = Object.keys(b || {}); return ka.length === kb.length && ka.every(k => String(a[k]) === String(b[k])); };
function resolveComponent(name, props) {
  const matches = (lib.components || []).filter(c => c.name === name);
  if (!matches.length) return null;
  const head = matches.find(c => c.isVariant && c.isVariant());
  if (head && props) {
    let group = []; try { group = head.variants.variantComponents() || []; } catch (e) { group = []; }
    return group.find(c => sameProps(c.variantProps, props)) || null;
  }
  return matches.find(c => !(c.isVariant && c.isVariant())) || matches[0];
}

const placed = []; const missingComponents = [];
for (const ch of (IR_SCREEN.children || [])) {
  if (ch.kind === "instance") {
    const comp = resolveComponent(ch.component, ch.variantProps || null);
    if (comp) { const inst = comp.instance(); screen.appendChild(inst); placed.push({ component: ch.component, variantProps: ch.variantProps || null, id: inst.id }); }
    else missingComponents.push({ component: ch.component, variantProps: ch.variantProps || null });
  } else if (ch.kind === "text") {
    const t = penpot.createText(ch.text || ""); t.name = ch.name || "p"; screen.appendChild(t); t.growType = "auto-width";
    if (ch.fill) bind(t, ch.fill, ["fill"]);
    placed.push({ text: t.id, name: t.name });
  }
}
return { screenId: screen.id, reused: false, placed, missingComponents, exceptions,
  next: "NEXT call: verify token bindings, then export_shape this board and compare with the Figma screenshot" };
