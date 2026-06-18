# 02 — Mapping the design to the source code

> Loaded during **Phase 3**. Goal: build the correspondence table that lets Phase 4 diff like-for-like — design node ↔ DOM element, design token ↔ code variable, design state ↔ code prop/class. The code side is supplied by the user or another MCP (filesystem read, a pasted snippet, or Storybook — see `03`).

## 1. What "source" means here

A source is one of:
1. **A component file** (`src/Button.tsx`, `Button.vue`, `button.css`/`.scss`) — supplied as a path you read with a filesystem MCP, or pasted by the user.
2. **A rendered Storybook story** — its computed DOM + CSS, or its `args`/controls (see `references/03`).
3. **None** — no code available. Degrade: map design tokens to the design-system token set only; the code column stays empty and the report header records `codeSource: "none"`.

Never fabricate the code side. If you cannot read the file or render the story, say so and degrade.

## 2. Three mapping tables to build

### a) Structure: design node → DOM element
Use semantic layer names (from `shared/naming-conventions.md`) to align the Penpot tree with the code's element tree.

| Design node (name/type) | DOM/JSX element | Notes |
|-------------------------|-----------------|-------|
| `button` (board) | `<button class="btn">` | container |
| `label` (text) | `{children}` text node | |
| `icon` (path/svg) | `<Icon name=... />` | design-only if code omits it |

- Match by semantic name first, then by role/position. Auto-named layers (`Rectangle 12`) collapse mapping quality — note reduced confidence and recommend `penpot-rename-layers`.
- A design node with **no** code counterpart → `design-only` finding. A code element with no design node → `code-only`.

### b) Tokens: design token → code variable
Normalize both to dot-notation before comparing.

| Design token | Code variable | Mapping rule |
|--------------|---------------|--------------|
| `color.action.primary.bg` | `--color-action-primary-bg` | kebab CSS custom prop → dot-notation: strip leading `--`, split on `-` → join with `.` |
| `color.action.primary.bg` | `theme.color.action.primary.bg` | JS theme object: dotted path verbatim |
| `spacing.inset.md` | `--spacing-inset-md` / `space[3]` | scale-index code (`space[3]`) needs the code's scale map to resolve to px before matching |
| `borderRadius.control` | `--radius-control` | |

Resolution rule: compare **token name when both sides reference a token**; compare **resolved px/hex when one side is a literal**. A design token bound but the code uses a literal that matches → `Minor` ("code not using the variable"). A design literal but code uses the right var → `Minor` ("design not tokenized").

### c) States: design state → code prop/class
Interactive components must align on states. Penpot states usually appear as **variants** (`State=Hover`, `State=Disabled`) or as separate boards named `:hover`, `disabled`, etc. Code states appear as props (`disabled`, `variant`), pseudo-classes (`:hover`, `:focus-visible`), or data attributes (`data-state="open"`).

| Design state | Code expression |
|--------------|-----------------|
| `State=Default` | base render |
| `State=Hover` | `:hover` / `&:hover` |
| `State=Focus` | `:focus-visible` |
| `State=Pressed` | `:active` |
| `State=Disabled` | `[disabled]` / `disabled` prop |

Build the **state matrix**: rows = union of all states seen on either side; columns = `design?`, `code?`. Any cell true-on-one-side-only is a `Critical` parity gap for interactive elements (WCAG 2.4.7 / 2.4.11 if it's the focus state).

## 3. Parsing the code (lightweight, no full AST needed)

You are extracting three things; regex/structural reading is enough:
- **Variables/vars used:** CSS custom props (`var(--…)`), Sass vars (`$…`), JS theme keys (`theme.x.y` / `tokens.x.y`). List them with their literal values where defined.
- **Props/variants:** for React, the prop union types / defaultProps; for CSS, the state selectors present.
- **Element tree:** the JSX/template element names and nesting, or the CSS selector structure.

Record the **root-size assumption** if you convert `rem`→`px` (default 16px) so the report is reproducible.

## 4. Authority per dimension

State this in the report header and respect it when phrasing reconciliations:
- **Visual tokens, spacing, radius, typography, states → design authoritative** (the design file is the spec). Drift reconciliation says "update code to match design token X."
- **Behavior, a11y semantics (roles, aria), event handling → code authoritative.** The design can't express these; don't flag their absence in design as drift unless the design explicitly annotates them.

The user may override authority at the Phase 0 checkpoint; honor that.

## 5. Output of Phase 3

```
{
  structure: [ { designNode, codeElement|null, confidence } ],
  tokens:    [ { designToken|null, designLiteral|null, codeVar|null, codeLiteral|null } ],
  states:    { rows: [...], matrix: [ { state, design: bool, code: bool } ] },
  unmapped:  { designOnly: [...], codeOnly: [...] },
  rootPxAssumption: 16
}
```

Show this table at the ✋ checkpoint and let the engineer correct mis-maps before the diff runs — a wrong mapping produces confidently-wrong drift.
