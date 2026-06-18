# 02 — Token Architecture

## The three tiers (from shared/tokens-schema.json)
- **primitives** — raw scales, context-free. `color.blue.500`, `spacing.4`, `radius.md`, `font.size.300`.
- **semantic** — intent aliases referencing primitives. `color.text.default` → `{color.gray.900}`. **Shapes bind here.**
- **components** — optional per-component aliases referencing semantic tokens. Create only on demand.

## Color
Build a ramp per hue (e.g. `50,100,200,…,900`) as primitives. Then semantic roles:
`color.bg.default`, `color.bg.subtle`, `color.text.default`, `color.text.muted`,
`color.border.default`, `color.action.primary.bg`, `color.action.primary.text`,
`color.feedback.danger.bg`, etc. — each referencing a primitive.

## Spacing (4px grid)
Primitives `spacing.0,1,2,3,4,5,6,8,10,12,16` mapping to `0,4,8,12,16,20,24,32,40,48,64` px.
Semantic: `spacing.inset.sm|md|lg` (padding), `spacing.stack.sm|md|lg` (vertical gap),
`spacing.inline.sm|md|lg` (horizontal gap).

## Radius
Primitives `radius.none,sm,md,lg,full` → `0,4,8,16,9999`. Semantic `radius.control`, `radius.card`.

## Type scale (Minor Third, 1.2)
From a base (e.g. 16px): `…, 11, 13, 16, 19, 23, 28, 33, 40, 48`. Store as `fontSizes` tokens
(`font.size.100…900`). Semantic: `text.body`, `text.label`, `text.heading.h1…h6`.

## Token types
Use the exact strings in `shared/tokens-schema.json`. `color`, `spacing`, `borderRadius`,
`fontSizes`, `fontWeights`, `fontFamilies`, `letterSpacing`, `dimension`, `opacity`, `shadow`,
`typography`, `borderWidth`, `textDecoration`, `textCase`.
