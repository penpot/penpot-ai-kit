# 01 — Extract markup & style from the design

> Loaded during **Phase 1**. Goal: turn the Penpot selection into normalized HTML + CSS + a per-node token/raw-value map, so the diff in Phase 4 compares *intent*, not noise.

## 1. What `generateMarkup` / `generateStyle` actually do

Both are methods on `penpot` and both take an **array of shapes** plus an optional `opts` object:

```js
penpot.generateMarkup(shapes, opts);   // → HTML string representing the selection's structure
penpot.generateStyle(shapes, opts);    // → CSS string for those shapes
```

- Pass `penpot.selection` directly — it is **already an array**. Passing a single shape (`sel[0]`) is the #1 cause of suspiciously empty output.
- The output is the **design's** notion of HTML/CSS. It uses Penpot's own class/structure conventions, **not** your code's class names or framework. Treat it as the design's declared intent.
- `generateStyle` reflects raw resolved values (it may emit `#ffffff`, `16px`, expanded or shorthand properties depending on the property). It does **not** know about your CSS custom properties — the token linkage comes from `shape.tokens`, read separately (section 3).

**Before passing any `opts`, confirm the accepted keys:**
```
penpot_api_info("Penpot", "generateMarkup")
penpot_api_info("Penpot", "generateStyle")
```
Guessing an `opts` key (e.g. `{ format: "html" }` when it expects something else) silently falls back to defaults, and you will wrongly conclude "no drift." If you are unsure, call with **no `opts`** first and inspect the default output.

## 2. `generateFontFaces` (typography completeness)

`penpot.generateFontFaces(shapes)` is **async** and returns the `@font-face` declarations the design relies on. Useful when the typography diff needs to know the actual font family/weights the design expects vs what the code ships. Call it only if the typography dimension is in scope:

```js
const faces = await penpot.generateFontFaces(penpot.selection);
return { fontFaces: faces };
```

## 3. Reading bound tokens vs raw values (the authoritative source)

`generateStyle` gives you values; `shape.tokens` tells you whether those values came from a **token** or were hardcoded. This distinction is the heart of the review.

```js
const sel = penpot.selection || [];
function nodeInfo(s) {
  const t = s.tokens ? Object.fromEntries(Object.entries(s.tokens)) : {};
  const fill = Array.isArray(s.fills) && s.fills[0] ? s.fills[0].fillColor : null;
  return {
    id: s.id, name: s.name, type: s.type,
    boundTokens: t,                 // { "fill": "color.action.primary.bg", ... } or {}
    rawFillColor: fill,             // raw hex if any
    radius: s.borderRadius ?? null,
    width: s.width, height: s.height,
  };
}
```

- `boundTokens` non-empty for a property → the design *intends* a token; the diff should compare **token names**, and the reconciliation (if drift) is "bind code var X to token Y."
- `boundTokens` empty but a raw value present → **design hygiene drift**: the value is hardcoded. Emit a `Minor` "value not tokenized" finding even if it matches the code. Then try to suggest a token via the fallback in section 5.

Verify the exact shape of the bound-token map with `penpot_api_info("Shape", "tokens")` if the structure differs from `{ property: tokenName }`.

## 4. The per-node map (what Phase 1 must return)

`scripts/extractMarkupStyle.js` returns:

```
{
  markup,            // generateMarkup(selection)
  style,             // generateStyle(selection)
  perNode: [ {
     id, name, type,
     boundTokens,    // property → token name
     rawFills,       // [{ fillColor, fillOpacity }]
     rawSpacing,     // { padding/gap if on a flex board }
     radius,
     typography,     // { fontFamily, fontSize, fontWeight, lineHeight, letterSpacing } for text
  } ]
}
```

Spacing lives on a board's `flex`/`grid` layout, not on leaf shapes — read it from the container:

```js
const board = sel.find(s => s.flex || s.grid);
const spacing = board && board.flex ? {
  rowGap: board.flex.rowGap, columnGap: board.flex.columnGap,
  topPadding: board.flex.topPadding, rightPadding: board.flex.rightPadding,
  bottomPadding: board.flex.bottomPadding, leftPadding: board.flex.leftPadding,
} : null;
```

## 5. Fallback: match a hardcoded value to an existing token

When a property is hardcoded, scan `tokenOverview()` for an exact resolved-value match so the report can suggest a token:

```js
const overview = penpotUtils.tokenOverview();
const target = "REPLACE-ME-#0066ff".toLowerCase();
const hit = (overview.tokens || []).find(t =>
  t.type === "color" && String(t.resolvedValue).toLowerCase() === target);
return { rawValue: target, suggestedToken: hit ? hit.name : null };
```

For spacing, match against `type === "spacing"` / `"dimension"` tokens; for radius, `type === "borderRadius"`. Use the exact token `type` spellings from `shared/tokens-schema.json` (`color`, `spacing`, `dimension`, `borderRadius`, `borderWidth`, `fontSizes`, `fontWeights`, `fontFamilies`, `lineHeights` via `dimension`, `letterSpacing`).

## 6. Normalization happens here, not in the diff

Emit values already normalized so Phase 4 is a pure comparison:
- colors → lowercase 6-digit hex (`#FFF` → `#ffffff`, drop alpha into a separate field);
- lengths → integer px (`1rem` → `16px` assuming the documented root size; record the assumption);
- font weights → numeric (`bold` → `700`).

## 7. Gotchas recap for this phase
- Pass the **array**, not one shape.
- Verify `opts` with `penpot_api_info` before using it.
- `shape.tokens` is the source of truth for "is this tokenized," not the CSS string.
- Empty selection → empty markup; Phase 0 must guarantee a non-empty selection.
- Do not `console.log` anything you also `return`.
