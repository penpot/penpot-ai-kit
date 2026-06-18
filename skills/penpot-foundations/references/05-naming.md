# 05 — Token naming

Dot-notation, lowercase (see `shared/naming-conventions.md`).

## Primitives
`color.<hue>.<step>` (`color.blue.500`), `spacing.<step>` (`spacing.4`), `radius.<size>` (`radius.md`),
`font.size.<step>`, `font.weight.<name>`, `font.family.<role>`.

## Semantic (role-based, theme-able)
- Color: `color.bg.<role>`, `color.text.<role>`, `color.border.<role>`, `color.action.<variant>.<part>`, `color.feedback.<status>.<part>`.
- Spacing: `spacing.inset.<size>`, `spacing.stack.<size>`, `spacing.inline.<size>`.
- Radius: `radius.control`, `radius.card`, `radius.pill`.
- Type: `text.body`, `text.label`, `text.heading.h1`…`h6`.

## Component (optional)
`<component>.<part>.<state?>` → references a semantic token. e.g. `button.primary.bg`,
`input.border.focus`.

## Rules
- Never encode a raw value in a name (`color.0066ff` ✗).
- Singular role words; consistent ordering `category.role.variant.part`.
- A new tier must reference the tier below it (semantic → primitive, component → semantic).
