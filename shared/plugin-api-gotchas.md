# Penpot Plugin API — Gotchas

> Hard-won facts about the real Plugin API that the model gets wrong by default. Every skill links here. Verify any unfamiliar method with `penpot_api_info` before using it.

> **Version-pinned, probeable gotchas:** #8 (padding token binding) and #13 (`applyToText` fontId)
> were verified live against a specific Penpot build (see `docs/mcp-api-findings.md`) and may be
> fixed upstream. Before a heavy build session — or whenever `penpot.version` differs from the last
> probed version in the ledger — run `shared/scripts/capability-probe.js` (two phases, innocuous,
> self-cleaning) and trust its verdict over this file. **#12 is NEVER probed** (the probe itself
> corrupts the file); treat it as standing policy until manually re-verified upstream.
>
> **Last live probe (2026-07-09, Penpot 2.17.0 PRE):** #8 padding binding **fixed** · #13
> `applyToText` **fixed** · `["all"]` **still broken** · direct property set does **NOT** clear a
> token binding (the 2.17 MCP overview claims it does — the overview is wrong; #2 stands).
>
> **Last API sweep (2026-09-10, Penpot 2.17 PRE, `penpot_api_info`):** `Page.createFlow` /
> `shape.addInteraction` (flows, `navigate-to`, `slide`/`dissolve`/`push` animations),
> `Board.waitForLayoutUpdate()` (#17), `Board.showInViewMode`, `Board.backgroundBlur`,
> `Gradient` fills and `penpot.uploadMediaUrl` (#18) are all **documented**; `Board.combineAsVariants(ids)`
> is **listed** on the Board interface but was not exercised live (#9). Documented ≠ verified — the
> deck/screen builders verify each in their first live run and record verdicts in the ledger.

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
- **Re-applying a token that is already bound TOGGLES IT OFF** (observed live on PRE, 2026-10-06 — it mirrors clicking an applied token pill in the UI). A "re-run the whole binding pass to be safe" loop silently unbinds everything it already bound. Group props per token per shape (`applyToken(tok, ["paddingLeft","paddingRight"])`), apply once, verify, and on retry apply **only** where `shape.tokens[prop]` is still unset.
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

**Padding bindings are version-dependent; `"all"` is broken everywhere tested.**
- **Penpot ≥ 2.17.0** (probed live 2026-07-09): `applyToken(tok, ["paddingTop"])` **works** — the
  binding sticks and the layout padding resolves. Bind paddings normally.
- **Penpot 2.16.x** (Finding 8, `docs/mcp-api-findings.md`): every padding side threw
  `Value not valid`. Workaround for old instances only: set resolved NUMBERS on the layout
  (`flex.topPadding = …` from the token's `resolvedValue`) and record the mirrored token name in
  the run report so governance can re-bind. Never mis-bind a failed padding to a gap.
- **`applyToken(tok, ["all"])` still throws on 2.17.0** — apply explicit per-property lists; for
  radius use the **four explicit corner props**.
Gaps (`"rowGap"`/`"columnGap"`) bind reliably. When in doubt, run the capability probe and trust
its verdict for the connected instance.

## 9. Components are created from shapes, instantiated from the library
`penpot.library.local.createComponent(shapes)` makes a component; `component.instance()` creates a
new instance; `component.mainInstance()` returns the main shape.

**Variant groups — three entry points, one preferred:**
- **Preferred (Penpot ≥ 2.17):** `penpotUtils.createVariantContainer([{ shape: mainBoard, properties:
  { Size: "Medium", State: "Hover" } }, …])` — one call does the whole grouping + property naming.
  Verify with `penpot_api_info("PenpotUtils", "createVariantContainer")` and gate it behind the
  duplicate-file check in #12.
- **Low-level:** `penpot.createVariantFromComponents(mainInstances: Board[])`, then
  `container.variants.renameProperty(0, name)`, `addProperty()`, and per component
  `setVariantProperty(pos, value)` — the exact mutation path that poisoned files on 2.16 (#12).
- **`Board.combineAsVariants(ids: string[])`** is *listed* by `penpot_api_info("Board")` on 2.17 but
  has not been exercised live — do not use it until a probe on a throwaway file confirms it.

`instance.switchVariant(pos: number, value: string)` takes the **property position** (index in
`container.variants.properties`), not the axis name — resolve `pos` with `indexOf(axis)` first.

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

**Penpot ≥ 2.17.0 note (2026-07-09):** the MCP now ships `penpotUtils.createVariantContainer(
[{ shape, properties }])`, a first-class helper wrapping the whole multi-step variant workflow —
strong signal this bug got upstream attention. This gotcha is deliberately NOT auto-probed (the
probe would corrupt the file). Before relying on variants: duplicate the file, run
`createVariantContainer` on two throwaway components, and confirm saves still succeed; only then
lift the restriction for that instance.

## 13. `font.applyToText()` — corrupt `fontId` on old versions; FIXED in ≥ 2.17.0
On Penpot 2.16.x, `font.applyToText(text, variant)` set a broken uuid as `fontId`, so exports
rendered with a serif/mono fallback. **Probed live on 2.17.0 (2026-07-09): fixed** — it writes a
valid id (e.g. `"gfont-m-plus-2"`). On older instances (or if the probe says `reproduces`), set the
font fields directly from the `Font`/`FontVariant` objects instead: `text.fontId = font.fontId`,
plus `fontFamily`, `fontVariantId`, `fontWeight`, `fontStyle`.

## 13b. `penpot.fonts.findByName` matches by SUBSTRING — verify the exact family
`findByName("Roboto")` can return **"Roboto Mono"** (first substring hit), silently setting a
monospace where you wanted the sans (observed live 2026-07-09 on 2.17.0 — the whole screen
rendered mono). Resolve fonts exactly: `penpot.fonts.all.find(f => f.name === "Roboto")`, then
`font.applyToText(text, variant)` (safe on ≥2.17, see #13). After `applyToText`, re-assert
`fontSize`/`letterSpacing`/`lineHeight` — the variant application can reset them.

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

**Page-targeting protocol (two calls, no exceptions).** `createBoard()` lands on the page Penpot
considers current *at creation time*, and a board on the wrong page **cannot be moved**: cross-page
`otherPage.root.appendChild(shape)` returns without error and does nothing
(`docs/mcp-api-findings.md` Finding 9). So, whenever work must live on a specific page (decks, scratch
pages, documentation pages):
1. **Call A** — `const page = penpotUtils.getPageByName(NAME) || penpot.createPage(); page.name = NAME;
   penpot.openPage(page); storage.pageId = page.id; return { pageId: page.id };`
2. **Call B** — `if (penpot.currentPage.id !== storage.pageId) return { ok: false, currentPage:
   penpot.currentPage.name, action: "ask the user to open the page in the UI, then re-run" };` — only
   after this returns `ok: true` may you `createBoard()`.
A board that still ends up on the wrong page is deleted (`remove()`) and recreated after B passes —
never "moved".

## 16. `layoutChild` "fill" expansion can set a spontaneous `flipX = true` — the subtree renders MIRRORED
Observed live (2026-08-10, Penpot 2.17.0, remote MCP): a row board created at the default 100×100,
populated with children wider than itself, then stretched via `row.layoutChild.horizontalSizing =
"fill"` came out with **`flipX = true` on the board** — the entire subtree rendered horizontally
mirrored (glyphs reversed, child order visually flipped, `→` arrows pointing `←`). It reproduced
twice in one session on two different sections. Likely mechanism: the layout reflow applies a
negative-width scale during the fill expansion, which Penpot records as a flip.

Why it's dangerous:
- **`shapeStructure` looks perfectly normal** — names, order, and layout read fine; only reading
  `shape.flipX` or *looking at an export* reveals it. This is exactly the class of defect the
  visual self-review exists to catch (`shared/visual-self-review.md`).
- Children report `flipX = true` by **inheritance**; the actual flag usually lives on one subtree
  root. Clearing the root clears the whole mirror (a fix sweep may report "1 cleared" while dozens
  of descendants *read* as flipped).

**Detect + fix** — cheap defensive sweep after building any section that uses fill-sizing:

```js
const clear = (sh) => { if (sh.flipX) sh.flipX = false; (sh.children || []).forEach(clear); };
clear(sectionBoard);   // idempotent; safe to run after every section build
```

**Prevention:** size boards to a realistic width (`resize`) *before* appending wide children and
before switching them to `fill`, rather than relying on fill to expand a 100px default. And always
export + look before the checkpoint — the mirror is unmissable in the image and invisible in the
structure read.

## 17. `Board.waitForLayoutUpdate()` replaces the "sleep 100 ms" idiom for layout geometry
Penpot ≥ 2.17 exposes `board.waitForLayoutUpdate(timeout?: number): Promise<void>` on layout boards.
After appending children / changing gaps, padding or sizing, `await board.waitForLayoutUpdate()`
**before** reading `width`/`height`/`bounds`/`textBounds` of the board or its children in the same
`execute_code` call. Guard it (`if (typeof board.waitForLayoutUpdate === "function")`) so scripts
still run on older instances, where the fallback is the classic two-call read. This is for **layout
geometry only** — token application (#2) stays asynchronous across calls regardless. `execute_code`
supports top-level `await`; if a connected server rejects it, drop the `await` and read geometry in
the next call.

## 18. Image fills — `uploadMediaUrl` is async, fallible, and only verifiable in the NEXT call
`const img = await penpot.uploadMediaUrl(name, url); shape.fills = [{ fillOpacity: 1, fillImage: img }];`
is the whole recipe (remote mode; `import_image` exists only in local mode). Traps:
- The **server** fetches the URL: private hosts, hot-link protection, CORS-restricted or oversized
  files fail — sometimes with a rejected promise, sometimes with an empty `fillImage`. Wrap in
  try/catch, **verify in the next call** (`shape.fills[0] && shape.fills[0].fillImage`) and with an
  `export_shape`, and on failure fall back to a labeled placeholder (`shared/visual-effects.md` §5)
  recorded as an `exceptions` entry — never a silent swap.
- **Only user-supplied URLs.** Never guess a public image URL; a "plausible" stock URL is fabricated
  content (`shared/design-quality.md` §6).
- `import_image` (local mode) and `uploadMediaData(name, Uint8Array, mime)` are alternatives when the
  bytes are already at hand; the verification rule is the same.
