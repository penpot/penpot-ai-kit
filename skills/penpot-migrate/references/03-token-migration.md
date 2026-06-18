# 03 — Token migration (Variables → tokens)

## Mapping
- Figma **Variable collection** → a Penpot token **set** (often `primitives` + `semantic`).
- Figma **Variable** → `addToken({ type, name, value })` using real type strings (`shared/tokens-schema.json`).
- Figma **mode** (e.g. Light/Dark) → Penpot **theme** (`addTheme({ group: 'mode', name: 'Light' })` — object arg), switching semantic values.
- Figma alias (variable referencing variable) → token reference `"{other.token}"`.

## Process
1. Migrate primitives first, then semantic aliases (mirrors `penpot-foundations`).
2. For multi-mode variables, create the theme structure and per-mode values.
3. Validate: every token resolves; references intact; spacing on grid.

Hand the heavy lifting to `penpot-foundations` patterns; this reference covers the Figma-specific mapping.
