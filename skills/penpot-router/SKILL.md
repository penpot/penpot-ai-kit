---
name: penpot-router
description: "Thin dispatcher / entry point for any Penpot request. Use FIRST on any Penpot task to ensure high_level_overview ran, read the user's intent, and route to exactly one target skill or workflow (build a screen, build a design system, audit accessibility, audit tokens, migrate from Figma, rename layers, code review, etc.). Never mutates the canvas. Triggers: 'work on this Penpot file', 'help me with Penpot', 'I want to design/build/audit/migrate in Penpot', 'where do I start', 'which skill should I use', 'route this request', ambiguous Penpot asks."
disable-model-invocation: false
version: 0.2.0
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

## 1. Title + How it works
`penpot-router` is a **thin entry point**. It does not draw, tokenize, or restructure anything — it
reads the user's intent and hands off to exactly one downstream skill or workflow. Every mutation goes
through `execute_code`; validate visually with `export_shape`; read structure with
`penpotUtils.shapeStructure` (full tool surface: `shared/penpot-mcp-tool-reference.md`). This skill only
ever uses `high_level_overview` plus **read-only** `execute_code` discovery calls (`penpotUtils.shapeStructure`,
`penpotUtils.tokenOverview()`). Every mutation belongs to the skill it routes to; this router
validates nothing visually because it changes nothing. If the host client already auto-selects skills
by their `description`, this router **degrades gracefully to documentation** — the intent taxonomy in
`references/01-intent-taxonomy.md` becomes a reference map rather than an active dispatcher.

## 2. The One Rule That Matters Most
**Route to exactly one target, and run preflight before doing so.** Never start mutating from inside
the router, and never fan a single request out to multiple mutating skills in parallel. One request →
one preflight (overview + a quick structure/token read) → one target skill or workflow → handoff.
If intent is ambiguous between two targets, ask one disambiguating question; do not guess and act.

## 3. Penpot MCP Tool Reference
Full surface: `shared/penpot-mcp-tool-reference.md`. The router leans on only two calls:

| Call | Why the router uses it |
|------|------------------------|
| `high_level_overview` | Mandatory session preamble. Must have been called before any routing decision is acted on. |
| `execute_code` (read-only) | `penpotUtils.shapeStructure(penpot.currentPage.root, 2)` and `penpotUtils.tokenOverview()` to sense the current state of the file so routing is grounded in reality, not assumptions. |

The router never calls `execute_code` to create/modify/delete, and never calls `export_shape`
(nothing to validate). Downstream skills own all mutation and validation.

## 4. Plugin API Essentials
The router touches only read paths: `penpot.currentPage`, `penpot.selection`,
`penpot.library.local.tokens`, `penpotUtils.shapeStructure`, `penpotUtils.tokenOverview`,
`penpotUtils.getPages`. Gotchas (`shared/plugin-api-gotchas.md`):
- **#2 token application is async (~100 ms)** — never read back a resolved value as authoritative; the
  router applies no tokens at all, so its only real trap is **doing too much**.
If you are unsure whether a discovery helper exists with a given signature, verify with
`penpot_api_info` (e.g. `penpot_api_info("PenpotUtils", "shapeStructure")`) rather than guessing.

## 5. Token-Aware Brief Contract
Before routing, restate the request as a compact contract so the chosen skill inherits a clean brief.
Assign the role: **"act as a senior design-systems triage lead who never starts work in the wrong
flow."** Capture:

- **Context** — product, audience, and whether a design system already exists in this file (derived
  from `tokenOverview()` + `shapeStructure`).
