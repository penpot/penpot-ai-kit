---
name: penpot-router
description: "Thin dispatcher / entry point for any Penpot request. Use FIRST on any Penpot task to ensure high_level_overview ran, read the user's intent, and route to exactly one target skill or workflow (build a screen, build a slide deck, build a design system, audit accessibility, audit tokens, migrate from Figma, rename layers, code review, extract DESIGN.md, etc.). Never mutates the canvas. Triggers: 'work on this Penpot file', 'help me with Penpot', 'I want to design/build/audit/migrate in Penpot', 'where do I start', 'which skill should I use', 'route this request', ambiguous Penpot asks."
disable-model-invocation: false
version: 0.4.0
audiences: [design-system, product-designer, design-engineer, migration]
mode-default: suggest
requires:
  - shared/penpot-mcp-tool-reference.md
  - shared/plugin-api-gotchas.md
  - shared/tokens-schema.json
  - shared/naming-conventions.md
  - shared/state-management.md
  - shared/modes-and-policies.md
---

# penpot-router — the dispatcher

The router decides **which one skill or workflow** handles a Penpot request and hands it a clean
brief. It is read-only: it calls `high_level_overview` and read-only `execute_code` discovery, and
nothing else — no mutation, no `export_shape`. Everything after the handoff belongs to the target.

**The one rule: one preflight → one target → handoff.** Never start building from here, and never fan
a request out to two mutating skills. If the host client already picked a skill by its description, do
not re-dispatch: step aside and use the table below only as a map.

## Workflow

### Phase 0 — Preflight (read-only, no checkpoint)
1. Make sure `high_level_overview` ran this session; if unsure, call it. If more than one Penpot MCP
   server is connected, the target skill must confirm the instance before it mutates (AGENTS.md §2).
2. One read for file and selection state:
   ```js
   return {
     version: penpot.version,
     file: penpot.currentFile && penpot.currentFile.name,   // null on the dashboard: ask which file
     pages: penpotUtils.getPages().map(p => p.name),
     currentPage: penpot.currentPage && penpot.currentPage.name,
     selection: penpot.selection.map(s => ({ id: s.id, name: s.name, type: s.type })),
     topLevel: penpot.currentPage && penpotUtils.shapeStructure(penpot.currentPage.root, 1)
   };
   ```
3. One read for design-system state. `tokenOverview()` returns `{ [setName]: { [tokenType]: string[] } }`
   — there is no count field, so count it:
   ```js
   const ov = penpotUtils.tokenOverview() || {};
   const tokenCount = Object.values(ov).reduce(
     (n, byType) => n + Object.values(byType || {}).reduce((m, names) => m + (names ? names.length : 0), 0), 0);
   return {
     hasTokens: tokenCount > 0, tokenCount, sets: Object.keys(ov),
     components: penpot.library.local.components.length,
     connectedLibraries: penpot.library.connected.map(l => l.name)
   };
   ```
   No local tokens but a connected library → a system probably exists there; say so in the brief
   instead of routing to a bootstrap.

Details and how to read the results: `references/02-preflight-overview.md`.

