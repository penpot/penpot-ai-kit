# Penpot MCP Tool Reference

> Single source of truth. Every `SKILL.md` transcludes or links to this file. Do not redefine the tool surface inside a skill — point here.

The Penpot MCP exposes **four core tools**, plus one that is only present in **local mode**
(`import_image`). If a reference describes `get_object_tree`, `get_file`, or `penpot_schema`,
it is describing a hypothetical/outdated surface — **ignore it**. If the connected server
exposes a tool not listed here, do not deny its existence: verify it against the official MCP
docs (help.penpot.app/mcp) before using it, and prefer the core four for everything they cover.
Everything an agent reads or mutates in Penpot happens through `execute_code`.

## The core tools

| Tool | Parameters | Purpose | When to call |
|------|-----------|---------|--------------|
| `high_level_overview` | none | Returns the MCP's own usage guidance + a high-level Plugin API overview. | **Always first**, before any other Penpot action in a session. |
| `penpot_api_info` | `type` (string, required), `member` (string, optional) | Returns the Plugin API type/member documentation (signatures, properties). | Whenever you are about to use a method or property you are not 100% certain exists with that exact signature. |
| `execute_code` | `code` (string, required) | Runs JavaScript in the Penpot Plugin API context. **The only way to read deep structure and the only way to mutate the canvas.** | Discovery (read) and every create/modify/delete operation. |
| `export_shape` | `shapeId` (string: an id, or `'selection'`, or `'page'`), `format` (`'png'` default \| `'svg'`), `mode` (`'shape'` default \| `'fill'`) | Renders a shape to an image for visual validation. | After meaningful phases, to verify the result visually — both for the agent's own visual self-review and for the human checkpoint. Limited in remote mode. |
| `import_image` (**local mode only**) | see the live tool schema | Adds a local image asset to the design. | Only when the MCP runs locally; in remote mode use `penpot.uploadMediaUrl`/`uploadMediaData` through `execute_code` instead. |
| `submit_feedback` (**some remote servers**) | see the live tool schema | Sends feedback about the MCP/Plugin API to the Penpot team. | Only when the user asks to report an API problem (e.g. a new entry for `docs/mcp-api-findings.md`). Never call it on your own, and never put file content or personal data in it. |

`execute_code` also accepts an optional `sessionId`: when several Penpot sessions are connected the
server lists them in an error — ask the user which one, never pick.

## Globals available inside `execute_code`

Code passed to `execute_code` runs with these globals in scope:

