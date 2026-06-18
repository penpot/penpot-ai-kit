# 06 — Error Recovery

> Loaded when something goes wrong. Diagnose-then-fix recipes for the failures that actually occur when
> building from code. Always re-derive reality with a structure read before assuming the cause.

## First move on any anomaly
Don't guess from memory — read the ground truth:
```js
const board = penpotUtils.findShapeById("RUN_ID_HERE-boardId-or-name-lookup");
return penpotUtils.shapeStructure(board, 4);     // what actually exists now
```
Then compare against the ledger (`getSharedPluginData("penpot-ai", "RUN_ID_HERE.ledger")`).

## A. A fill/stroke change "did nothing"
**Cause:** you mutated an array item (`shape.fills[0].fillColor = ...`) — style arrays are immutable
item-by-item (gotcha #1).
**Fix:** assign a whole new array, or better, bind a token:
```js
const token = penpotUtils.findTokenByName("color.surface.default");
shape.applyToken(token, ["fill"]);               // verify in a later call
```

## B. A token "didn't apply" when I read it back
**Cause:** you read `resolvedValue` in the **same** `execute_code` call that applied it — apply is
async ~100 ms (gotcha #2).
**Fix:** read it back in a **later** call.
```js
const s = penpotUtils.findShapeById("REPLACE-ME-shapeId");
return { boundTokens: Object.keys(s.tokens || {}), fill: s.fills?.[0]?.fillColor };
```
If it genuinely didn't bind: confirm the token name exists (`findTokenByName` returns non-null) and the
property string is valid (`penpot_api_info("Shape", "applyToken")`). Fix the name/property — never add
a raw value.

## C. Children ignore the positions I set
**Cause:** the parent Board has flex/grid; child x/y are overridden (gotcha #4).
**Fix:** reorder via `appendChild`/`insertChild` and control spacing with flex gaps/padding. For a
truly absolute child: `child.layoutChild.absolute = true`, then set x/y.

## D. Text reflowed / got clipped after sizing
**Cause:** `resize(w, h)` forced `growType: "fixed"` (gotcha #3).
**Fix:** after resizing, `text.growType = "auto-height"` (or `"auto-width"`) if the code's text should
flow.

## E. Editing an instance's children misbehaves
**Cause:** mutating an attached component instance's internals (gotcha #6).
**Fix:** for content only, set the text descendant's `characters`. For structure, `detach()` first
(review-gated — get approval, record it in `ledger.pendingReview`/`created`), then mutate.

## F. A created shape isn't visible
**Cause:** never appended (gotcha #7).
**Fix:** `container.appendChild(shape)` (or the correct section Board). The page root is
`penpot.currentPage.root`.

## G. Duplicate sections after a resume
**Cause:** an existence check was skipped, so a re-run created a second `card-container`.
**Fix:** remove the duplicate (`dupe.remove()`), and ensure every create is guarded:
```js
let sec = board.children.find(c => c.name === "card-container");
if (!sec) { sec = penpot.createBoard(); sec.name = "card-container"; board.appendChild(sec); }
```

## H. Orphan values flagged by validateScreen.js
**Cause:** a literal was set instead of a token (often a "fallback" or a one-shot section).
**Fix:** for each flagged shape/property, look up `tokensByValue`; bind the token, or propose one and
move it to `ledger.proposedTokens`. Re-run the validator.

## I. `switchVariant` / component method errors
**Cause:** wrong axis name or value, or the component has no such variant.
**Fix:** re-read the catalog's `variants` from Phase 0; verify the signature with
`penpot_api_info("Shape", "switchVariant")`. Use the exact axis names discovered, not assumed ones.

## Escalation
If a fix is destructive (delete, detach, geometry rework) or ambiguous, stop and surface it at a
checkpoint with options — don't auto-apply outside the safe set (`shared/modes-and-policies.md`).
Record every recovery action in the ledger so the final report is accurate.
