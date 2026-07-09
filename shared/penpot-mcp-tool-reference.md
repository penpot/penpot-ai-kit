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

## Globals available inside `execute_code`

Code passed to `execute_code` runs with these globals in scope:

### `penpot` — main API entry point
- Reads: `penpot.root`, `penpot.currentPage`, `penpot.currentFile`, `penpot.selection`, `penpot.viewport`, `penpot.library`, `penpot.fonts`.
- Create shapes: `createRectangle()`, `createBoard()`, `createEllipse()`, `createPath()`, `createText(str)`, `createBoolean(type, shapes)`, `createShapeFromSvg(svg)`, `createShapeFromSvgWithImages(svg)` (async).
- Group/variants: `group(shapes)`, `ungroup(group, ...)`, `createVariantFromComponents(boards)`.
- Align/distribute: `alignHorizontal(shapes, "center"|"left"|"right")`, `alignVertical(shapes, "center"|"top"|"bottom")`, `distributeHorizontal(shapes)`, `distributeVertical(shapes)`.
- Pages: `createPage()`, `openPage(page, newWindow?)`.
- Code gen: `generateStyle(shapes, opts?)`, `generateMarkup(shapes, opts?)`, `generateFontFaces(shapes)` (async).
- Media: `uploadMediaUrl(name, url)` (async), `uploadMediaData(name, Uint8Array, mime)` (async).
- Color: `shapesColors(shapes)`, `replaceColor(shapes, old, new)`, `flatten(shapes)`.

### `penpotUtils` — helpers (prefer these for navigation/analysis)
- `getPages()`, `getPageById(id)`, `getPageByName(name)`.
- `findShapeById(id)`, `findShape(predicate, root?)`, `findShapes(predicate, root?)`.
- `shapeStructure(shape, maxDepth?)` → `{id,name,type,children?,layout?}` — **the canonical "read the object tree" call**.
- `analyzeDescendants(root, evaluator, maxDepth?)`, `isContainedIn(shape, container)`.
- `setParentXY(shape, parentX, parentY)`, `addFlexLayout(container, dir)`.
- Tokens: `tokenOverview()`, `findTokenByName(name)`, `findTokensByName(name)`, `getTokenSet(token)`.

### `storage` — persistent JS object across `execute_code` calls
- Arbitrary object whose properties survive between separate `execute_code` invocations in the same session. Use it to cache discovery results, ids, and helper functions. See `state-management.md`.

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
