/**
 * migrateScreen.js
 * Purpose: build one screen from an IR screen node, reusing migrated components.
 * Usage:   paste into execute_code (Phase 4). One screen per call; checkpoint with export_shape.
 * Input:   IR_SCREEN { name, size:[w,h], layout, children:[] }.
 * Output:  { screenId, placed:[...], missingComponents:[...] }.
 */
const IR_SCREEN = null; // REPLACE-ME (e.g. storage.mig.ir.screens[0])
if (!IR_SCREEN) return { error: "no IR screen provided" };

const screen = penpot.createBoard();
screen.name = IR_SCREEN.name;
if (IR_SCREEN.size) screen.resize(IR_SCREEN.size[0], IR_SCREEN.size[1]);
if (IR_SCREEN.layout && IR_SCREEN.layout.type === "flex"){
  const f = screen.addFlexLayout();
  f.dir = IR_SCREEN.layout.dir || "column";
  if (IR_SCREEN.layout.rowGap != null) f.rowGap = IR_SCREEN.layout.rowGap;
}
penpot.currentPage.root.appendChild(screen);

const placed = []; const missingComponents = [];
for (const ch of (IR_SCREEN.children || [])){
  if (ch.kind === "instance"){
    const comp = penpot.library.local.components.find(c => c.name === ch.component);
    if (comp){ const inst = comp.instance(); screen.appendChild(inst); placed.push({ component: ch.component, id: inst.id }); }
    else missingComponents.push(ch.component);
  } else if (ch.kind === "text"){
    const t = penpot.createText(ch.text||""); t.name = ch.name||"text"; screen.appendChild(t); placed.push({ text: t.id });
  }
}
return { screenId: screen.id, placed, missingComponents };
