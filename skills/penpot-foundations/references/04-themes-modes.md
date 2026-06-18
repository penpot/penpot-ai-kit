# 04 — Themes & modes (light/dark)

> Verified live against the Penpot MCP. Dark mode works, but the **agent's role is to build it
> correctly — the user activates it.** The plugin API cannot preview a theme switch.

## The model: a `modes/` group of mutually-exclusive colour sets
Model light/dark as **two colour sets in a `modes/` group**, with the mode-invariant semantics kept
in their own always-active set. (Penpot accepts `/` in a set name as a group — verified live.)

| Set | Holds | Default |
|-----|-------|---------|
| `primitives` | raw ramps/scales (mode-agnostic) | active |
| `semantic` | **mode-invariant** semantics — `spacing.*`, `radius.*`, `font.*` (reference primitives) | active |
| `modes/light` | **colour** semantics — `color.bg.*`, `color.text.*`, `color.action.*` … (reference primitives) | active |
| `modes/dark` | the **same colour names** with dark values (reference primitives) | inactive |

- `modes/light` and `modes/dark` carry the **same colour names**, different values.
- Make `modes/dark` **complete** — every colour name in `modes/light` must have a dark counterpart, or
  that token resolves wrong when dark is the active set. `createThemes.js` reports the `missing` names.
- Leave **`modes/light` active** and **`modes/dark` inactive** as the default (light) state.

### Why not `semantic` + `semantic-dark`?
- **Symmetry** — light is an explicit set, not "the un-suffixed default that happens to mean light".
- **Single responsibility** — only colours flip per mode, so only colours belong in `modes/*`. Spacing,
  radius and type are mode-invariant and live once in `semantic` (no duplication). The old
  `semantic-dark` only ever held colours anyway — that asymmetry was the smell this layout removes.
- **Maps 1:1 to Penpot Themes** — a Light/Dark Theme just toggles `modes/light` ↔ `modes/dark`.

## How the user activates dark mode
The user switches in Penpot's **Tokens panel**: activate `modes/dark`, deactivate `modes/light`
(or create a Dark theme in the UI that toggles the pair). The colour names then resolve to the dark
values and **Penpot's UI re-renders the design**. `semantic`/`primitives` stay active throughout.

## How re-resolution actually works (and the plugin's limits)
- **Bindings re-resolve BY NAME.** `applyToken` binds by token *name*, and the resolved value follows
  whichever set is active — so a shape bound to `color.bg.default` **does** flip when the user
  activates `modes/dark`. **Dark mode works** once elements are bound. The catch: the **plugin's own
  read / `export_shape` may lag** the switch — the reliable visual re-render is in Penpot's **UI** when
  the *user* toggles, so hand the toggle to the user rather than previewing it from the plugin.
- **The shapes must be bound first**, AND structural boards must follow the fill policy. A hardcoded
  design won't change on a switch because nothing is bound; and a layout board left with Penpot's
  default opaque `#FFFFFF` (see `shared/plugin-api-gotchas.md` #11) stays white in dark mode because it
  is off-system. Run `bindTokensToElements.js` (chunked) AND clear/ tokenize structural fills.
- **`theme.addSet()` does not persist via the plugin API** (`activeSets` stays empty). Don't wire named
  Themes programmatically; create the two sets cleanly. If the user wants a named Light/Dark preset,
  they assign the sets to a theme in the Tokens UI.

## What the agent SHOULD do
- Create `modes/dark` with correct dark colour values (use `scripts/createThemes.js`); cover every
  `modes/light` colour name (check the `missing` list it returns).
- Verify dark resolution by toggling sets, reading `resolvedValue`, then **restore the light default**.
- Run a contrast check on the dark values (hand off to `penpot-audit-accessibility`) — dark mode often
  breaks AA.
- Tell the user exactly how to activate it (toggle `modes/dark` on / `modes/light` off in the Tokens
  panel).

## Remember
- New sets are created **inactive**; activate the referenced set before adding reference tokens (a
  reference fails validation if its target set is inactive).
- A set name may contain `/` to form a group (`modes/light`). A set can be deleted with `set.remove()`.
