# 01 — Inspection

Read-only collection of the token system and every raw value in scope.

## Token system
`return penpotUtils.tokenOverview();` plus, for matching, build a lookup of
`{ resolvedValue -> [tokenName] }` per type (color, spacing, borderRadius, …) from
`penpot.library.local.tokens.sets[].tokens[]` (`name`, `type`, `resolvedValue`).

## Raw usage
Walk `penpotUtils.analyzeDescendants(root, ...)` collecting per shape:
- fills/strokes hex + whether `shape.tokens.fill`/`strokeColor` is bound,
- `borderRadius*` + binding,
- flex `rowGap`/`columnGap`/`*Padding` + binding,
- font size/weight/family for text.

## Output
A flat list of `{ shape, property, rawValue, boundToken? }` ready for the detection phases. Record
scope and any sampling.
