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
