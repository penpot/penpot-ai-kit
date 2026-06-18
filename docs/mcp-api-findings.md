# Penpot MCP / Plugin API — Verification Findings & Developer Feedback

**Audience:** developers of the Penpot MCP server and the Penpot Plugin API.
**Purpose:** during the build of this kit we validated every API call an AI agent makes, first against
the read-only docs (`high_level_overview`, `penpot_api_info`) and then **live** against a connected
plugin instance. This document lists the friction points an LLM-driven agent hits, with a concrete
recommendation for each: **improve docs / improve the error message / change the API / no action**.

Most findings are *not* requests to change the API — several are "tighten the docs or the error
message so agents self-correct." They're ordered by impact on agent reliability.

## Verification context
- **Date:** 2026-06-05.
- **MCP server:** Penpot remote MCP (`PenpotRemoteJD`), tools `high_level_overview`, `penpot_api_info`,
  `execute_code`, `export_shape`.
- **Method:** (1) read `high_level_overview` + `penpot_api_info('TokenCatalog'|'Variants'|'File'|…)`;
  (2) live smoke test on a throwaway file — create token sets/tokens, build two tokenized components,
  group them as variants, `export_shape` to verify.
- **Result:** the full flow works. The items below are where an agent's *first, reasonable* attempt
  failed or was misled.
- **Second pass (2026-06-08):** a full skill-battery run against a real, component-heavy file (dark
  gradient login + dashboard, 11 components, 0 tokens) surfaced two more live limitations — Findings 8
  and 9 below — and falsified one earlier "no action" claim (padding token binding; see Finding 8).
- **Third pass (sessions through 2026-06-10, incl. design.penpot.dev v2.16.0-RC10):** real build
  sessions surfaced three more — Findings 10–12 below — including one **file-corrupting** failure mode
  (variant mutation, Finding 10) and an extension of Finding 8 (`["all"]` also rejects bindings).

Impact legend: **High** = blocks a common agent task with a confusing failure · **Med** = wastes a
retry / is non-obvious · **Low** = cosmetic or doc-only.

---

## Finding 1 — Reference tokens fail validation when the referenced set is inactive  ·  **High**

**Observed.** `set.addToken({ type: "color", name: "color.bg.default", value: "{color.gray.50}" })`
throws even though `color.gray.50` exists — because new sets are created **inactive** and the
referenced set (`primitives`) was not active. After `set.toggleActive()` on the referenced set, the
exact same call succeeds.

**Evidence.**
```
// primitives + semantic both freshly created (inactive)
sem.addToken({type:"color", name:"color.bg.default", value:"{color.gray.50}"})
→ "[PENPOT PLUGIN] Value not valid. Code: :error"
// after prim.toggleActive() and sem.toggleActive():
→ ok ; resolvedValue "#0066FF" etc.
```

**Agent impact.** This is the single biggest trap. The natural agent flow is "create primitives set →
create semantic set → add alias tokens." That flow fails on the *first* alias with a generic
`Value not valid`, giving the agent nothing to act on. It looks like the reference syntax is wrong
(it isn't) or the target token is missing (it isn't).

**Recommendation (pick one or more):**
- **API change (preferred):** allow creating a reference token whose target is structurally valid even
  if the referenced set is currently inactive — an unresolved reference is a normal state (it resolves
  when the set activates). Validation should check *existence/shape*, not *current active resolution*.
- **Error message:** if you keep the rule, make the error say *why*: e.g.
  `reference "{color.gray.50}" cannot be resolved: token set "primitives" is inactive`.
- **Docs:** state explicitly in `high_level_overview` that new sets are created inactive and that
  reference resolution requires the referenced set to be active.

---

## Finding 2 — New token sets are created inactive (with no hint in the overview)  ·  **High**

**Observed.** `tokens.addSet({ name })` returns a set with `active === false`. The overview documents
`active` and `toggleActive()` but does not say sets start inactive — and "only active sets affect
shapes," so tokens applied from an inactive set silently don't change shapes.

