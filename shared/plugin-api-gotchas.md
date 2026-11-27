# Penpot Plugin API — Gotchas

> Hard-won facts about the real Plugin API that the model gets wrong by default. Every skill links here. Verify any unfamiliar method with `penpot_api_info` before using it.

> **Version-pinned gotchas.** Every "verified live" claim below names the Penpot build it was verified
> on (history: `docs/mcp-api-findings.md`). Read `penpot.version` in Phase 0; when it differs from the
> last probed version stored in the ledger (`capabilities` key), run
> `shared/scripts/capability-probe.js` (two phases, innocuous, self-cleaning) and trust its verdict
> over this file.
>
> **Last live probe: 2026-11-27, Penpot 2.20.0 (PRE, wasm renderer), throwaway file.**
> - **Fixed since 2.17:** variant mutation no longer corrupts the file (#12) · direct property set now
>   **clears** a token binding (#2) · `await penpot.openPage()` is same-call and cross-page
>   `appendChild` throws (#15) · reference tokens no longer throw while the target set is inactive,
>   numeric token values are coerced (#8) · `applyToText` writes a valid `fontId` and keeps `fontSize` (#13).
> - **Still reproduces:** re-applying an already-bound token **toggles it off** (#2) ·
>   `applyToken(tok, ["all"])` throws (#8) · new sets are created inactive (#8) · token application is
>   not readable in the same call, even after `waitForLayoutUpdate()` (#2) · `fonts.findByName` is a
>   substring match (#13b) · `layoutChild.absolute` children use page coordinates (#14) · new boards
>   are born white (#11).
> - **Not reproduced (one attempt):** the spontaneous `flipX` mirror (#16) — keep the sweep.
> - **Not re-probed:** mass-apply races (#2), image upload (#18).
>
> **Last API sweep (2026-09-10, Penpot 2.17 PRE, `penpot_api_info`):** `Page.createFlow` /
> `shape.addInteraction`, `Board.showInViewMode`, `Board.backgroundBlur`, `Gradient` fills and
> `penpot.uploadMediaUrl` (#18) are **documented**; `Board.combineAsVariants(ids)` is **listed** but
> was never exercised live (#9). Documented ≠ verified.

## 1. Style arrays are immutable item-by-item — replace the whole array
`fills`, `strokes`, `shadows` are arrays whose **individual items cannot be mutated**. To change a
fill you must assign a brand-new array:

```js
// WRONG — silently does nothing
shape.fills[0].fillColor = "#FF0000";
// RIGHT
shape.fills = [{ fillColor: "#FF0000", fillOpacity: 1 }];
```

## 2. Token application is async, by-name, and a re-apply TOGGLES — apply once, verify next call
Facts about `shape.applyToken(token, properties)` (re-verified live on 2.20.0 unless noted):
- **Not readable in the same call.** `shape.tokens` and the resolved property are still stale right after `applyToken` — and `await penpot.waitForLayoutUpdate()` does **not** change that (it resolves in a few ms without the binding). Apply in one `execute_code` call; verify `shape.tokens` in a **later** one.
- **By NAME, not id:** the bound value re-resolves from whichever set/theme is active — so a shape bound to a semantic name **does follow theme/set switches** (this is what makes dark mode work; it is NOT a frozen snapshot).
- **Re-applying a token that is already bound TOGGLES IT OFF** (it mirrors clicking an applied token pill in the UI; the value stays, the binding goes). A "re-run the whole binding pass to be safe" loop silently unbinds everything it already bound — and so does a **retried or duplicated `execute_code` call** (#19). Group props per token per shape (`applyToken(tok, ["paddingLeft","paddingRight"])`), apply once, verify, and on retry apply **only** where `shape.tokens[prop]` is still unset. Make every binding step idempotent: `if (shape.tokens[prop] !== tok.name) shape.applyToken(tok, [prop])`.
- **Removal = set the property directly** (2.20.0: `flex.topPadding = 5` drops the `paddingTop` binding; `text.fills = [...]` drops the `fill` binding). The flip side: any direct write to a bound property **silently unbinds it** — never "nudge" a tokenized value with a literal. On ≤ 2.17 bindings were sticky and this did not work; there, overwrite by applying the correct token.
- **Do NOT mass-apply in one call** (observed on 2.17, not re-probed). Hundreds of `applyToken` calls in a single loop raced and scrambled bindings. Apply in **small chunks** (≈25–40 shapes per call) and verify each chunk.
- **One token, mixed property kinds — reported once (2.20.0, not reproduced):** `applyToken(spacing, ["columnGap", "paddingTop", "paddingBottom"])` recorded the padding bindings but left the paddings at 0. If a verified binding shows the wrong resolved value, re-bind that property on its own (clear it with a direct write first — a plain re-apply toggles).
- **Fill bindings** on Board, Rectangle and Text all stuck on 2.20.0 in the probe; on 2.17 Text/Rectangle fills were inconsistent. Keep verifying fills in the next call.

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
- **New sets are created INACTIVE** (still true on 2.20.0). Call `set.toggleActive()` right after creating a set. This matters twice: (a) a **reference token** `"{...}"` only resolves while the referenced set is active — on 2.20.0 `addToken` succeeds but `resolvedValue` is `null` until then; on ≤ 2.17 the same call *threw* `Value not valid` — and (b) only **active** sets affect shapes.
- `set.addToken({ type, name, value })` — `value` is a **string**: a literal (`"#0066FF"`, `"16"`) or a reference (`"{color.brand.500}"`). Always pass strings: 2.20.0 coerces a number (`value: 16` → `"16"`), but ≤ 2.17 rejected it as invalid. Read `token.resolvedValue` for the computed value.
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
  Its signature is documented in `high_level_overview` (`penpotUtils` is not a `penpot_api_info`
  type, so that lookup fails); gate it behind the
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

## 12. Variant mutation — safe on ≥ 2.20.0, file-corrupting on 2.16.x
**Penpot 2.20.0 (probed live 2026-11-27 on a throwaway file):** the whole variant flow works and every
call returned a confirmed save with `penpot.currentFile.validate()` → `[]`:
`penpotUtils.createVariantContainer([{ shape, properties }])`, `setVariantProperty(pos, value)`,
`variants.renameProperty(pos, name)`, `variantComp.instance()` + `switchVariant`, `detach()` on a
variant instance, `createComponent` on the detached copy, and `remove()` on a variant main board.
Build real variants. Protocol (cheap, and it replaces the old "duplicate the file" gate):
1. `await penpot.currentFile.saveVersion("before variants — <RUN_ID>")` — a restore point the user can
   roll back to from the History panel.
2. Run the variant step (prefer `createVariantContainer`, #9).
3. In the next call, read `penpot.currentFile.validate()` and each component's `variantError`; anything
   non-empty → stop and report, do not keep mutating.

**Penpot 2.16.x (Finding 10) — never mutate variants.** `setVariantProperty` left the variant root's
internal `:variant-name` stale, the backend rejected every later save with an HTTP 400 the plugin never
surfaced, calls hung ~30 s and unflushed work rolled back; recovery was manual (reload, delete the
container in the UI). 2.17–2.19 were never probed: on anything below 2.20 treat variant mutation as
unsafe unless the user works on a duplicate, and fall back to standalone components named
`Component / State`, which the user can convert to variants in the UI. Reading variants and instancing
a specific variant were always safe.

Side notes from the probe: a component named `Group / Name` is stored with `name === "Name"` (the
prefix becomes its path) — match on the last segment; creating three components in one call saved fine.

## 13. `font.applyToText()` — safe on ≥ 2.17.0; corrupt `fontId` on 2.16.x
`font.applyToText(text, variant)` writes a valid id on 2.17.0 and 2.20.0 (e.g. `"gfont-inter"`), and on
2.20.0 it left a previously set `fontSize` untouched. On 2.16.x it wrote a broken uuid and exports fell
back to serif/mono; there, set the fields directly from the `Font`/`FontVariant` objects
(`text.fontId = font.fontId`, plus `fontFamily`, `fontVariantId`, `fontWeight`, `fontStyle`).

## 13b. `penpot.fonts.findByName` matches by SUBSTRING — verify the exact family
`findByName("Roboto")` returns **"Roboto Mono"** (first substring hit), silently setting a
monospace where you wanted the sans (observed on 2.17.0, still true on 2.20.0). Resolve fonts exactly: `penpot.fonts.all.find(f => f.name === "Roboto")`, then
`font.applyToText(text, variant)` (safe on ≥2.17, see #13). After `applyToText`, re-assert
`fontSize`/`letterSpacing`/`lineHeight` — the variant application can reset them.

## 14. `layoutChild.absolute` children use PAGE coordinates — and boards clip at their edges
With `child.layoutChild.absolute = true`, setting `child.x`/`child.y` uses **absolute page
coordinates**, not parent-relative ones (the overview claims relative — it's wrong; re-verified on
2.20.0: `abs.x = 10` inside a board at x=400 gives `parentX = -390`): compute
`parent.x + offset`. Also, boards **clip** children by default — an absolute decoration placed at or
beyond the board edge is clipped invisible. Place edge decorations as absolute children of the
*outer* (screen) board instead of the clipped inner board.

## 15. Flex-child sizing goes through `layoutChild`, only AFTER appending
To stretch a flex child set `child.layoutChild.horizontalSizing = "fill"` — setting
`child.horizontalSizing = "fill"` directly throws `Value not valid`. Set any `layoutChild.*` sizing
only **after** the child is appended to its layout parent (on an orphan shape it throws). Container
self-sizing (`board.verticalSizing = "auto"`) works directly. Related session traps: `openPage()` is
async — `await` it (see below); after a
plugin-session restart `storage` is wiped and focus resets — re-find shapes by name and re-`openPage`
before continuing.

**Page targeting.** `createBoard()` lands on the page that is active *at creation time*, and shapes
can only be created or modified on the active page. **Penpot 2.20.0 (probed live 2026-11-27):**
`await penpot.openPage(page)` resolves once the page is active — `penpot.currentPage` is the new page
in the **same** call, so `await penpot.openPage(page); const b = penpot.createBoard();` is safe.
`penpot.createPage()` does not activate the new page. Cross-page `otherPage.root.appendChild(shape)`
now **throws** (`Cannot modify a page that is not currently active`) instead of silently doing
nothing — a board on the wrong page still cannot be moved, but you find out. Assert
`penpot.currentPage.id` after the `await` before creating anything.

**Older instances (≤ 2.17, Finding 9) — two-call protocol.** There `openPage` could not be awaited
and the cross-page append was a silent no-op. The kit's page scripts (`createDeckPage.js`) still run
this conservative form, which is also correct on 2.20:
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

**2.20.0 note (2026-11-27):** one attempt at the exact recipe above (100×100 row, three 180px text
children, then `fill`) did **not** mirror — `flipX` stayed `false` and the export read correctly. One
clean run is not proof the reflow bug is gone; the sweep is idempotent and cheap, so keep it.

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

## 19. Saves are confirmed per call — and a failed call may still have run
Penpot 2.20 MCP semantics (overview + live session 2026-11-27):
- `execute_code` returns success only **after Penpot saved** that call's changes; a rejected or
  timed-out save fails the call. Never treat a failed call as applied, and never `await
  penpot.waitForSave()` yourself (it waits twice). When a response starts with a **rollback warning**,
  distrust what you know: re-read the named pages/shapes, redo what is missing, and stop if it is
  rejected again. "Workspace is read-only" / "Changes could not be saved" are not retry-loop errors —
  wait, or ask the user to reopen the file.
- **A failed call is not proof that nothing ran.** Observed live: a call that came back as a gateway
  502 had been executed **twice** on the file (duplicate shapes), and a call that timed out had applied
  all its bindings. After any transport error or timeout, **read state before retrying**, and write
  every step so a second run is harmless: find-by-name before create, and guard `applyToken` (#2 — a
  blind re-run toggles bindings off).
- `await penpot.waitForLayoutUpdate()` after `applyToken`s once rejected with a 30 s timeout although
  the bindings were applied (not reproducible in isolation, where it resolved in ~5 ms). Use it for
  layout geometry (#17), never as a "tokens are applied" signal (#2).
- **Restore points and integrity checks** (all verified on 2.20.0):
  `await penpot.currentFile.saveVersion(label)` creates a named version (`{ label, createdBy, createdAt,
  isAutosave }`); `penpot.currentFile.validate()` returns the file's referential-integrity errors (`[]`
  when healthy); `const id = penpot.history.undoBlockBegin(); … penpot.history.undoBlockFinish(id)`
  groups a step into a single undo. Take a version before any restructuring phase (variants,
  migrations, bulk rebinding) and validate after it.
- `export_shape("page")` returned a blank thumbnail on 2.20.0 — export a specific board.
- **Keep data in `storage`, not functions.** Observed 3 out of 3 times on 2.20.0 (2026-11-27): a
  function saved in `storage` during one call and *called* in a later call hung until the tool timed
  out — even a read-only one-liner — while the same code pasted inline returned at once. The cause is
  not isolated (the instance was unstable that day, and the overview says functions can be stored), so
  treat it as a strong caution: store ids and plain data, and paste helper code again in each call.
