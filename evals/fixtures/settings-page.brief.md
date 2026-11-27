# Design brief — sample fixture (settings page)

## Context
- Product: team knowledge base (B2B SaaS); audience: workspace admins; desktop 1440; Modern SaaS profile.

## Objective (single)
- The "Workspace settings" screen: an admin updates workspace name, default language, and member permissions.

## Inputs
- Sections top → bottom: topbar nav · page title + description · "General" group (workspace name, URL slug, default language) ·
  "Members" group (default role select, invite policy toggles) · "Danger zone" (delete workspace) · sticky save bar.
- Existing tokens & components: reuse the file's `primitives` / `semantic` sets and the `Button`, `Input`, `Select`, `Toggle` components (the eval's scripted fixture, `fixtures/setup/settings-page.setup.js`, creates them); propose only what is missing.

## Constraints
- Use existing components; semantic tokens only; 4px grid; no card-in-card-in-card; one primary action (Save).

## Acceptance Criteria
- Clear hierarchy; AA contrast; consistent rhythm; built section by section with a checkpoint after each; padding bound to tokens on Penpot ≥ 2.17 (or an explicit `padding-mirrors-token` exception).
