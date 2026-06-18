# 05 — Layout translation (Auto Layout → flex/grid)

## Mapping
| Figma Auto Layout | Penpot Board flex |
|-------------------|-------------------|
| direction horizontal/vertical | `flex.dir = "row" / "column"` |
| item spacing | `rowGap` / `columnGap` |
| padding (T/R/B/L) | `topPadding`/`rightPadding`/`bottomPadding`/`leftPadding` |
| "hug contents" | `horizontalSizing`/`verticalSizing = "auto"` |
| "fill container" | `"fill"` |
| fixed | `"fix"` |
| alignment | `alignItems` / `justifyContent` |
| absolute position (ignore auto layout) | `child.layoutChild.absolute = true` |

## Grids
Figma layout grids / complex multi-column → Penpot `board.addGridLayout()`. Verify the grid surface
with `penpot_api_info('GridLayout')`.

## Rules
- Preserve child order (flex is order-driven).
- Snap gaps/padding to the 4px grid; note originals that differ.
- Only use absolute positioning where Figma genuinely used it.
