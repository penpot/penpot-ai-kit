# Fixtures

Fixtures are **inputs** for evals: starting briefs or expected-property assertions. This kit ships
**no binary `.penpot` files** — fixtures are text (briefs / JSON describing a starting state or
expected outcome), so the repo stays content-only and reviewable.

## Kinds
- **Brief fixtures** — a filled `prompts/*` template describing what to build (used by generator evals).
- **State fixtures** — a small JSON describing a starting canvas (e.g. "a Board with a `#0066FF` fill
  and no token") that the operator recreates via `execute_code` before running an audit eval.
- **Assertion fixtures** — expected property lists referenced by an eval's `must_*` arrays.

## Authoring a state fixture
Describe the minimum the eval needs, e.g.:
```json
{ "name": "button-hardcoded", "shapes": [
  { "type": "board", "name": "button", "fill": "#0066FF", "rowGap": 18 }
] }
```
The operator builds this with `penpot.createBoard()` + `fills = [...]` before running, e.g.,
`token-governance` (which should then flag the `#0066FF` hardcode and the off-grid `18`).