### Phase 1 — Classify
Match the request against the routing table, using Phase 0 to break ties (an empty file biases "set
up my design system" toward `design-system-bootstrap`; a mature one toward extending it). Full
phrasing map, tie-breakers, multi-intent splitting and fallbacks: `references/01-intent-taxonomy.md`.
- One clear match → continue.
- Two comparable matches → ✋ ask **one** question offering the candidates in plain language.
- Several intents in one request → route the primary, queue the rest.

### Phase 2 — Hand off
State the route and why ("Routing to **penpot-build-screen** because…"), emit the brief contract
below, list queued intents, and invoke the target. For a clean match, state the route and proceed —
the target's own first checkpoint is the user's review point. ✋ Ask "confirm or redirect?" only when
Phase 1 was ambiguous or the target is an expensive mutating flow over existing content (a migration,
a bootstrap over a mature system, component restructuring).

## Routing table

| Intent | Target |
|--------|--------|
| Tokens, scales, themes, tokenize a hardcoded file | `penpot-foundations` |
| Components, variants, interactive states | `penpot-component-factory` |
| A screen/page/dashboard from a brief | `penpot-build-screen` |
| A screen from existing code or markup | `penpot-build-from-code` |
| A presentation / slide deck | `penpot-build-deck` |
| Annotate or document a design for handoff | `penpot-document-handoff` |
| Accessibility / WCAG / contrast audit | `penpot-audit-accessibility` |
| Hardcoded values, off-grid spacing, token governance | `penpot-audit-tokens` |
| Does the design match the code (drift) | `penpot-design-to-code-review` |
| A portable DESIGN.md spec file | `penpot-design-md` |
| Import or migrate from Figma | `penpot-migrate` |
| Does it look AI-generated / make it less generic | `penpot-anti-slop` |
| Rename layers semantically | `penpot-rename-layers` |

| Multi-skill intent | Target workflow |
|--------------------|-----------------|
| "Where do I start" / no clear target | `routing` |
| Full design system from scratch or from code | `design-system-bootstrap` |
| Brief → built and validated screen | `brief-to-screen` |
| Brief → built and validated, playable deck | `brief-to-deck` |
| Keep Penpot and the codebase in sync | `code-to-penpot-sync` |
| Whole Figma project migration | `figma-migration` |
| Block handoff until accessibility passes | `accessibility-gate` |

Each workflow is a `README.md` + `pipeline.json` under `workflows/` (see Supporting files).

## Token-Aware Brief Contract (the handoff payload)
Restate the request so the target inherits a usable brief, in the kit's vocabulary
(`shared/naming-conventions.md`). Forward what the user said verbatim; do not invent token names or
values — proposing tokens is the target's job, behind its approval gate.
- **Context** — product, audience, and what Phase 0 found (tokens, components, connected libraries).
- **Objective** — one verb-led intent ("build a settings screen", "audit contrast").
- **Inputs** — selection, target page, referenced tokens/components, code paths, Figma URLs.
- **Constraints** — forbidden components, mode (suggest/review/autofix), scope caps. If the user said
  whether to avoid the generic-AI look, forward `antiSlop: on|off`; never ask it here.
- **Acceptance Criteria** — what "done" means for the target (e.g. "AA contrast ≥ 4.5:1 on body
  text", "all spacing on the 4px grid"). The router forwards them; the target verifies them.

## Rules
1. No route is acted on in a session where `high_level_overview` was skipped.
2. Read-only, always: no mutating `execute_code`, no `export_shape`.
3. Exactly one target per request. Ambiguity gets one question, never a guess — a wrong-flow start is
   expensive to undo.
4. Route from file state, not from the words alone: identical phrasing means different things in an
   empty file and in a mature system.
5. Mode is **suggest** (`shared/modes-and-policies.md`): the router proposes; the target's mode governs
   everything it does afterwards.

## State
The router owns no `RUN_ID` — the target does. It keeps `storage.router = { lastIntent, chosenTarget,
queuedIntents }` and may leave a breadcrumb for a later session:
`penpot.currentFile.setSharedPluginData("penpot-ai", "router.lastRoute", JSON.stringify({ chosenTarget, at }))`
(`penpot_api_info("File", "setSharedPluginData")`). On resume, re-run Phase 0 and reclassify: the file
may have changed.

## Supporting files
- `references/01-intent-taxonomy.md` — Phase 1: phrasings → target, tie-breakers, splitting, fallbacks.
- `references/02-preflight-overview.md` — Phase 0: the reads above and how to interpret them.
- `workflows/` — vendored into this bundle in native Claude Code installs; in seed-pointer installs it
  lives at the kit root.
- No `scripts/`: the router has nothing to mutate.

**Doctrine paths.** `shared/…` and `policies/…` resolve inside this bundle in native installs (vendored by the installer); in a Claude Code plugin install they live at the plugin root — `${CLAUDE_PLUGIN_ROOT}/shared/…`, two directories up from this file.
