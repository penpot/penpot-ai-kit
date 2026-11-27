# Canonical SKILL.md Anatomy

> The contract every skill in `skills/` follows. Copy this structure. Frontmatter fields are exact.

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

## Body sections

Every SKILL.md follows this shape. A line belongs in SKILL.md only if the agent needs it on *every*
run of the skill; everything else lives in `references/` and is loaded when its phase runs.

1. **Title + role + the one rule.** What the skill does, the senior role to act as, and the single
   non-negotiable for this domain — with the reason for it. Then two pointers: the tool surface
   (`shared/penpot-mcp-tool-reference.md`) and the API traps (`shared/plugin-api-gotchas.md`). Do not
   re-enumerate the MCP tools or restate doctrine that lives in `shared/`.
2. **Brief contract.** Context / Objective (single) / Inputs / Constraints / Acceptance Criteria
   (quantitative: contrast ratios, grid, coverage, completeness).
3. **Workflow.** Phases, each with its script, its reference, and its ✋ checkpoint inline (no separate
   checkpoint table). Phase 0 is read-only discovery (`high_level_overview`, then structure / token
   reads). Skills that show visual work open the section with the visual self-review line.
4. **Rules.** Numbered and testable. Each cites a gotcha number (`#2`) instead of re-explaining it —
   except the skill's own critical failure mode, which is spelled out — and each says *why*, so the
   model can generalise to cases the rule did not list.
5. **Mode and state.** The mode and its safe set (`shared/modes-and-policies.md`), the ledger keys
   (`shared/state-management.md`), naming specifics, and report shape if the skill emits one.
6. **Supporting files.** `references/` and `scripts/`, then the standard **Doctrine paths** line:
   "`shared/…` and `policies/…` resolve inside this bundle in native installs (vendored by the
   installer); in a Claude Code plugin install they live at the plugin root —
   `${CLAUDE_PLUGIN_ROOT}/shared/…`, two directories up from this file." (`validate-kit.mjs` checks it.)

What does **not** go in SKILL.md: the anti-rationalization table (→ `references/NN-anti-rationalization.md`,
pointed to from the Rules section), helper snippets that duplicate a script, and lists of
`penpot_api_info` pointers. Target 90–160 lines.

This replaced an earlier 16-section anatomy (0.5.x) that made every SKILL.md restate shared doctrine.
All fourteen skills were migrated and each migration was checked with its golden eval.

## Scripts convention (`scripts/*.js`)
- Header comment: purpose, usage ("paste into an `execute_code` call"), inputs, output.
- `REPLACE-ME` / `RUN_ID_HERE` placeholders for caller-supplied values.
- A note to verify any unfamiliar API with `penpot_api_info`.
- **Safe to run twice.** A failed call may already have run (`plugin-api-gotchas.md` #19): find by name before creating, and guard every `applyToken` (`shape.tokens[prop] !== tok.name`) — a re-applied token loses its binding. Bind gaps and paddings in separate calls.
- **Tokens, not literals.** Spacing, color and radius are bound to tokens; a missing token falls back to a number that is reported in `exceptions`, never hidden.
- Keep data, not functions, in `storage`.
- End with `return { ...structured result... }`. Idempotency check before any create.
- No `console.log` of returned values.

## References convention (`references/*.md`)
- Numbered (`01-...`, `02-...`), each a focused deep dive loaded only when that phase runs
  (progressive disclosure — keeps `SKILL.md` lean and saves context).
