# 02 — Building the IR

The IR is plain JSON that normalizes Figma's model so Penpot translation is deterministic. No Penpot
writes happen in this phase.

## Shape
```json
{
  "tokens":    [{ "type": "color", "name": "color.brand.500", "value": "#0066FF", "mode": "Light" }],
  "components":[{ "name": "Button", "variantProps": { "State": "Default" },
                 "layout": { "type": "flex", "dir": "row", "rowGap": 8, "padding": [8,16,8,16] },
                 "children": [ { "kind": "text", "name": "label", "text": "Button" } ] }],
  "screens":   [{ "name": "Dashboard", "size": [1440,1024],
                 "layout": { "type": "flex", "dir": "column", "rowGap": 24 },
                 "children": [ { "kind": "instance", "component": "Button" } ] }]
}
```

## Rules
- Snap spacing to the 4px grid as you normalize; record originals if they differ (fidelity note).
- Map Figma variant property names/values to PascalCase `Property=Value`.
- Keep child order — flex relies on it.
- Persist the IR in the ledger; it is the resumable artifact.

## What `buildIR.js` adds to each node
- `layout.tokens` — token **names** for the layout numbers, matched by exact value against the migrated
  Variables: `rowGap`, `columnGap`, and either `padding` (all four sides equal) or `paddingY` +
  `paddingX` (vertical / horizontal pair). A layout whose four paddings all differ gets no padding token
  and a gap entry: bind those sides by hand.
- `fill` / `radius` — a token name when the source value is a Variable or equals one; otherwise
  `fillLiteral` / `radiusLiteral` plus an `untokenized-value` gap. The builders paint the literal and
  report it — they never invent a token.
- `ir.fidelityNotes` — one `{ kind: "off-grid-snap", where, property, from, to }` per layout number moved
  onto the 4px grid (gaps **and** paddings).
- `ir.gaps` — `{ kind, detail }` entries: whatever the analysis flagged as unsupported
  (`INVENTORY.gaps`), Variables with no Penpot token type, and untokenized values.
  `validateFidelity.js` carries all of them into the final report.
