# 03 — Layout & composition

## Structure
- Root: a **column** flex Board (the screen). Sections stack with a consistent `rowGap` (a spacing token).
- Each section: its own flex Board (`row` or `column`) with its own padding/gap on the scale.
- **Every container is a layout Board — recursively.** Any grouping of UI elements (a card, a stat row, a
  list, a form field, a button cluster, a toolbar) is its own Board with `addFlexLayout()` (or
  `addGridLayout()`) added **before** you append its children. Boards nest as deep as the UI does.
- Use `horizontalSizing`/`verticalSizing` = `fill`/`auto`/`fix` to express responsive intent.

## Never
- **No absolute `x`/`y` for UI layout.** Flex/grid positions children via append order + gap + align/justify;
  set `child.layoutChild.absolute = true` only for genuine overlays, with a reason.
- **No plain Groups to arrange UI.** A Group only bounds shapes; it doesn't lay out. Use a Board with a layout.
- A lone leaf primitive (a single text, icon, or rectangle) needs no layout — but the moment it sits beside
  a sibling that should be spaced/aligned, wrap both in a flex Board.

## Hierarchy
- One clear primary action per screen (use the Primary button variant).
- Group related content; separate groups with spacing, not borders, where possible.
- Type hierarchy from semantic tokens: `text.heading.h1` → `text.body` → `text.label`.

## Rhythm
- All gaps/padding from the spacing scale (4px grid). Keep inset rhythm consistent across sections.
- Align to a grid; use `penpot.alignHorizontal/alignVertical/distribute*` for precise alignment.

## Responsive intent
State how each section should behave when the viewport changes (which children `fill`, which stay
`fix`). Even if you only build one breakpoint, record the intent for handoff.