**Agent impact.** Agents create tokens, apply them, see nothing change, and can't tell why (no error).
Compounds Finding 1.

**Recommendation:**
- **Docs:** add one line to the Design Tokens section of `high_level_overview`: *"Newly created sets
  are inactive; call `set.toggleActive()` to activate. Only active sets resolve references and affect
  shapes."*
- **API ergonomics (optional):** consider `addSet({ name, active: true })`, or default the first set
  in a file to active.

---

## Finding 3 — Generic, non-actionable error messages from the plugin  ·  **High (cross-cutting)**

**Observed.** Distinct failures collapse to near-identical strings:
```
"[PENPOT PLUGIN] Value not valid. Code: :error"
"[PENPOT PLUGIN] Value not valid: Field value is invalid: Invalid data. Code: :error"
```
The first was an inactive-set reference (Finding 1); the second was a numeric token value (Finding 4).

**Agent impact.** LLM agents recover well from *specific* errors and poorly from generic ones — a vague
`Value not valid` triggers random retries instead of a targeted fix. This is the highest-leverage,
lowest-risk improvement: it multiplies the value of every other API.

**Recommendation:**
- **Error messages:** include the offending field, the received value/type, the expected
  value/type, and (where relevant) the failed invariant. e.g.
  `addToken: "value" must be a string; got number (16). Use "16".`

---

## Finding 4 — Token `value` must be a string; numbers are rejected  ·  **Med**

**Observed.** `addToken({ type: "spacing", name: "...", value: 16 })` →
`Value not valid: Field value is invalid`. `value: "16"` works. (Dimension with a unit, `"16px"`,
also worked.)

**Agent impact.** Numeric values are an obvious first guess for numeric token types (spacing,
dimension, borderRadius). The rejection is reasonable but the error doesn't say "use a string."

**Recommendation:**
- **Error message:** as in Finding 3.
- **API ergonomics (optional):** coerce numbers to strings for numeric token types, or accept both.
- **Docs:** the overview examples only show string values; one explicit "always a string" note helps.

---

## Finding 5 — `high_level_overview` and `penpot_api_info` disagree on `addTheme`  ·  **Med**

**Observed.** The overview's Design Tokens section documents:
```
addTheme(group: string, name: string): TokenTheme
```
but `penpot_api_info('TokenCatalog')` (the authoritative type doc) says:
```
addTheme(group: { group: string; name: string }): TokenTheme
```
The object form is the real one. (`addSet` is consistent between the two: `{ name }`.)

**Agent impact.** Agents that trust the overview (the document they're told to read first) write
`addTheme("mode", "Light")` and fail. The overview is otherwise excellent and self-contained, which
makes this single inconsistency more damaging.

**Recommendation:**
- **Docs:** fix the overview's `addTheme` signature to the object form (and double-check other
  signatures in the overview against `penpot_api_info`).

---

## Finding 6 — Variant creation is non-obvious (and easy to hallucinate)  ·  **Med**

**Observed.** The only variant-creation entry point is
`penpot.createVariantFromComponents(mainInstances: Board[])`. It requires **component main instances**
(so you must `createComponent` each variant first), and the resulting container initializes one
property `"Property 1"` whose per-component value is the *component's name*, while the components are
renamed to `"Component"`. Producing named axes then requires `variants.renameProperty(pos, name)`,
`variants.addProperty()`, and `variantComponent.setVariantProperty(pos, value)`.

We initially (wrongly) assumed a `combineAsVariants(ids)` method existed. **It does not** — and the
overview correctly never mentions it; that was our error, not an API one. But the *real* flow is
verbose and surprising enough that agents invent shortcuts.

**Agent impact.** Med. Works once understood, but the "create a component per cell, then group, then
rename/relabel" sequence is several non-obvious steps; the auto-naming behavior is surprising.

**Recommendation:**
- **Docs:** add a short worked example to the Variants section showing the full sequence
  (component-per-cell → `createVariantFromComponents` → `renameProperty`/`setVariantProperty`), and a
  one-liner that the container auto-creates `Property 1` from component names.
