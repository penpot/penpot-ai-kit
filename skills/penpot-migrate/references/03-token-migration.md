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

## Set routing in `migrateTokens.js`
| Token | Set |
|-------|-----|
| literal value | `primitives` |
| color alias, or any token that carries a Figma mode | `modes/<mode>` (a mode-less color alias → `modes/light`) |
| other alias (spacing, radius, type) | `semantic` |

A set is created only when a token lands in it. The first mode stays active and the others inactive.
An existing token with the same name and a different value is reported in `conflicts` and left alone;
an unknown token type is reported in `skipped`. `SET_PREFIX` keeps migrated sets apart from a system
the file already has.
