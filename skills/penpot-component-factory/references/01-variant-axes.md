# 01 — Variant axes

Decide the axes BEFORE building. Keep the matrix as small as the design language actually uses.

## Common axes
- `Size = Small | Medium | Large` — drives padding, font size, control height (all tokenized).
- `Hierarchy = Primary | Secondary | Tertiary` — drives fill/border/text token roles.
- `State = Default | Hover | Pressed | Focus | Disabled` — **mandatory** for interactive components.
- `Icon = None | Left | Right` — presence/position of an icon slot.

## Rules
- Only generate combinations the system uses (a Tertiary button may not need a Pressed visual — confirm).
- State is non-negotiable for interactive components unless the system explicitly drops one.
- Each axis maps to **token** differences, not hardcoded values:
  - Primary/Default → `color.action.primary.bg`; Primary/Hover → `color.action.primary.hover.bg`; Disabled → `color.action.disabled.bg` + reduced `opacity` token.

## Output of this phase
A matrix table the user approves, e.g. `Size × Hierarchy × State` = the set of variant components to clone.