- **API ergonomics (optional):** a convenience that accepts `(components, { axes })` or that sets
  property names/values in one call would remove a lot of agent boilerplate.
- **No action** required on `combineAsVariants` — it correctly doesn't exist.

---

## Finding 7 — `export_shape` with `shapeId: "page"` returned an http error  ·  **Low / needs repro**

**Observed.** `export_shape("page")` → `Error handling task: http error`, while exporting the variant
container by its shape id (PNG) succeeded immediately on the same file.

**Agent impact.** Low — exporting a specific shape is the common case and works. But "page" is a
documented special id, so the failure is confusing when it happens.

**Recommendation:**
- **Investigate:** confirm whether whole-page export has a size/timeout/transient limit; if so, return
  a specific error (e.g. "page export too large") rather than a generic http error. May be transient —
  needs a clean repro.

---

## Finding 8 — `applyToken` to padding properties fails for every numeric token type  ·  **High**

**Observed.** Binding a token to any padding property via `shape.applyToken(token, ["paddingTop"])`
(or `paddingBottom`/`paddingLeft`/`paddingRight`) throws — for **both** `spacing` and `dimension`
token types. The *same tokens* bind fine to `["rowGap"]` / `["columnGap"]`. Yet `high_level_overview`
lists `paddingLeft/paddingTop/paddingRight/paddingBottom` under `TokenSpacingProps` as valid
`applyToken` properties, so an agent following the docs hits a runtime wall.

**Evidence.**
```
// fresh board with a flex layout; probe set has spacing.16 and dimension.16 (resolvedValue 16)
b.applyToken(tSpacing,  ["paddingTop"]) → "[PENPOT PLUGIN] Value not valid: Field message is invalid: . Code: :error"
b.applyToken(tDimension,["paddingTop"]) → "[PENPOT PLUGIN] Value not valid: Field message is invalid: . Code: :error"
b.applyToken(tSpacing,  ["rowGap"])     → ok
b.applyToken(tDimension,["rowGap"])     → ok
```

**Agent impact.** High. Tokenizing layout padding is a *core* operation — every screen/section builder
binds spacing tokens to a board's padding (e.g. this kit's `buildSection.js`, `createScreenWrapper.js`,
foundations padding bindings). The first reasonable, docs-compliant attempt fails with the generic
`Field message is invalid` (empty field name), so the agent can't tell whether the token, the property,
or the value is wrong. Because it succeeds on gaps, agents may "fix" it by mis-binding padding to a gap,
silently corrupting layout intent.

**Extension (third pass).** `applyToken(tok, ["all"])` **also fails** (`Value not valid`) — observed
with borderRadius tokens. The four explicit corner props work; this kit now documents "four corners,
never `all`" and mirrors padding tokens as resolved values on the flex (`shared/plugin-api-gotchas.md`
#8).

**Recommendation (pick one or more):**
- **API change (preferred):** support `applyToken` on `paddingTop/Bottom/Left/Right` (and margins) to
  match the documented `TokenSpacingProps`. Padding is the most common spacing binding after gaps.
- **Docs:** if padding binding is genuinely unsupported, *remove* `paddingLeft/Top/Right/Bottom`
  (and any unsupported margin props) from the `TokenSpacingProps` list in `high_level_overview`, and
  state which properties actually accept tokens.
- **Error message:** name the offending field and the rejected property, e.g.
  `applyToken: property "paddingTop" does not accept a token binding`.

---

## Finding 9 — No reliable way to target a page; cross-page `appendChild` is a silent no-op  ·  **Med-High**

**Observed.** `penpot.createBoard()` takes no page argument and places the new shape on a fixed page
context (in testing, shapes consistently landed on the first page, `Page 1`), **not** necessarily on
`penpot.currentPage`. Worse, the natural workaround — create the shape, then move it with
`otherPage.root.appendChild(shape)` — **returns without error but does not relocate the shape**: it
stays on its original page. There is no exception to catch, so an agent believes the move succeeded.

