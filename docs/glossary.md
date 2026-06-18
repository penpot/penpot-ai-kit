# Glossary — Penpot terms (and Figma equivalents)

| Penpot | Figma equivalent | Notes |
|--------|------------------|-------|
| **Board** | Frame / Artboard | `penpot.createBoard()`. Containers for layout; can hold flex/grid. |
| **Flex layout** | Auto Layout | `board.addFlexLayout()`; `dir`, gaps, padding, sizing `fill`/`auto`/`fix`. |
| **Grid layout** | (no direct 1:1) | `board.addGridLayout()`. |
| **Token set** | Variable collection | `penpot.library.local.tokens.sets`; we use `primitives` / `semantic` (mode-invariant) / `modes/light`+`modes/dark` (colour) / optional `components`. |
| **Token** | Variable | `set.addToken({type,name,value})`; value may reference `{another.token}`. |
| **Theme** | Variable mode | `tokens.addTheme({ group, name })` (object arg); toggles the matching `modes/*` set (e.g. Light/Dark). |
| **Component** | Component | `library.createComponent(shapes)`; `component.instance()`. |
| **Variant container** | Component set | `createVariantFromComponents(mainInstances)` — there is **no** `combineAsVariants`; switch via `switchVariant`. ⚠️ Mutating variant components corrupts files (gotchas #12). |
| **Instance** | Instance | `comp.instance()`; `detach()` to break the link (never on a variant — gotchas #12). |
| **Library (local/connected)** | Library | `penpot.library.local` / `.connected`. |
| **Shared plugin data** | (plugin data) | `setSharedPluginData(ns, key, value)` — persisted in the file; our run ledger. |
| **`execute_code`** | (plugin API console) | Runs JS in the Plugin API; the only mutation path. |
| **`export_shape`** | Export | Renders a shape to PNG/SVG for visual validation. |

## Token tiers (this kit)
- **primitive** — raw scale value (`color.blue.500`).
- **semantic** — intent alias referencing a primitive (`color.text.default`); shapes bind here.
  Mode-invariant semantics (`spacing.*`, `radius.*`, `font.*`) live in the `semantic` set; **colour**
  semantics live in `modes/light` / `modes/dark` (same names in both — see `shared/modes-and-policies.md`).
- **component** — optional per-component alias referencing a semantic token (`button.primary.bg`).

## Modes (this kit)
- **Suggest** — propose only. **Apply-with-review** — change then checkpoint. **Auto-fix** — safe set only.
