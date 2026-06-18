# 02 — Flex / grid layout for components

## Build as a Board with flex
```js
const board = penpot.createBoard();
const flex = board.addFlexLayout();
flex.dir = "row";                 // or "column"
flex.rowGap = 8; flex.columnGap = 8;
flex.topPadding = flex.bottomPadding = 8;
flex.leftPadding = flex.rightPadding = 16;
flex.horizontalSizing = "auto";   // hug contents; "fill" to stretch; "fix" for fixed
flex.verticalSizing = "auto";
flex.alignItems = "center";
flex.justifyContent = "center";
```

## Key facts
- Flex/grid **override** child `x`/`y`. Position is determined by append order + gaps + align/justify.
- To opt a child out of the layout: `child.layoutChild.absolute = true`.
- Per-child control: `child.layoutChild.horizontalSizing/verticalSizing`, `*Margin`, `minWidth/maxWidth`, `zIndex`.
- Bind gaps/padding to **spacing tokens** where the API allows token properties (`applyToken` supports `rowGap`, `columnGap`, `paddingLeft/Top/Right/Bottom`). Verify property names with `penpot_api_info`.
- For grids use `board.addGridLayout()` and verify the grid property surface with `penpot_api_info('GridLayout')`.