- **Objective** — a *single* verb-led intent ("build a settings screen", "audit contrast", "migrate
  the Figma button library"). If the user states two, split and route the primary; queue the rest.
- **Inputs** — selected shapes/boards, target page, referenced tokens/components, external refs (code
  paths, Figma URLs).
- **Constraints** — forbidden components, inviolable rules, mode (suggest/review/autofix), scope caps.
- **Acceptance Criteria** — what "done" means for the downstream skill (e.g. "WCAG AA contrast ≥ 4.5:1
  on body text", "all spacing on the 4px grid", "variant matrix complete for State axis"). The router
  does not verify these; it forwards them so the target skill can.

The router emits this contract as the handoff payload. It does not invent token values or names — if
the request implies new tokens, that is the downstream skill's job (and a human approval gate).

## 6. Mandatory Workflow

### Phase 0 — Discovery (read-only)
**Goal:** ensure the session is initialized and the file's state is known.
1. Confirm `high_level_overview` has been called this session; if not, call it now.
2. One read-only `execute_code` call for a shallow state sense:
   ```js
   return {
     pages: penpotUtils.getPages().map(p => p.name),
     currentPage: penpot.currentPage && penpot.currentPage.name,
     selectionCount: penpot.selection.length,
     selection: penpot.selection.map(s => ({ id: s.id, name: s.name, type: s.type })),
     topLevel: penpotUtils.shapeStructure(penpot.currentPage.root, 1)
   };
   ```
3. One read-only call for token state:
   ```js
   return penpotUtils.tokenOverview();
   ```
**Exit criterion:** you know (a) whether tokens/sets exist, (b) what is selected, (c) the page layout
at depth 1. **✋ Checkpoint:** none needed — read-only — proceed straight to Phase 1.

### Phase 1 — Intent classification
**Goal:** map the user's words to one row of the routing table (§8 / `references/01-intent-taxonomy.md`).
Read the literal request, combine it with the Phase 0 state (e.g. "no tokens exist yet" biases a vague
"set up my design system" toward `penpot-foundations` / the `design-system-bootstrap` workflow). If the
request maps cleanly to one target, continue. If it maps to two or more with comparable confidence,
**✋ Checkpoint:** ask one disambiguating question (offer the two candidate targets in plain language).

### Phase 2 — Handoff
**Goal:** transfer control with a clean brief.
1. State the chosen target explicitly ("Routing to **penpot-build-screen** because…").
2. Emit the §5 Token-Aware Brief Contract as the payload.
3. Note any secondary intents queued for later.
4. Invoke / instruct the target skill. The router's job ends here; it performs no mutations.
**Exit criterion:** exactly one target named, contract emitted, secondary intents queued.
**✋ Checkpoint (conditional):** ask "Routing to X — confirm or redirect?" **only** when (a) Phase 1
was ambiguous (two candidates with comparable confidence), or (b) the target is an expensive mutating
flow on a file with existing content (a migration, a bootstrap over a mature system, anything that
will restructure components). For a clean, unambiguous match, **state the route and proceed** — the
target skill's own Phase-0 checkpoint is the user's natural review point; a second confirmation here
is friction, not safety.

## 7. Critical Rules
1. **Always confirm `high_level_overview` ran before acting on a route.** No routing decision is
   executed in a session where the overview was skipped.
2. **One target per request.** Split multi-intent requests; route the primary, queue the rest.
3. **Read-only only.** The router never calls a mutating `execute_code` and never calls `export_shape`.
4. **No guessing on ambiguity.** Two plausible targets → one question, not a coin flip.
5. **Ground the route in file state.** Use Phase 0 reads to break ties (empty file vs. mature system).
6. **Forward the brief verbatim.** Do not silently drop constraints or acceptance criteria.
7. **Degrade to documentation.** If the host already routes by description, do not duplicate-dispatch;
   serve the taxonomy as a map and step aside.
8. **Default mode = suggest.** The router proposes a route; it owns no canvas changes.

## 8. Domain Architecture — the routing table
The router's product is a **decision**, not a canvas artifact. The decision space is the table below.
Full phrasing map and fallbacks: `references/01-intent-taxonomy.md`.

### Skills

| Intent | Target skill | Example user phrasings |
|--------|--------------|------------------------|
| Establish tokens / foundations (color, spacing, type, radius scales; themes) | `penpot-foundations` | "set up our design tokens", "create a color + spacing scale", "add a dark theme", "bootstrap foundations" |
| Build / extend reusable components & variants | `penpot-component-factory` | "make a Button component with variants", "build an Input with states", "turn this into a component", "add a Size axis" |
| Assemble a screen/view from brief + existing system | `penpot-build-screen` | "design a settings screen", "lay out a dashboard", "build the pricing page from this brief" |
| Build a screen/view from code/markup | `penpot-build-from-code` | "create this React page in Penpot", "push this component's JSX to a board", "build the screen to match this code" |
| Document/annotate a design for handoff | `penpot-document-handoff` | "document this design", "annotate this screen", "prepare this for handoff", "add observation notes", "create a critique card", "explain this flow for devs" |
| Accessibility audit (WCAG) | `penpot-audit-accessibility` | "check accessibility", "WCAG AA audit", "contrast check", "are touch targets big enough", "a11y review" |
| Token governance audit | `penpot-audit-tokens` | "find hardcoded colors", "audit token usage", "what's off the 4px grid", "find orphan/unused tokens" |
| Compare design vs. code (drift) | `penpot-design-to-code-review` | "does this design match the code", "design-to-code review", "find drift between Penpot and the component" |
| Import / migrate from Figma | `penpot-migrate` | "migrate this Figma file", "import from Figma", "bring our Figma library into Penpot" |
| Rename layers semantically | `penpot-rename-layers` | "rename these layers", "clean up layer names", "semantic HTML layer names", "fix Rectangle 12 names" |

### Workflows (multi-skill orchestrations)

| Intent | Target workflow | Example user phrasings |
|--------|-----------------|------------------------|
| Decide where to start (meta) | `routing` | "I don't know which tool I need", "where do I begin", "help me with this Penpot file" |
| End-to-end design system from scratch/code | `design-system-bootstrap` | "set up a full design system", "tokens + components + docs from our codebase", "bootstrap the whole library" |
| Brief → finished screen (foundations check → build → a11y) | `brief-to-screen` | "take this brief and ship a screen", "design and validate this page end to end" |
| Keep Penpot in sync with code | `code-to-penpot-sync` | "sync our components to code", "reconcile Penpot with the repo", "keep design and code aligned" |
| Full Figma → Penpot migration program | `figma-migration` | "migrate our entire Figma project", "full Figma import with tokens, components, screens" |
| Gate a design on accessibility before handoff | `accessibility-gate` | "block handoff until a11y passes", "run the accessibility gate", "validate before we ship" |

## 9. Modes & Policies
Mode-default: **suggest** (see `shared/modes-and-policies.md`). The router is read-only by nature, so
it has **no safe-set auto-fix items** — it never mutates the canvas under any mode. What it *may* do
without asking: call `high_level_overview`, run read-only `shapeStructure`/`tokenOverview` discovery,
and propose a route. What always requires the user (or the downstream skill's own gate): executing the
route when intent is ambiguous, and anything the target skill does (those inherit that skill's mode).

## 10. State Management
The router writes minimal state (`shared/state-management.md`). It does not own a `RUN_ID` workflow —
that belongs to the skill it routes to — but it records its decision so a resumed session can see how
it got there:
- `storage.router = { lastIntent, chosenTarget, queuedIntents, overviewCalled: true }` (session cache).
- Optional in-file breadcrumb under namespace `penpot-ai`, key `router.lastRoute`, via
  `setSharedPluginData` (verify signature with `penpot_api_info` before relying on it).

On resume: re-read `storage.router` and the breadcrumb, re-run Phase 0 discovery (file state may have
changed), and reclassify rather than blindly continuing — routing must reflect current reality.

## 11. User Checkpoints

| After phase | Artifacts shown | What we ask |
|-------------|-----------------|-------------|
| Phase 0 (discovery) | Page list, selection summary, token-set presence | (Informational — no approval; proceed.) |
| Phase 1 (classification) — only if ambiguous | Two candidate targets in plain language | "Which best matches what you want — A or B?" |
| Phase 2 (handoff) — only if ambiguous or the target is an expensive mutating flow on existing content | Chosen target + the Token-Aware Brief Contract + queued intents | "Routing to **X** — confirm or redirect?" (clean matches: state the route and proceed) |

## 12. Naming Conventions
The router enforces no names itself, but it must **speak the kit's vocabulary** when restating the
brief so the downstream skill inherits correct expectations (`shared/naming-conventions.md`): tokens in
dot-notation (`color.action.primary.bg`), components in PascalCase (`Button`), variants as
`Property=Value` pairs (`State=Hover`), layers as semantic kebab-case HTML names (`nav`, `card-container`).
If a request implies a `RUN_ID` (any multi-step workflow), use the convention slug, e.g.
`dsb-2026-06-05-a`, and let the target skill own it.

## 13. Anti-Rationalization Table

| Excuse the LLM makes | Why it's wrong | Deterministic countermeasure that halts the flow |
|----------------------|----------------|--------------------------------------------------|
| "This is obviously a build request — I'll just start creating boards now." | The router is read-only; starting mutation here bypasses the target skill's discovery, brief contract, and checkpoints. | Stop. Route to `penpot-build-screen`/`penpot-build-from-code`, emit the §5 brief, and let that skill own Phase 0 and all mutation. |
| "The request mentions both tokens and a screen — I'll route to both at once." | Fanning out to two mutating skills in parallel produces conflicting edits and an unauditable run. | Split intents. Route the *primary* objective; queue the rest in `storage.router.queuedIntents`. One target per request. |
| "Intent is a bit ambiguous, but I'll pick the more likely skill and proceed." | A wrong-flow start is expensive to undo (geometry/variant changes are not safe-set). | Halt at the Phase 1 checkpoint; ask one disambiguating question offering the two candidate targets. |
| "`high_level_overview` was probably called earlier; I'll skip it." | Acting without the MCP's own guidance loaded is the #1 cause of API misuse downstream. | Confirm it ran this session; if uncertain, call it. No route is executed otherwise. |
| "The host client auto-selected a skill, but I'll re-dispatch to be safe." | Double-dispatch causes the same work to run twice or two skills to fight. | Detect host auto-selection; degrade to documentation (serve the taxonomy as a map) and step aside. |
| "I'll route based on the user's words alone — no need to read the file." | Identical phrasing routes differently in an empty file vs. a mature system ("set up my design system" → bootstrap vs. extend). | Run Phase 0 reads (`tokenOverview`, `shapeStructure`) and use file state to break ties before classifying. |

## 14. Helper Code Snippets
Read-only discovery only — the router never mutates.

```js
// Phase 0a — state sense (paste into one execute_code call)
return {
  pages: penpotUtils.getPages().map(p => p.name),
  currentPage: penpot.currentPage && penpot.currentPage.name,
  selectionCount: penpot.selection.length,
  selection: penpot.selection.map(s => ({ id: s.id, name: s.name, type: s.type })),
  topLevel: penpotUtils.shapeStructure(penpot.currentPage.root, 1)
};
```

```js
// Phase 0b — token state (does a design system already exist?)
const ov = penpotUtils.tokenOverview();
return {
  hasTokens: !!(ov && ov.totalTokens),
  overview: ov
};
```

```js
// Optional — drop a routing breadcrumb into the file (verify signature first via
// penpot_api_info("PenpotFile", "setSharedPluginData"))
penpot.currentFile.setSharedPluginData(
  "penpot-ai",
  "router.lastRoute",
  JSON.stringify({ chosenTarget: "REPLACE-ME", at: "RUN_ID_HERE" })
);
return { recorded: true };
```

## 15. Reference Resources
- `penpot_api_info("PenpotUtils", "shapeStructure")`, `penpot_api_info("PenpotUtils", "tokenOverview")`
  — confirm discovery helper signatures.
- `penpot_api_info("PenpotFile", "setSharedPluginData")` — confirm the breadcrumb signature.
- `shared/penpot-mcp-tool-reference.md` — the tool surface.
- `shared/modes-and-policies.md` — why the router is suggest-only.
- Sibling skills' own `SKILL.md` descriptions — the authoritative trigger lists the router maps onto.

## 16. Supporting Files

### references/ (progressive-disclosure deep dives)

| File | Loaded when | Contents |
|------|-------------|----------|
| `references/01-intent-taxonomy.md` | Phase 1 (classification) | Full map of user phrasings → target skill/workflow, with fallbacks, tie-breakers, and multi-intent splitting rules. |
| `references/02-preflight-overview.md` | Phase 0 (discovery) | How to call `high_level_overview` and run the quick `shapeStructure` / `tokenOverview` reads that ground a routing decision. |

### scripts/ (paste-into-`execute_code` templates)
None. The router performs no mutations and needs no reusable mutation templates — its only `execute_code`
usage is the inline read-only discovery snippets in §14.

### workflows/ (vendored in native installs)
In a native Claude Code install this skill's bundle also carries `workflows/` — the six multi-skill
pipelines (§8's workflow targets: `routing`, `design-system-bootstrap`, `brief-to-screen`,
`code-to-penpot-sync`, `figma-migration`, `accessibility-gate`), each a `README.md` (prose) +
`pipeline.json` (deterministic step list). When routing to a workflow, open its files from here; in
seed-pointer installs they live at the kit root under `workflows/`.
