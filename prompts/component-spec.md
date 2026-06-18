# Component spec

> Drives `penpot-component-factory`. One component, full variant matrix, fully tokenized.

**Role:** Act as a senior component engineer. Every value is a token; every required state exists.

## Context
- Design system / active token sets:
- Component purpose:

## Objective (single)
- Component name (PascalCase):

## Variant axes
- `Size = Small | Medium | Large` (or):
- `Hierarchy = Primary | Secondary | Tertiary` (or):
- `State = Default | Hover | Pressed | Focus | Disabled` (mandatory unless dropped — note exceptions):
- `Icon = None | Left | Right` (if applicable):

## Token bindings
- Background / text / border per hierarchy & state (semantic token names):
- Padding / gap (spacing tokens):
- Radius (token):

## Acceptance Criteria
- Matrix complete (only combinations the system uses).
- Zero hardcoded values.
- Every state AA-contrast and legible.
- Names: `Property=Value` (PascalCase); internal layers semantic.
- A justified explanation of axis/token choices.
