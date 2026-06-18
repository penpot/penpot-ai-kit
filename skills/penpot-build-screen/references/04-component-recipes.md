# 04 — Component recipes

Assemble common UI from existing components + tokens. Always reuse before redrawing.

## Reuse pattern
```js
const comp = penpot.library.local.components.find(c => c.name === "Button");
const inst = comp.instance();
sectionBoard.appendChild(inst);          // flex positions it
```

## Recipes (compose from instances + tokenized Boards)
- **App bar / nav** — row flex Board; logo + nav links (Text or Link component) + primary action; `justifyContent: space-between`.
- **Card** — column flex Board; image/figure + heading (`text.heading.h4`) + body + action; `radius.card`, tokenized padding, tokenized surface color.
- **Form field** — column flex Board; `label` + Input component + helper/error text; consistent stack gap.
- **List / table row** — row flex Board; cells as `fill`/`fix` children; consistent inline gap.
- **Empty state** — centered column; icon + heading + body + primary action.

## Rules
- If a needed component doesn't exist, note it and hand off to `penpot-component-factory` — don't hand-roll a permanent raw version.
- Bind every color/spacing/radius/type to semantic tokens.
- Name layers semantically (`nav`, `card-container`, `field-row`).
