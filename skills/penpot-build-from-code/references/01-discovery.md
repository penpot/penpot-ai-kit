# 01 — Discovery (Phase 0)

> Loaded during Phase 0. Read-only. The goal is to map the **existing** Penpot design system so that
> every value in the input code has a token or a component to land on. Nothing is mutated here.

## Why discovery comes first
Building from code is not "draw what the screenshot looks like." It is "express the code's intent in
the design system that already exists in this Penpot file." If you skip discovery you will hardcode
hex values and redraw components that already exist — the two failures this skill exists to prevent.
So before a single shape is created you build three artifacts:

1. A **token map** (so a code value like `#0066FF` resolves to `color.action.primary.bg`).
2. A **component catalog by role** (so a `<Button>` becomes an instance, not a rounded rectangle).
3. A **section outline + style inventory** parsed from the code (so you build incrementally and know
   in advance which values are UNMAPPED).

## Step 1 — Enumerate the design system
Run `scripts/inspectDesignSystem.js` in one `execute_code` call. It walks
`penpot.library.local.tokens.sets` and `penpot.library.local.components`, returning:

- `tokensByName`: `{ "color.action.primary.bg": { type:"color", resolvedValue:"#0066FF", set:"semantic" }, ... }`
- `tokensByValue`: a **reverse index** keyed by normalized resolved value
  (`"#0066ff" -> "color.action.primary.bg"`, `"16" -> "spacing.4"`). This is the lookup you use in
  Phase 2 to turn a code value into a token name in O(1).
- `componentsByRole`: `{ button:{id,name,variants}, input:{...}, card:{...} }` — role inferred from the
  component name (lowercased, matched against a small role vocabulary: button, input, card, badge,
  avatar, icon, nav, tab, checkbox, switch, select, modal…).

Cache all of it into `storage.run.ds` so later calls (and a resume after truncation) reuse it.

### Confirm the active theme/sets
Also call `penpotUtils.tokenOverview()` to confirm which sets/themes are active. If a `Dark` theme
exists, note that semantic tokens switch per theme while primitives stay constant
(`shared/tokens-schema.json`). Bind shapes to **semantic** tokens so theming works — never to
primitives, even if a primitive's resolved value matches the code value exactly.

## Step 2 — Parse the code into a section outline
Read the input code top-down and segment it into ordered sections by semantic role. For a typical
page that yields something like:

```
[
  { role: "header",     codeFragment: "<header>…</header>",        childrenRoles: ["nav","button"] },
  { role: "main",       codeFragment: "<main>…",                   childrenRoles: ["section"] },
  { role: "card-grid",  codeFragment: "<ul class='cards'>…",       childrenRoles: ["card"] },
  { role: "footer",     codeFragment: "<footer>…",                 childrenRoles: ["p","nav"] }
]
```

Keep fragments small — one section is one Phase 2 `execute_code` call. Map each `role` to a semantic,
kebab-case layer name per `shared/naming-conventions.md`.

## Step 3 — Build the style inventory
Collect **every distinct** style value the code uses — colors, spacing/padding/gap, border-radius,
border-width, font family/size/weight/line-height, shadows. For each, pre-match against
`tokensByValue`:

| codeValue | cssProp | matched |
|-----------|---------|---------|
| `#0066FF` | `background` | `color.action.primary.bg` |
| `20px` | `padding` | `UNMAPPED` (nearest grid token: `spacing.4`=16 or `spacing.5`=20?) |
| `#111827` | `color` | `color.text.default` |
| `8px` | `border-radius` | `radius.control` |

### Normalization rules before matching
- Colors: lowercase, expand 3-digit hex to 6, strip alpha if the token track is opaque, convert
  `rgb()/rgba()` to hex for comparison.
- Spacing: convert `rem` to px (×16 unless the code sets a different root), strip the `px` unit so the
  key matches the token's numeric `resolvedValue` (`"16"`).
- Tailwind: resolve the utility against the project's `tailwind.config` scale first (`p-5` → 20px),
  then match the px value.
- Round near-grid values to the nearest 4px token **and flag the rounding** — do not silently snap a
  value the human hasn't approved.

## Step 4 — Triage UNMAPPED values
Anything that doesn't match becomes a decision at the checkpoint:
- **Propose a token** — add `{ from, cssProp, suggestName, suggestTier:"semantic", value }` to
  `ledger.proposedTokens`. Do **not** create it; a human approves name/value/tier
  (`shared/modes-and-policies.md`: new tokens always require review).
- **Documented exception** — only with approval, recorded in `ledger.exceptions` with a reason.

## Exit criterion
You have `storage.run.ds` (tokensByName, tokensByValue, componentsByRole), a section outline, and a
style inventory where every value is matched or flagged. Present coverage and the UNMAPPED list at the
✋ checkpoint. Do not start Phase 1 until the UNMAPPED triage is decided.

## Gotchas in this phase
- This is **read-only** — if you find yourself calling a create method, stop.
- `tokenOverview()` reflects the active theme; a token's `resolvedValue` can differ across themes —
  inventory against the theme the screen targets.
- Component role inference is heuristic; when a name is ambiguous, confirm at the checkpoint rather
  than guessing a mapping.
- Verify any unfamiliar member (`penpot_api_info("LibraryComponent")`, `penpot_api_info("Token")`)
  before relying on its shape.
