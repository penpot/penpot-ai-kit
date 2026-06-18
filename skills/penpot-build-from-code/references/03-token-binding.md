# 03 — Token Binding (Phase 2)

> Loaded while building each section. How to turn a code style value into a bound semantic token,
> which property names `applyToken` expects, how to verify (async!), and how to propose a token when
> nothing matches.

## The binding contract
Every fill, stroke, spacing, padding, gap, radius, border width, and type property you set MUST come
from a token — not a literal — when a matching token exists (SKILL §7.3, AGENTS §5). The Phase 0
reverse index makes the lookup O(1):

```js
const ds = storage.run.ds;
function tokenFor(codeValue) {
  const key = String(codeValue).toLowerCase().replace(/px$/, "").trim();
  return ds.tokensByValue[key] || null;                 // token NAME or null
}
```

## Applying a token
`shape.applyToken(token, properties[])` binds a token to one or more shape properties. The token object
comes from `penpotUtils.findTokenByName(name)`.

```js
const name = tokenFor("#0066FF");                        // "color.action.primary.bg"
if (name) {
  const token = penpotUtils.findTokenByName(name);
  shape.applyToken(token, ["fill"]);
}
```

### Property-name vocabulary by token type
Bind the token to the property slot that matches its type. Confirm exact strings with
`penpot_api_info("Shape", "applyToken")` before relying on an unfamiliar one.

| Token type (`tokens-schema.json`) | Typical shape properties to bind | Code source |
|-----------------------------------|----------------------------------|-------------|
| `color` | `fill`, `stroke` | `background`, `color`, `border-color` |
| `spacing` / `dimension` | flex `rowGap`/`columnGap`, paddings, `width`/`height` slots | `gap`, `padding`, `margin`, sizes |
| `borderRadius` | `borderRadius` (rx/ry) | `border-radius` |
| `borderWidth` | `strokeWidth` | `border-width` |
| `fontSizes` | `fontSize` | `font-size` |
| `fontFamilies` | `fontFamily` | `font-family` |
| `fontWeights` | `fontWeight` | `font-weight` |
| `letterSpacing` | `letterSpacing` | `letter-spacing` |
| `textCase` | `textTransform`/case | `text-transform` |
| `textDecoration` | decoration | `text-decoration` |
| `typography` | composite text token (sets family/size/weight/line-height at once) | a CSS text style / Tailwind text class |
| `shadow` | `shadow` | `box-shadow` |
| `opacity` | `opacity` | `opacity` |

Prefer a composite `typography` token over binding four separate type tokens when the system provides
one — it keeps text on-system in a single bind.

## Async verification — the trap
`applyToken` is **asynchronous (~100 ms)**. The shape's `resolvedValue`/computed style is **not**
updated in the same `execute_code` call (gotcha #2). So:

- In the **build** call: apply all tokens for the section, then `return { applied:[...] }`.
- In a **later** `execute_code` call (the verification step of Phase 2): read back and confirm.

```js
// LATER call — verify the bindings landed
const shape = penpotUtils.findShapeById("REPLACE-ME-shapeId");
const t = shape.tokens;                                  // map of bound tokens
return {
  boundFill: t && t.fill ? t.fill : null,
  resolvedFill: shape.fills && shape.fills[0] ? shape.fills[0].fillColor : null
};
```
Never add a hardcoded "fallback" value because the read-back wasn't ready — that creates exactly the
orphan value this skill forbids. If a binding genuinely failed, fix the token name/property, don't
paste a literal.

## Spacing must hit the 4px grid
Code spacing rarely lands on the grid (`13px`, `20px`, `gap: 0.9rem`). Rules:
- If the value equals a spacing token's resolved value → bind directly.
- If it's off-grid → round to the **nearest 4px-grid token**, flag the rounding, and only keep the
  exact value as a documented exception with human approval (`tokens-schema.json` governance).
- Never set a raw numeric gap/padding when a token exists.

## Prefer semantic over primitive
Two tokens can share a resolved value (`color.blue.500` = `color.action.primary.bg` = `#0066FF`). Bind
to the **semantic** one so the screen re-themes correctly. The reverse index should prefer semantic
names; if it returns a primitive, walk up to the semantic alias that references it.

## When nothing matches — propose, don't invent
```js
ledger.proposedTokens.push({
  from: codeValue, cssProp,
  suggestName: "color.surface.subtle",      // intent-based, dot-notation
  suggestTier: "semantic",
  value: codeValue                          // literal or a "{primitive.ref}"
});
```
Add it to the ledger and surface it at the discovery/validation checkpoint. Creating a token is a
review-gated action (`shared/modes-and-policies.md`) — never do it unilaterally to "keep moving."

## Return discipline
Return small structured results (`{ applied, proposed, exceptions }`) — never `console.log` a value you
also return.