**Evidence.**
```
penpot.openPage(testPage);            // penpot.currentPage.name === "AI Kit Tests"
const b = penpot.createBoard();       // intended for AI Kit Tests
testPage.root.appendChild(b);         // no throw
// climb b -> root: actually lands on "Page 1", not "AI Kit Tests"
```
(Reproduced twice: a one-off probe and a bulk attempt to relocate ~6 boards — every cross-page
`appendChild` silently no-op'd; the boards remained on the source page.)

**Agent impact.** Med-High. An agent asked to "build this on a scratch/test page" (a reasonable way to
isolate work from the user's real screens) cannot do it reliably: creation lands on the wrong page and
the move silently fails, so artifacts pile up on the user's main page. Same-page `appendChild`
(reparenting within one page) works correctly — only **cross-page** reparenting is affected.

**Recommendation:**
- **API:** make cross-page `appendChild` either *work* (relocate the shape + descendants to the target
  page) or *throw* a specific error (`cannot reparent across pages; use <X>`). A silent no-op is the
  worst option for agents.
- **API ergonomics:** give `createBoard`/`createText`/etc. an optional page target, or document the
  exact, reliable way to create shapes on a chosen page (e.g. whether `openPage()` must precede
  creation and how `penpot.root` vs `penpot.currentPage` bind to creation).
- **Docs:** clarify in `high_level_overview` which page new shapes are created on and how to target a
  specific page; note that cross-page reparenting is unsupported (if so).

---

## Finding 10 — Mutating a variant component corrupts the file and hangs every save  ·  **Critical**

**Observed** (design.penpot.dev v2.16.0-RC10).
`LibraryVariantComponent.setVariantProperty(pos, value)` updates the component's variant-properties
but does **not** update the variant root shape's internal `:variant-name`. The file then fails backend
`referential-integrity` validation (`:variant-bad-variant-name`): every subsequent component-touching
mutation produces an `update-file` POST the backend rejects with **HTTP 400 that the plugin never
surfaces** — the promise never resolves, the MCP times out at ~30 s, the session dies ~40 s, and
unflushed mutations roll back. It looks non-deterministic because success depends on debounce timing
vs. the next rejected save. The same poisoned-file hang was reproduced with `addVariant()` + rename,
`comp.instance()` + `detach()` on a variant, `createComponent` on a detached variant instance, and
`shape.remove()` on a variant board.

**Recovery** is plugin-impossible (delete/rename also hang): the user must reload the Penpot tab to
drop the local queue, delete the bad variant container from the UI (the UI writes both fields),
reload again to confirm, then reconnect the plugin.

**Agent impact.** Critical. The documented variant flow (Finding 6) **is** this mutation path — an
agent following the docs can silently poison a real file and lose the user's unsaved work. *Reading*
variants and instancing a specific variant component are safe.

**Recommendation:**
- **API change (preferred):** make `setVariantProperty` (and the other mutators) update
  `:variant-name` atomically, or reject the call with a surfaced, specific error.
- **Plugin:** surface backend save rejections to the plugin caller instead of hanging.
- **Docs:** until fixed, mark variant mutation as unsafe from the plugin API.

---

## Finding 11 — `font.applyToText()` writes a corrupt `fontId`  ·  **Med-High**

**Observed.** `font.applyToText(text, variant)` sets a broken uuid as the text's `fontId`; exports
render with a serif/mono fallback. Setting the fields directly from the `Font`/`FontVariant` objects
(`text.fontId = font.fontId`, plus `fontFamily`, `fontVariantId`, `fontWeight`, `fontStyle`) works.

**Agent impact.** The convenience method is the natural first choice and the failure is only visible
in a render — agents that don't `export_shape` after setting fonts ship wrong typography.

**Recommendation:** fix `applyToText` to write the same id the direct assignment path writes; until
then, document the direct-assignment idiom in the overview.

---

## Finding 12 — `layoutChild.absolute` children position in PAGE coordinates, contradicting the docs  ·  **Med**

**Observed.** With `child.layoutChild.absolute = true`, setting `child.x`/`child.y` positions the
shape in **absolute page coordinates**; the overview claims parent-relative. Agents must compute
`parent.x + offset`. Related ergonomics traps from the same sessions: flex-child sizing must go
through `child.layoutChild.horizontalSizing = "fill"` (direct `child.horizontalSizing = "fill"`
throws), `layoutChild.*` must be set only **after** appending the child to its layout parent, and
`openPage()` is async (`penpot.currentPage` updates on the *next* `execute_code` call).

**Recommendation:** fix the overview's coordinate-space claim for absolute layout children, and add
one line each for the `layoutChild` sizing path, the set-after-append requirement, and `openPage`
asynchrony.

---

## Things that need NO action (verified correct)
- `addSet({ name })`, `addToken({ type, name, value })`, and the token `type` enum — all correct and
  consistent between the overview and `penpot_api_info`.
- `applyToken` property names — the overview lists them correctly *as names* (the four `borderRadius*`
  corners, `fill`, `strokeColor`, `fontSize`, `rowGap`/`columnGap`, etc.), and there is no single
  `"borderRadius"`/`"padding"` property. **Caveat (see Finding 8):** although `paddingLeft/Top/Right/Bottom`
  and `"all"` are *listed* as valid, `applyToken` to them fails at runtime for every numeric token
  type — so the property names are documented but not all are honored. Gaps (`rowGap`/`columnGap`) work.
- `createBoard`, `addFlexLayout`, `createComponent(shapes)`, `instance()`, `mainInstance()`,
  `switchVariant`, `findTokenByName`, `tokenOverview()`, `generateStyle`/`generateMarkup`.
  **Caveat (see Finding 10):** these are verified on *plain* components — on **variant** components,
  `instance()` + `detach()`, `createComponent` on a detached variant instance, and `remove()` all
  trigger the poisoned-save hang.
- `File.setSharedPluginData(namespace, key, value)` / `getSharedPluginData` — work exactly as documented
  (this kit relies on them for resumable run ledgers).
- `high_level_overview` overall — comprehensive, accurate, and well-structured (Finding 5 aside).

---

## Priority summary for the MCP/API team
| # | Finding | Impact | Cheapest effective fix |
|---|---------|--------|------------------------|
| 10 | Variant mutation corrupts the file; saves hang silently | Critical | Update `:variant-name` atomically (or reject with a surfaced error); surface save rejections |
| 3 | Generic error messages | High | Specific, field-level error strings (multiplies all other fixes) |
| 1 | Reference token needs active set | High | Allow unresolved refs at creation, or a specific error |
| 2 | Sets created inactive (undocumented) | High | One doc line + optional `addSet({name, active})` |
| 8 | `applyToken` to padding / `"all"` fails (all token types) | High | Support the bindings, or remove them from the documented property lists |
| 9 | No page targeting; cross-page `appendChild` silent no-op | Med-High | Make cross-page reparent work or throw; document page targeting |
| 11 | `applyToText` writes a corrupt `fontId` | Med-High | Fix the convenience method; document the direct-assignment idiom |
| 5 | Overview vs api_info `addTheme` mismatch | Med | Fix the overview signature |
| 4 | Numeric token values rejected | Med | Specific error and/or coerce |
| 12 | Absolute layout children use page coords (docs say relative) | Med | Fix the overview's coordinate-space claim |
| 6 | Variant flow non-obvious | Med | Worked example in docs; optional convenience API |
| 7 | `export_shape("page")` http error | Low | Repro + specific error |

**One-line takeaway:** the biggest wins for agent reliability are fixing the **file-corrupting variant
mutation** (Finding 10), **specific error messages** (Finding 3), **clarifying token-set activation**
(Findings 1–2), and the binding/placement traps that block core build flows (**Findings 8–9**).
