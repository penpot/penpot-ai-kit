# 02 — Component Assembly (Phase 2)

> Loaded while building each section. Covers the central decision — **instance an existing component
> vs. build a bespoke shape** — and how to assemble both inside a flex layout.

## The decision: instance first, shape last
For every node in a section's code fragment, ask in order:
1. Does `storage.run.ds.componentsByRole[role]` have a matching library component? → **instance it.**
2. Is it a structural container (a `<section>`, a card wrapper, a row)? → **create a Board with flex.**
3. Is it genuinely bespoke (one-off decorative element with no system equivalent)? → **raw shape.**

Reinventing a system component as a raw shape group is forbidden (SKILL §7.6, AGENTS §5). Instances
stay linked to the main component, inherit updates, and keep handoff parity with code.

## Instantiating a library component
```js
const cat = storage.run.ds.componentsByRole.button;            // {id, name, variants}
const comp = penpot.library.local.components.find(c => c.id === cat.id);
const inst = comp.instance();                                  // a new instance shape
container.appendChild(inst);                                   // not on canvas until appended
```
- `comp.instance()` returns the instance shape; `comp.mainInstance()` returns the main shape (do not
  edit the main). Verify with `penpot_api_info("LibraryComponent", "instance")` if unsure.
- Confirm it is an instance with `inst.isComponentInstance()` and reach the definition via
  `inst.component()`.

### Setting variant props
If the component has variant axes (e.g. `Hierarchy`, `Size`, `State`), map the code's intent to a
variant value and switch:
```js
inst.switchVariant("Hierarchy", "Primary");                    // pos/value per the axis matrix
inst.switchVariant("Size", "Medium");
```
The code's class/prop (`variant="primary"`, `size="md"`) drives the value. Verify the exact axis names
from the catalog you built in Phase 0; verify the method with `penpot_api_info("Shape", "switchVariant")`.

### Setting instance text / inner content
A button instance's label, an input's placeholder, etc. come from the code. **Do not** restructure an
attached instance's children — that fights the component definition. If you only need to set a text
value, find the text descendant and set its `characters`; if you must change structure, you must
`detach()` first (requires approval, report it). Prefer components whose API exposes the content you
need without detaching.

## Building a bespoke part inside flex
For containers and one-offs, create a Board and give it flex so children lay out by the design system's
spacing tokens rather than absolute coordinates:
```js
const sec = penpot.createBoard();
sec.name = "card-container";                                   // semantic, kebab-case
container.appendChild(sec);
sec.addFlexLayout();                                           // then configure .flex
sec.flex.dir = "column";
// gap/padding are bound via tokens in 03-token-binding, not hardcoded numbers
```
Remember (gotcha #4): once a Board has flex, child `x`/`y` are ignored — order children by
`appendChild` order and control spacing with the flex `rowGap`/`columnGap`/padding. Opt a child out
only with `child.layoutChild.absolute = true` (rare; e.g. an absolutely-positioned badge).

### Child sizing from code
Translate CSS sizing intent to `layoutChild`/flex sizing:
- `flex: 1` / `width: 100%` → `child.layoutChild.horizontalSizing = "fill"`.
- fixed width → `child.layoutChild.horizontalSizing = "fix"` + `child.resize(w, h)`.
- content-driven → `"auto"`.
- `min-width`/`max-width` → `child.layoutChild.minWidth/maxWidth`.
Use `resize(w, h)` for dimensions (width/height are read-only). For text, after `resize` set
`growType` back to `"auto-height"`/`"auto-width"` if the code's text should reflow (gotcha #3).

## Text nodes
```js
const t = penpot.createText("Save changes");                  // pass the string from the code
container.appendChild(t);
t.growType = "auto-width";                                     // if it should hug content
// font family/size/weight/line-height come from TOKENS — see 03-token-binding
```

## Ordering within a section
Append children in **DOM/source order** so the flex layout reproduces the code's visual order. Do not
rely on x/y. If the code uses `flex-direction: row-reverse` or `order:`, reflect that with the flex
`dir`/append order, not coordinates.

## Idempotency
Before creating a section's container, check whether it already exists by name under the screen Board
(resume safety): `board.children.find(c => c.name === "card-container")`. Reuse if present.

## Checkpoint
After the section is assembled and tokens bound, `export_shape` it and stop. "Looks good" approves
only this section. Name the next section before continuing.
