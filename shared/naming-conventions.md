# Naming Conventions

> Single source of truth for names across tokens, components, variants, and layers. Every skill links here.

## Design tokens — dot-notation (W3C DTCG)
- Lowercase, dot-separated: `color.action.primary.bg`, `spacing.inset.md`, `radius.control`.
- Tiers encoded by prefix intent: primitive (`color.blue.500`) → semantic (`color.text.default`) → component (`button.primary.bg`).
- See `tokens-schema.json` for the full taxonomy and the real Penpot token `type` spellings.

## Components — PascalCase
- `Button`, `InputField`, `CardProduct`, `NavBar`.
- Sub-parts inside a component use semantic layer names (see below), not PascalCase.

## Variants — `Property=Value` pairs
- Variant property names are PascalCase singular: `Size`, `State`, `Hierarchy`, `Icon`.
- Values are PascalCase: `Size=Medium`, `State=Hover`, `Hierarchy=Primary`, `Icon=Left`.
- A variant component's full descriptor: `Button, Size=Medium, Hierarchy=Primary, State=Default`.
- Mandatory axes for interactive components unless the system says otherwise:
  `State = Default | Hover | Pressed | Focus | Disabled`.

## Layers — semantic HTML, kebab-case
- Prefer the semantic HTML element name the layer represents: `nav`, `header`, `footer`, `main`,
  `section`, `article`, `aside`, `button`, `input`, `label`, `h1`–`h6`, `p`, `ul`, `li`, `img`.
- For non-semantic containers use kebab-case role names: `card-container`, `button-group`,
  `field-row`, `avatar-stack`.
- Never ship auto-generated names like `Rectangle 12`, `Group 4`, `Board`. Renaming is a
  precondition for accessibility audits (heading hierarchy) and design-to-code review.

## Token sets & themes
- Sets (lowercase): `primitives`, `semantic` (mode-invariant: `spacing.*`, `radius.*`, `font.*`),
  `modes/light` + `modes/dark` (the colour semantics that flip per mode — same token names in both),
  and optionally `components`. See the full model in `modes-and-policies.md`.
- Themes: grouped, human-readable: group `mode`, names `Light` / `Dark` / `High Contrast` — each
  toggles the matching `modes/*` set.

## Run identifiers (long workflows)
- `RUN_ID` is a short stable slug for a multi-call session, e.g. `dsb-2026-06-05-a`. Used as the
  key namespace for `setSharedPluginData` and the optional state file. See `state-management.md`.
