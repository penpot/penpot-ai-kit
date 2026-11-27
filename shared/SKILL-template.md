# Canonical SKILL.md Anatomy

> The contract every skill in `skills/` follows. Copy this structure. Authors: fill every section; do not reorder. Frontmatter fields are exact.

## Frontmatter (YAML)
```yaml
---
name: penpot-<kebab>                 # lowercase, dashes, <=64 chars, matches the directory name exactly
description: "<one line, <=300 chars. State WHEN and FOR WHAT, then end with explicit triggers, e.g. Triggers: 'audit tokens', 'find hardcoded colors'.>"
disable-model-invocation: false
version: 0.1.0                       # semver; feeds skills.json and skills.lock
audiences: [design-system, product-designer, design-engineer, migration]  # subset that applies
mode-default: review                 # suggest | review | autofix (see shared/modes-and-policies.md)
requires:                            # shared files this skill depends on
  - shared/penpot-mcp-tool-reference.md
  - shared/plugin-api-gotchas.md
  - shared/tokens-schema.json
---
```

The `description` is what the model uses to decide activation. Make it sharp and trigger-rich.
**Budget:** target ≤ 300 characters, hard cap 1024 (the Agent Skills spec limit); Claude Code truncates
`description` + `when_to_use` at 1536. Put *all* when-to-use information here — the body never
decides activation.

**Kit extensions vs. the open spec.** The Agent Skills spec (agentskills.io) recognises only `name`,
`description`, `license`, `compatibility`, `metadata`, `allowed-tools`. This kit's extra keys
(`version`, `audiences`, `mode-default`, `requires`, `disable-model-invocation`) are tolerated by
Claude Code, the Node installer and the plugin loader, but a strict validator (claude.ai skill
upload, `package_skill.py`) rejects unknown keys. Keep them for now — `scripts/dev/validate-kit.mjs`
and `skills.json` depend on them; if a strict target is needed, fold them under `metadata:` in one
coordinated pass (template, validator, lock, manifests).

## Slim anatomy (pilot — `penpot-router`, `penpot-build-screen`)

The 16-section anatomy below made every SKILL.md restate doctrine that already lives in `shared/`
(tool table, gotchas in full, modes, naming, a second copy of the anti-rationalization table). Two
skills now follow a slimmer shape; migrate the rest only after the pilot's evals hold:

1. **Title + role + the one rule** — a short paragraph, pointers to the tool reference and gotchas.
2. **Brief contract** — Context / Objective / Inputs / Constraints / Acceptance Criteria.
3. **Workflow** — phases with their scripts, exit criteria and ✋ checkpoints inline (no separate
   checkpoint table).
4. **Rules** — numbered; each cites a gotcha number instead of re-explaining it, except the skill's own
   critical failure mode. Each rule says why, so the model can generalise.
5. **Mode and state** — mode, ledger keys, naming, in a few lines.
6. **Supporting files** — references and scripts, then the **Doctrine paths** line (still required).

What moves out of SKILL.md: the anti-rationalization table (→ `references/NN-anti-rationalization.md`),
helper snippets that duplicate a script, and `penpot_api_info` pointer lists. Rule of thumb: a line
stays in SKILL.md only if the agent needs it on *every* run of the skill.

## Body sections (in this exact order)

1. **Title + "How it works"** — one paragraph on the domain. Do NOT re-enumerate the MCP tools
   (that's `shared/penpot-mcp-tool-reference.md`'s job); one sentence suffices: "every mutation goes
   through `execute_code`; validate visually with `export_shape`; read structure with
   `penpotUtils.shapeStructure` (full tool surface: `shared/penpot-mcp-tool-reference.md`)."
2. **The One Rule That Matters Most** — the single non-negotiable for this domain (usually: never one-shot; smallest useful unit; checkpoint between steps).
3. **Penpot MCP Tool Reference** — one pointer line to `shared/penpot-mcp-tool-reference.md`, then ONLY the domain-specific calls this skill leans on. Never restate the generic tool table.
4. **Plugin API Essentials** — the gotchas that bite here as one-liners citing their number in `shared/plugin-api-gotchas.md` (e.g. "#2 async token application"). Explain a gotcha in full ONLY if it is this skill's critical failure mode (e.g. #12 for component-factory). Tell the author to verify unfamiliar signatures with `penpot_api_info`.
5. **Token-Aware Brief Contract** — the structured brief this skill expects before mutating: **Context** (product, audience), **Objective** (single, specific), **Inputs** (frames/tokens/refs), **Constraints** (forbidden components, inviolable rules), **Acceptance Criteria** (quantitative: contrast ratios, grid, variant completeness). Assign a high-specialization role ("act as a senior design-systems engineer who never hardcodes values").
6. **Mandatory Workflow** — phases. **Phase 0 = discovery, read-only** (`high_level_overview` then `penpotUtils.shapeStructure`/`tokenOverview`). Then Phase 1..N, each with: goal, the exact `execute_code` steps, an exit criterion, and a ✋ user checkpoint.
7. **Critical Rules** — numbered, deterministic, testable.
8. **Domain Architecture** — the structure this skill produces/inspects (token tiers, variant axis matrix, IR shape, report schema).
9. **Modes & Policies** — what this skill does in suggest/review/autofix; restate the safe-set items it may auto-apply (link `shared/modes-and-policies.md`).
10. **State Management** — the `RUN_ID` ledger keys it writes; resume behavior (link `shared/state-management.md`).
11. **User Checkpoints** — a table: *After phase* | *Artifacts shown* | *What we ask*.
12. **Naming Conventions** — link `shared/naming-conventions.md` + any domain specifics.
13. **Anti-Rationalization Table** — columns: *Excuse the LLM makes* | *Why it's wrong* | *Deterministic countermeasure that halts the flow*. At least 3 rows, domain-specific (e.g. "I'll add a temp style to move fast" → "temp styles become orphans" → "Stop. Use an approved semantic token or propose one for review.").
14. **Helper Code Snippets** — short, real, `execute_code`-ready JS using the actual API.
15. **Reference Resources** — `penpot_api_info` pointers, external doc links.
16. **Supporting Files** — tables indexing `references/` (progressive-disclosure deep dives) and `scripts/` (paste-into-`execute_code` templates). End the section with the standard **Doctrine paths** line: "`shared/…` and `policies/…` resolve inside this bundle in native installs (vendored by the installer); in a Claude Code plugin install they live at the plugin root — `${CLAUDE_PLUGIN_ROOT}/shared/…`, two directories up from this file." (`validate-kit.mjs` checks it exists.)

## Scripts convention (`scripts/*.js`)
- Header comment: purpose, usage ("paste into an `execute_code` call"), inputs, output.
- `REPLACE-ME` / `RUN_ID_HERE` placeholders for caller-supplied values.
- A note to verify any unfamiliar API with `penpot_api_info`.
- End with `return { ...structured result... }`. Idempotency check before any create.
- No `console.log` of returned values.

## References convention (`references/*.md`)
- Numbered (`01-...`, `02-...`), each a focused deep dive loaded only when that phase runs
  (progressive disclosure — keeps `SKILL.md` lean and saves context).
