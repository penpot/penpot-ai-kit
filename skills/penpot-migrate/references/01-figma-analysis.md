# 01 — Figma analysis

Read the source before building anything in Penpot.

## With the Figma MCP
Call the Figma MCP's own overview to discover its tools (names vary by version — e.g. design-context,
metadata, variables, screenshot). Inventory:
- **Variables / styles** (colors, spacing, type) and their **modes**.
- **Component sets** and their variant properties.
- **Screens/frames** and their Auto Layout structure.

## Without the Figma MCP (degraded)
Ask the user to paste a Figma export / JSON / screenshots. Work strictly from the provided data — never
fabricate the design.

## Output
A scope decision (what to migrate) + mapping rules (Figma name → Penpot name; Variable → token tier;
mode → theme). Confirm at the Phase 0 checkpoint.
