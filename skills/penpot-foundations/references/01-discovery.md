# 01 — Discovery (read-only)

Goal: a complete inventory of what already exists before creating anything.

## Steps
1. `high_level_overview` once.
2. Token inventory: `return penpotUtils.tokenOverview();` → `{ [setName]: { [tokenType]: string[] } }`.
3. Library inventory:
   ```js
   const lib = penpot.library.local;
   return {
     colors: lib.colors.map(c => c.name),
     typographies: lib.typographies.map(t => t.name),
     components: lib.components.map(c => c.name),
     sets: lib.tokens.sets.map(s => ({ name: s.name, active: s.active, count: s.tokens.length })),
     themes: lib.tokens.themes.map(t => t.name)
   };
   ```
4. Page structure: `return penpotUtils.shapeStructure(penpot.currentPage.root, 3);`

## Decide scope
- **New system** — no token sets exist → build primitives → semantic → (themes).
- **Extend** — sets exist but gaps → add missing tiers/tokens idempotently.
- **Infer-from-design** — shapes use raw values and few/no tokens → run inference (see `03-infer-from-design.md`).

Record the decision and inventory in the `RUN_ID` ledger; checkpoint with the user before Phase 1.
