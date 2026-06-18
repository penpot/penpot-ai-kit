# Penpot Plugin API — Gotchas

> Hard-won facts about the real Plugin API that the model gets wrong by default. Every skill links here. Verify any unfamiliar method with `penpot_api_info` before using it.

## 1. Style arrays are immutable item-by-item — replace the whole array
`fills`, `strokes`, `shadows` are arrays whose **individual items cannot be mutated**. To change a
fill you must assign a brand-new array:

```js
// WRONG — silently does nothing
shape.fills[0].fillColor = "#FF0000";
// RIGHT
shape.fills = [{ fillColor: "#FF0000", fillOpacity: 1 }];
```

## 2. Token application is async, by-name, and flaky at scale — CHUNK + VERIFY
Verified hard-won facts about `shape.applyToken(token, properties)`:
- **Async (~100 ms):** the shape's resolved properties aren't updated in the same `execute_code` call. Apply in one call; verify in a later one.
- **By NAME, not id:** the bound value re-resolves from whichever set/theme is active — so a shape bound to a semantic name **does follow theme/set switches** (this is what makes dark mode work; it is NOT a frozen snapshot). The visual switch happens in Penpot's UI when the user activates the set/theme; the plugin's own read may lag.
- **Do NOT mass-apply in one call.** Firing hundreds of `applyToken` calls in a single `execute_code` loop **races and scrambles bindings** (wrong token lands on wrong property). Apply in **small chunks** (≈25–40 shapes per call) across separate calls, and **verify** each chunk (`shape.tokens` should equal the intended token name); **retry** misses.
- **Type inconsistency observed:** `applyToken(..., ["fill"])` is reliable on **Boards** but **inconsistent on Text and Rectangle fills** (binding sometimes doesn't stick). Stroke/radius bindings are more reliable. Always verify fills after applying and retry.
- **Removal is NOT via setting the property.** Re-assigning `shape.fills`/`strokes` does **not** reliably clear a token binding in this version. Treat bindings as sticky; overwrite a wrong one by `applyToken`-ing the correct token to the same property.

## 3. `resize()` forces `growType: "fixed"` on text
Calling `text.resize(w, h)` switches a Text shape's `growType` to `"fixed"`. If you want
auto-sizing, set `text.growType = "auto-width"` or `"auto-height"` **after** any resize.

## 4. Flex/grid layout overrides manual x/y
When a Board has `flex` or `grid`, child `x`/`y` are ignored — the layout positions children.
To opt a child out of the layout, set `child.layoutChild.absolute = true`. Otherwise, control
position via append/insert order and the layout's gap/padding/align/justify props.

## 5. `width`/`height` are read-only — use `resize()`
Read dimensions from `shape.width`/`shape.height`/`shape.bounds`, but change them with
`shape.resize(width, height)`. Same for position relative to parent: read `parentX`/`parentY`,
set via `penpotUtils.setParentXY(shape, x, y)`.

## 6. Detach before mutating a component instance's internals
To remove/replace children inside a component instance, call `instance.detach()` first to break
the main-component link. Mutating an attached instance's structure is unsupported and will fight
the component definition. Report every detach (it is a meaningful, semi-destructive change).

## 7. Append children to a container, not to "the page"
Add shapes with `container.appendChild(child)` / `container.insertChild(i, child)`. The page root
is `penpot.currentPage.root`. A newly created shape is not on the canvas until appended.

## 8. Tokens live on the local library — `addSet`/`addTheme` take an OBJECT
Create token sets/tokens through `penpot.library.local.tokens`:
- `addSet({ name })` — **object argument**, not a bare string. (`addSet("primitives")` fails.)
- **New sets are created INACTIVE.** Call `set.toggleActive()` after creating a set. This matters twice: (a) a **reference token** `"{...}"` *fails validation* unless the referenced set is active, and (b) only **active** sets affect shapes.
- `set.addToken({ type, name, value })` — `value` is always a **string**: a literal (`"#0066FF"`, `"16"`) or a reference (`"{color.brand.500}"`). **Numeric values fail** (`value: 16` → invalid; use `"16"`). Read `token.resolvedValue` for the computed value.
- `addTheme({ group, name })` — **object argument** (e.g. `{ group: "mode", name: "Light" }`).

`applyToken(token, properties)` property names are specific: `"fill"`, `"strokeColor"`, `"fontSize"`,
`"fontWeight"`, `"opacity"`, `"rowGap"`, `"columnGap"`, the four border-radius corners
`"borderRadiusTopLeft/TopRight/BottomRight/BottomLeft"`, `"width"`, `"height"`. There is **no** single
`"borderRadius"` or `"padding"` property.

**Padding and `"all"` do NOT accept token bindings at runtime** (verified live; see
`docs/mcp-api-findings.md` Finding 8): `applyToken(tok, ["paddingTop"])` (any side, any numeric token
type) and `applyToken(tok, ["all"])` throw `Value not valid`, even though the overview lists them.
Workarounds:
- **Padding:** set resolved NUMBERS on the layout (`flex.topPadding = …`, value from the spacing
  token's `resolvedValue`) and record the mirrored token name in the run report so governance can
  re-bind when the API supports it. Never "fix" a failed padding binding by mis-binding it to a gap.
- **Radius:** apply the token to the **four explicit corner props** (works) instead of `["all"]`.
Gaps (`"rowGap"`/`"columnGap"`) bind reliably.

## 9. Components are created from shapes, instantiated from the library
`penpot.library.local.createComponent(shapes)` makes a component; `component.instance()` creates a
new instance; `component.mainInstance()` returns the main shape. Variant groups are created with
`penpot.createVariantFromComponents(mainInstances: Board[])` (there is **no** `combineAsVariants`);
the `Variants` object exposes `addVariant()`, `addProperty()`, `renameProperty(pos, name)`,
`variantComponents()`; switch an instance with `instance.switchVariant(pos, value)`.

## 10. Verify signatures, don't guess
Method names differ from other design tools (Penpot uses `createBoard`, not `createFrame`). When
unsure whether a method/property exists or what it takes, call
`penpot_api_info(type, member)` first. Guessing is the #1 source of silent failures.

## 11. Every new Board is born with an OPAQUE WHITE fill — clear it on structural boards
`penpot.createBoard()` ships with `fills = [{ fillColor: "#FFFFFF", fillOpacity: 1 }]` (verified live).
This is the #1 cause of two visual bugs:
- **Defeated border-radius:** a structural wrapper board (variant container, `button-group`, a clone
  wrapper) keeps its square-cornered white fill *behind* a rounded child of the same/another colour —
  the wrapper's corners poke out and the child's radius looks broken.
- **Dark mode stays light:** layout boards that kept the default `#FFFFFF` are off-system (no token),
  so they never flip when the user activates a dark set.

**Rule (the "fill policy"):** a board is either **structural** (layout-only chrome — clear it:
`board.fills = []`) or a **surface** (screen bg, card, sheet, button — bind a `color.bg.*` token,
never a literal). Decide per board; default layout containers to transparent. See the fill policy in
`shared/modes-and-policies.md`. Note: `fills = []` reliably clears a *raw, unbound* default fill (the
case here); clearing a *token binding* is sticky (see #2) — overwrite it by applying the right token.

## 12. NEVER mutate a variant component — it corrupts the file and hangs every save
Observed live (design.penpot.dev v2.16.0-RC10; see `docs/mcp-api-findings.md` Finding 10):
`LibraryVariantComponent.setVariantProperty(pos, value)` updates the variant properties but **not**
the variant root shape's internal `:variant-name`, leaving the file failing backend
referential-integrity validation. From then on **every component-touching mutation is rejected with
HTTP 400 that the plugin never surfaces** — calls hang ~30 s, the session dies, and unflushed
mutations roll back. The same poison applies to `addVariant()` + rename, `comp.instance()` +
`detach()` on a variant, `createComponent` on a detached variant instance, and `shape.remove()` on a
variant board. Recovery is manual (reload the Penpot tab, delete the bad container from the UI).

**Safe strategy:** do not call variant-mutating APIs. Build each state as a standalone Board, then
`createComponent([board])` **one at a time** (batching ≥5 in one call times out; allow a flush pause
between calls). Name them `Component / State` (e.g. `Checkbox / Disabled Checked`) so Penpot groups
them; the user can convert them to real variants in the UI. **Reading** variants and instancing a
specific variant (`variantComp.instance()`) are safe — only *mutation* poisons the file. If you do
attempt the variant flow, have the user duplicate the file first and verify saves still succeed after
the first mutation.

## 13. Don't set fonts via `font.applyToText()` — it writes a corrupt `fontId`
`font.applyToText(text, variant)` sets a broken uuid as `fontId`, so exports render with a
serif/mono fallback. Set the font fields directly from the `Font`/`FontVariant` objects instead:
`text.fontId = font.fontId` (e.g. `"gfont-orbitron"`), plus `fontFamily`, `fontVariantId`,
`fontWeight`, `fontStyle`.

## 14. `layoutChild.absolute` children use PAGE coordinates — and boards clip at their edges
With `child.layoutChild.absolute = true`, setting `child.x`/`child.y` uses **absolute page
coordinates**, not parent-relative ones (the overview claims relative — it's wrong): compute
`parent.x + offset`. Also, boards **clip** children by default — an absolute decoration placed at or
beyond the board edge is clipped invisible. Place edge decorations as absolute children of the
*outer* (screen) board instead of the clipped inner board.

## 15. Flex-child sizing goes through `layoutChild`, only AFTER appending
To stretch a flex child set `child.layoutChild.horizontalSizing = "fill"` — setting
`child.horizontalSizing = "fill"` directly throws `Value not valid`. Set any `layoutChild.*` sizing
only **after** the child is appended to its layout parent (on an orphan shape it throws). Container
self-sizing (`board.verticalSizing = "auto"`) works directly. Related session traps: `openPage()` is
async — `penpot.currentPage` reflects the new page only on the *next* `execute_code` call; after a
plugin-session restart `storage` is wiped and focus resets — re-find shapes by name and re-`openPage`
before continuing.
