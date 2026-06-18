/**
 * migrateComponent.js
 * Purpose: build one Penpot component (and variants) from an IR component group. Idempotent by name.
 * Usage:   paste into execute_code (Phase 3). Verify variant API with penpot_api_info first.
 * Input:   IR_COMPONENTS for a single base name (array of variant entries).
 * Output:  { base, variants:[...], combined }.
 */
const IR_COMPONENTS = []; // REPLACE-ME: entries sharing one base name, e.g. ir.components.filter(c=>c.name==="Button")
if (!IR_COMPONENTS.length) return { error: "no IR components provided" };

function buildBoard(node){
  const b = penpot.createBoard();
  const desc = node.name + (node.variantProps ? ", " + Object.entries(node.variantProps).map(([k,v])=>`${k}=${v}`).join(", ") : "");
  b.name = desc;
  if (node.layout && node.layout.type === "flex"){
    const f = b.addFlexLayout();
    f.dir = node.layout.dir || "column";
    if (node.layout.rowGap != null) f.rowGap = node.layout.rowGap;
    if (node.layout.columnGap != null) f.columnGap = node.layout.columnGap;
  }
  (node.children||[]).forEach(ch => { if (ch.kind === "text"){ const t = penpot.createText(ch.text||""); t.name = ch.name||"label"; b.appendChild(t); } });
  penpot.currentPage.root.appendChild(b);
  return b;
}

const boards = IR_COMPONENTS
  .filter(n => !penpotUtils.findShape(s => s.name === (n.name + (n.variantProps?(", "+Object.entries(n.variantProps).map(([k,v])=>`${k}=${v}`).join(", ")):"")), penpot.currentPage.root))
  .map(buildBoard);

let combined = null;
if (boards.length > 1) { try { combined = penpot.createVariantFromComponents(boards); } catch (e) { combined = String(e); } }
else if (boards.length === 1) { penpot.library.local.createComponent([boards[0]]); }

return { base: IR_COMPONENTS[0].name, variants: boards.map(b=>b.name), combined: combined && combined.id ? combined.id : combined };
