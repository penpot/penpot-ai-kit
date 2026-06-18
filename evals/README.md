# Evals

Golden tests that prove the skills/workflows actually do what they claim. Without evals, agentic
workflows are theater — they look productive but you can't tell if they help.

## Format
Each `golden/*.eval.json` is:
```json
{
  "id": "unique-id",
  "skill": "penpot-...",          // or "workflow": "..."
  "fixture": "fixtures/<file>.md | inline brief",
  "expected": {
    "must_detect": ["..."],        // for audits/reviews
    "must_create": ["..."],        // for generators
    "must_not": ["..."]            // guardrails
  },
  "pass_criteria": "human-readable pass bar"
}
```

## How to run
These are **agent-driven** evals (no test runner ships with the kit):
1. Connect the Penpot MCP (`docs/setup-*`).
2. Open the fixture (a starting file/brief) — see `fixtures/README.md`.
3. Run the named skill/workflow with the fixture as input.
4. Inspect the result with `execute_code` reads (`shapeStructure`, `tokenOverview`) and `export_shape`.
5. Check each `must_detect` / `must_create` is present and each `must_not` is absent. Record pass/fail.

A later tooling pass can automate step 4–5 by scripting the assertions over `execute_code` output.

## Suite
| Eval | Target | Checks |
|------|--------|--------|
| `foundations-basic` | penpot-foundations | creates primitive+semantic sets; spacing on grid; no orphans |
| `component-button-variants` | penpot-component-factory | full state matrix; tokenized; Property=Value naming |
| `brief-to-dashboard` | workflow brief-to-screen | on-system screen; AA pass; sectioned, not one-shot |
| `a11y-contrast` | penpot-audit-accessibility | detects sub-4.5:1 text; doesn't auto-fix |
| `token-governance` | penpot-audit-tokens | detects hardcoded + off-grid; only exact swaps auto |
| `figma-migration-smoke` | penpot-migrate | builds IR before write; tokens+components migrated; honest gaps |
