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
    "must_create": ["..."],        // for generators (artifacts that must exist afterwards)
    "must_do": ["..."],            // procedural contract (checkpoints honored, one step per call, approvals awaited)
    "must_not": ["..."]            // guardrails
  },
  "pass_criteria": "human-readable pass bar"
}
```

All four `expected` arrays are optional; use only the ones that fit the target. `must_create`
asserts on the resulting canvas/library state; `must_do` asserts on the *process* (visible in the
transcript), which is how checkpoint/approval behavior gets tested.

## How to run
These are **agent-driven** evals — the judge is an MCP-connected agent plus the skills' own
`validate*.js` scripts, not a deterministic unit test. Two ways to run one:

**Semi-automatic (preferred):** `node scripts/dev/run-eval.mjs evals/golden/<id>.eval.json`
composes the fixture-setup + run + self-assert prompt and executes it through headless Claude Code
(`claude -p`) against your live MCP session (keep the Penpot plugin window open; use a scratch
file). The JSON verdict lands in `evals/results/<id>.json`. Add `--print` to get the prompt for
manual pasting into any other MCP-connected agent.

**Manual:**
1. Connect the Penpot MCP (`docs/setup-*`).
2. Open the fixture (a starting file/brief) — see `fixtures/README.md`.
3. Run the named skill/workflow with the fixture as input.
4. Inspect the result with `execute_code` reads (`shapeStructure`, `tokenOverview`) and `export_shape`.
5. Check each `must_detect` / `must_create` / `must_do` holds and each `must_not` is absent. Record pass/fail.

Treat a PASS as strong signal, not proof — spot-check FAILs by hand before blaming the skill.

## Suite
| Eval | Target | Checks |
|------|--------|--------|
| `foundations-basic` | penpot-foundations | creates primitive+semantic sets; spacing on grid; no orphans |
| `component-button-variants` | penpot-component-factory | full state matrix; tokenized; Property=Value naming |
| `brief-to-dashboard` | workflow brief-to-screen | on-system screen; AA pass; sectioned, not one-shot |
| `a11y-contrast` | penpot-audit-accessibility | detects sub-4.5:1 text; doesn't auto-fix |
| `token-governance` | penpot-audit-tokens | detects hardcoded + off-grid; only exact swaps auto |
| `figma-migration-smoke` | penpot-migrate | builds IR before write; tokens+components migrated; honest gaps |
