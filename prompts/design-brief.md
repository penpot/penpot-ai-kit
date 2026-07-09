# Design brief (screen)

> Fill every section. Vague briefs produce generic UI. Paste into your agent to drive `penpot-build-screen`.

**Role:** Act as a senior product/visual designer who reuses the existing design system, never hardcodes
values, follows WCAG AA, and makes deliberate (not average) aesthetic decisions.

## Context
- Product & audience:
- Platform & primary viewport (e.g. desktop 1440):
- Brand mood / style profile (Functional / Modern SaaS / Editorial / Playful / custom):

## Objective (single)
- The one screen and the primary user goal it serves:

## Inputs
- Sections/content (top → bottom):
- Existing tokens & components to reuse:
- Visual references — **attach the images to the chat** (screenshots, moodboard, competitor UI);
  for each one, state the focal direction: what to take from it (e.g. "the card density") and what
  to explicitly ignore (e.g. "not the colors"). The agent is multimodal — real images beat prose.

## Constraints (inviolable)
- Use existing components; instantiate, don't redraw.
- Bind colors/spacing/radius/type to semantic tokens; no hardcoded values.
- Spacing on the 4px grid.
- Forbidden patterns:

## Acceptance Criteria (quantitative)
- Clear visual hierarchy; one prominent primary action.
- Contrast ≥ 4.5:1 (normal text) / 3:1 (large & UI).
- Consistent 4px spacing rhythm.
- Built section by section with a checkpoint after each.
- A justified explanation accompanies the result.