### `penpot` — main API entry point
- Reads: `penpot.root`, `penpot.currentPage`, `penpot.currentFile`, `penpot.selection`, `penpot.viewport`, `penpot.library`, `penpot.fonts`.
- Create shapes: `createRectangle()`, `createBoard()`, `createEllipse()`, `createPath()`, `createText(str)`, `createBoolean(type, shapes)`, `createShapeFromSvg(svg)`, `createShapeFromSvgWithImages(svg)` (async).
- Group/variants: `group(shapes)`, `ungroup(group, ...)`, `createVariantFromComponents(boards)`.
- Align/distribute: `alignHorizontal(shapes, "center"|"left"|"right")`, `alignVertical(shapes, "center"|"top"|"bottom")`, `distributeHorizontal(shapes)`, `distributeVertical(shapes)`.
- Pages: `createPage()`, `openPage(page, newWindow?)` — `await penpot.openPage(page)` activates the page (same-call on 2.20; two-call protocol on older instances — `plugin-api-gotchas.md` #15). `createPage()` does not activate it.
- Prototyping (decks, flows): `page.createFlow(name, startBoard): Flow`, `page.flows`, `flow.remove()`; `shape.addInteraction(trigger, action, delay?)` with trigger `"click" | "mouse-enter" | "mouse-leave" | "after-delay"` and action `{ type: "navigate-to", destination: board, preserveScrollPosition?, animation? }` (also `"previous-screen"`, `"open-url"`, overlay actions); animation `{ type: "dissolve" | "slide" | "push", duration, easing?, direction?, way? }`; `shape.interactions`, `removeInteraction()`. A `navigate-to` on a board not yet in a flow auto-creates one.
- Board extras: `waitForLayoutUpdate(timeout?)` (async, gotcha #17), `showInViewMode`, `clipContent`, `addGridLayout()` → `board.grid.appendChild(shape, row, col)` (1-based), `addRulerGuide(orientation, value)`.
- Effects (surfaces only — `shared/visual-effects.md`): `shadows`, `blur`, `backgroundBlur` (Board), `blendMode`, gradient fills via `fills = [{ fillOpacity, fillColorGradient: { type: "linear" | "radial", startX, startY, endX, endY, width, stops: [{ color, opacity?, offset }] } }]`.
- Code gen: `generateStyle(shapes, opts?)`, `generateMarkup(shapes, opts?)`, `generateFontFaces(shapes)` (async).
- Media: `uploadMediaUrl(name, url)` (async), `uploadMediaData(name, Uint8Array, mime)` (async) → `fills = [{ fillOpacity: 1, fillImage }]`; verify in the next call (gotcha #18).
- Fonts: `penpot.fonts.all` — resolve by **exact** name (`fonts.all.find(f => f.name === "Inter")`, gotcha #13b), then `font.applyToText(text, variant)` and re-assert size/line-height.
- Color: `shapesColors(shapes)`, `replaceColor(shapes, old, new)`, `flatten(shapes)`.

- Waiting: `await penpot.waitForLayoutUpdate(timeout?)` (whole file) / `await shape.waitForLayoutUpdate()` — layout geometry only, not token application (gotchas #2, #17). Never `await penpot.waitForSave()`: every call already waits for the save (gotchas #19).
- Safety net (verified on 2.20.0, gotchas #19): `await penpot.currentFile.saveVersion(label)` (named restore point), `penpot.currentFile.validate()` (integrity errors, `[]` when healthy), `penpot.history.undoBlockBegin()` / `undoBlockFinish(id)` (one undo step per agent step).
- Context: `penpot.version`, `penpot.currentFile.features` (e.g. `"render-wasm/v1"`, `"variants/v1"`), `penpot.location.href` (link to the open file — never build links by hand).
- Components: `copy.resetOverrides()`, `copy.updateMain()`, `component.duplicate()`, `component.remove()` / `library.deletedComponents` + `component.restore()`, `component.annotation` (≤ 300 chars) — documented in the 2.20 overview, not yet exercised by the kit; verify on first use.
- Token source: `penpot.library.tokensSource` — assign a connected library to use ITS tokens in this file (then `library.local.tokens` lists them and toggles sets/themes; the source catalog is read-only). Documented in the 2.20 overview, not yet exercised by the kit. Check it in discovery: "no local tokens" does not mean "no design system" when a library is connected.

### `penpotMgmt` — teams, projects and files (null when unavailable)
Verified on 2.20.0: `await penpotMgmt.listProjects()`, `await project.createFile({ name })`,
`await file.open()`, `penpotMgmt.workspace` (`{ status, fileId, fileName, teamId }`; `penpot.currentFile`
is `null` on the dashboard). Documented: `listTeams`, `getFile(id)`, `duplicate`, `moveTo`, `remove`
(to Trash) / `restore`, `file.shared = true` (publish as library),
`penpot.library.connectLibrary(file.id)`. Rules:
- **Scratch work goes in a scratch file.** Probes, evals and risky experiments: create (or duplicate
  into) a clearly named file — the agent can do this itself instead of asking the user to.
- Navigating away, renaming, moving, deleting or restoring projects/files happens **only when the user
  asks**. After `file.open()`, every `penpot` object from before is stale — re-acquire file, page, shapes.

### `penpotUtils` — helpers (prefer these for navigation/analysis)
`penpotUtils` is **not** a `penpot_api_info` type (the lookup fails) — its signatures are in `high_level_overview`.
- `getPages()`, `getPageById(id)`, `getPageByName(name)`.
- `findShapeById(id)`, `findShape(predicate, root?)`, `findShapes(predicate, root?)`.
- `shapeStructure(shape, maxDepth?)` → `{id,name,type,children?,layout?}` — **the canonical "read the object tree" call**.
- `analyzeDescendants(root, evaluator, maxDepth?)`, `isContainedIn(shape, container)`.
- `setParentXY(shape, parentX, parentY)`, `addFlexLayout(container, dir)`.
- Tokens: `tokenOverview()` (→ `{ [setName]: { [tokenType]: string[] } }`, no counts), `findTokenByName(name)`, `findTokensByName(name)`, `getTokenSet(token)`.
- `createVariantContainer([{ shape, properties }])` (gotchas #9, #12), `isWasmRenderer()`.

### `storage` — persistent JS object across `execute_code` calls
- Arbitrary object whose properties survive between separate `execute_code` invocations in the same session. Use it to cache discovery results and ids (plain data; stored functions hung when called later — gotchas #19). See `state-management.md`.

## Canonical idioms

```js
// READ the object tree (discovery, no mutation)
return penpotUtils.shapeStructure(penpot.currentPage.root, 3);

// READ active tokens
return penpotUtils.tokenOverview();

// CREATE a rectangle
const r = penpot.createRectangle();
r.x = 100; r.y = 100; r.resize(200, 100);
r.fills = [{ fillColor: "#0066FF", fillOpacity: 1 }];
penpot.currentPage.root.appendChild(r);
return { id: r.id };

// VALIDATE visually afterwards → call export_shape with that id (separate tool call)
```

## Output discipline for `execute_code`
- Return data with `return {...}`. **Do not** `console.log` a value you also return — it appears twice.
- Keep returns small and structured (ids, counts, names) — they are read back by the agent.
- One logical step per call. Never batch an entire screen/library into a single `execute_code`.
- A call that errors or times out may still have run (gotchas #19): read state before retrying, and write steps so a second run is harmless.
