# Architecture

This kit is a **layered system**, not a pile of prompts. Each layer solves a distinct problem.

```
Instructions   AGENTS.md ............... how every Penpot agent must behave
      ▼
Skills         skills/*/SKILL.md ....... reusable capabilities ("how we do task X")
      ▼
Workflows      workflows/* ............. end-to-end orchestration ("when/with-what/what-next/approve")
      ▼
MCP            the 4 Penpot tools ...... real read/write access to the file (shared/penpot-mcp-tool-reference.md)
      ▼
Policies       policies/* .............. modes (suggest/review/autofix), approvals, safe set
      ▼
Evals          evals/* ................. golden tests that prove the workflows work
```
…with `shared/` as the single source of truth (tool reference, API gotchas, token schema, naming,
state, modes) transcluded everywhere, and `prompts/` + `templates/` as the human/onboarding surface.

## Skill vs Workflow vs Agent vs MCP
- **Skill** — a packaged, versionable capability. Answers *"how is this task done well?"*
- **Workflow** — a sequence that composes skills. Answers *"when, with what data, what next, when to approve?"*
- **Agent** — the runtime actor (Claude in Cursor/Claude Desktop/…) that plans, calls tools, keeps state.
- **MCP** — the protocol exposing Penpot's real tools/context to the agent.

A Skill is knowledge; a Workflow is behavior; MCP is access; the Agent runs it all.

## Why this kit exists
Generic "prompt → pretty UI" is commoditized and produces off-system, un-editable output. The
opportunity for Penpot is to be the place where agents operate on a **real, structured, governed**
design system. This kit supplies the missing layers — instructions, governance skills, orchestration,
policies, evals — on top of Penpot's open data + MCP.

## Mandatory skill set (and why)
Nine canonical skills + one shared utility cover the four audiences (DS teams, product designers,
design engineers, migrating teams): `penpot-router`, `penpot-foundations`, `penpot-component-factory`,
`penpot-build-screen`, `penpot-build-from-code`, `penpot-audit-accessibility`, `penpot-audit-tokens`,
`penpot-design-to-code-review`, `penpot-migrate`, + `penpot-rename-layers`.

## What was deferred (and why)
Prototyping/interactions (thin API), export/handoff redlines (better as a workflow), localization/RTL
(niche), icon pipeline (narrow), data-viz (specialized). These can be added later following
`shared/SKILL-template.md`.
