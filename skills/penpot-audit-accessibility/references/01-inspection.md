# 01 — Inspection

Collect the data the checks need, read-only.

## Gather
- All text shapes: `characters`, `fontSize`, `growType`, fill color, parent background.
- All interactive elements (buttons, inputs, links — by semantic name / component): bounds (width/height).
- Color pairs: foreground (text/icon fill) vs the nearest opaque background behind it.
- Layer names for heading-hierarchy and label inference.

## How
`penpotUtils.analyzeDescendants(penpot.currentPage.root, evaluator, 10)` to walk the tree and pull
fields per shape. Resolve background by walking up parents until an opaque fill is found.

## Notes
- If many layers are auto-named, recommend `penpot-rename-layers` before semantic checks.
- Record what was inspected (and anything skipped/sampled) for the report.
