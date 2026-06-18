# Workflow: routing

**Pattern:** semantic routing. **When:** the very first step of any Penpot session — dispatch the
user's intent to exactly one skill or workflow. Mirrors `skills/penpot-router`.

## Steps
1. Ensure `high_level_overview` ran.
2. Read intent + a quick `penpotUtils.shapeStructure` / `tokenOverview()` preflight.
3. Match intent against the table in `pipeline.json` → one target.
4. If ambiguous between two targets, ask one disambiguating question; never guess and mutate.
5. Hand off; the target skill/workflow owns all mutation.

## Inputs
- The user's request (free text).

## Output
- A single chosen target + a one-line rationale. No canvas mutation.

## Failure modes
- Ambiguous intent → ask, don't guess.
- Host already auto-selects skills by description → this workflow degrades to a reference map.
