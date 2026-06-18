# 03 — Variant API

Verify all of this with `penpot_api_info` before relying on exact shapes — variants are drift-prone.

> ⚠️ **File-corruption risk (gotchas #12 / mcp-api-findings Finding 10):** mutating variant components
> (`setVariantProperty`, axis renames, `detach()`/`remove()` on variants) has corrupted live files —
> the backend silently rejects every later save and the session hangs. Duplicate the file before any
> variant mutation, verify saves persist after the FIRST mutation, and on any ~30 s hang stop and use
> the standalone-components fallback (`Component / Axis=Value` named components, created one at a
> time). Reading variants and instancing a specific variant are safe.

## Creating variants
1. Build each variant as its own component Board (clone the base, restyle with state tokens, rename `Property=Value`).
2. Combine them with `penpot.createVariantFromComponents(mainInstances: Board[])` → a `VariantContainer`.
   (There is **no** `combineAsVariants` method.) To add another variant to an existing group later,
   `variantContainer.appendChild(mainInstance)` then `setVariantProperty(pos, value)`.
3. Inspect: `container.isVariantContainer()`, `container.variants` → `Variants` with `.properties` and `.variantComponents()`.

## Variant properties
- `Variants.properties: string[]` — axis names (`Size`, `State`).
- `Variants.addProperty()`, `Variants.renameProperty(pos, name)`.
- A `LibraryVariantComponent.variantProps` is `{ [property]: value }`.

## Switching on an instance
```js
const inst = comp.instance();
inst.switchVariant(0, "Large");   // (position, value) — confirm signature with penpot_api_info
```

## Naming
Each variant component's descriptor: `Button, Size=Medium, Hierarchy=Primary, State=Hover`.
Property names PascalCase singular; values PascalCase.
