# Architecture

This kit is a **layered system**, not a pile of prompts. Each layer solves a distinct problem.

```
Instructions   AGENTS.md ............... how every Penpot agent must behave
      ▼
Skills         skills/*/SKILL.md ....... reusable capabilities ("how we do task X")
      ▼
Workflows      workflows/* ............. end-to-end orchestration ("when/with-what/what-next/approve")
      ▼
MCP            the Penpot MCP tools .... real read/write access to the file (shared/penpot-mcp-tool-reference.md)
      ▼
Policies       policies/* .............. modes (suggest/review/autofix), approvals, safe set
      ▼
Evals          evals/* ................. golden tests that prove the workflows work
```
…with `shared/` as the single source of truth (tool reference, API gotchas, token schema, naming,
state, modes, visual self-review, report schemas, pipeline schema, capability probe) transcluded everywhere, and `prompts/` + `templates/` as the human/onboarding surface.

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
Twelve skills (eleven canonical + the router utility) cover the four audiences (DS teams, product designers,
design engineers, migrating teams): `penpot-router`, `penpot-foundations`, `penpot-component-factory`,
`penpot-build-screen`, `penpot-build-from-code`, `penpot-document-handoff`, `penpot-design-md`,
`penpot-audit-accessibility`, `penpot-audit-tokens`, `penpot-design-to-code-review`, `penpot-migrate`,
+ `penpot-rename-layers`.

## Roadmap — deferred capabilities (priority order, follow `shared/SKILL-template.md`)

1. **Icon pipeline** (cheapest win): SVG → `penpot.createShapeFromSvg` / `createShapeFromSvgWithImages`
   → tokenized, named icon components; `import_image` covers raster assets in local mode.
2. **Deeper design↔code**: make `generateMarkup`/`generateStyle` the canonical extraction in
   `penpot-design-to-code-review` beyond plain components (they are only verified there today), and
   feed Code Connect-style mappings from real repos.
3. **Connected libraries**: everything currently assumes `penpot.library.local`; real teams consume
   shared libraries via `penpot.library.connected` — discovery, instancing, and governance across
   library boundaries.
4. **Prototyping/interactions**: flows and interactions exist in the Plugin API; a skill (or a
   `penpot-build-screen` extension) could wire navigation between the screens the kit builds.
5. **Parallel audit orchestration (Claude Code)**: `accessibility-gate`'s two suggest-mode audits are
   the one safely parallelizable pair — run them as two read-only subagents and merge, halving the
   gate's wall-clock. Never parallelize mutating skills on one file.
6. Localization/RTL and data-viz remain deferred (niche/specialized).
