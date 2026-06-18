# 06 — Screen migration

Build screens last, after tokens and components exist.

## Process
1. Create the screen Board at the IR `size`; apply the root flex/grid from the IR layout.
2. Walk the IR children in order:
   - `kind: "instance"` → instantiate the migrated Penpot component (`comp.instance()`).
   - `kind: "text"` → `createText`, set typography tokens, set `growType`.
   - `kind: "board"/"group"` → recurse (build nested flex).
   - primitives → create + bind tokens.
3. One screen (or one major section) per `execute_code` call; checkpoint with `export_shape`.

## Rules
- Reuse migrated components — don't redraw them as raw shapes.
- Bind colors/spacing/type to migrated tokens.
- Keep names semantic; preserve hierarchy from the IR.
