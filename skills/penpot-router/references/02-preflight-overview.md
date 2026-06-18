# 02 — Preflight & Overview (router Phase 0)

> Loaded during **Phase 0 (Discovery)** of `penpot-router`. Phase 0 is **read-only**. Its job is to
> (a) guarantee the MCP's own guidance is loaded and (b) sense the current state of the file so the
> routing decision in Phase 1 is grounded in reality — not the user's words alone. The router never
> mutates here, so there is nothing to validate with `export_shape`.

## Step 1 — Always call `high_level_overview` first
Per `AGENTS.md` §2 and `shared/penpot-mcp-tool-reference.md`, `high_level_overview` (no arguments)
must be called once per session before any other Penpot action. It returns the MCP's own usage
guidance plus a Plugin API overview.

- If you cannot confirm it ran in this session, **call it now**.
- Record `storage.router.overviewCalled = true` so a resumed session can tell.
- No routing decision is *executed* in a session where the overview was skipped (Critical Rule 1).

## Step 2 — Sense file + selection state (one read-only `execute_code` call)
This single read tells you the page layout, what's selected, and where work would land. Paste into one
`execute_code` call:

```js
// READ-ONLY. Verify any unfamiliar helper with penpot_api_info before relying on it,
// e.g. penpot_api_info("PenpotUtils", "shapeStructure").
return {
  pages: penpotUtils.getPages().map(p => p.name),
  currentPage: penpot.currentPage && penpot.currentPage.name,
  selectionCount: penpot.selection.length,
  selection: penpot.selection.map(s => ({ id: s.id, name: s.name, type: s.type })),
  // depth 1 keeps the return small; the router only needs the top-level shape of the page
  topLevel: penpotUtils.shapeStructure(penpot.currentPage.root, 1)
};
```

What to read from the result:
- **`selectionCount` / `selection`** — a non-empty selection usually means the user wants to act *on
  those shapes* (rename them, componentize them, audit them). Route accordingly.
- **`topLevel`** — is the page empty (bias toward foundations/bootstrap) or full of boards (bias toward
  build/audit/review)? Are layer names auto-generated (`Rectangle 12`, `Board`) → naming is a likely
  intent or prerequisite?
- **`pages`** — multiple pages named like screens implies an existing product; a lone default page
  implies a fresh start.

## Step 3 — Sense token / design-system state (one read-only call)
Whether a design system already exists is the single biggest tie-breaker (see `01-intent-taxonomy.md`):

```js
// READ-ONLY. tokenOverview returns the active token sets/themes and counts.
const ov = penpotUtils.tokenOverview();
return {
  hasTokens: !!(ov && ov.totalTokens),
  overview: ov   // sets, themes, counts — enough to know if a system exists
};
```

Decision impact:
- **`hasTokens === false`** → "set up our design system" / "build a screen" should bias toward
  `penpot-foundations` or the `design-system-bootstrap` workflow first — you cannot bind shapes to
  tokens that do not exist.
- **`hasTokens === true`** → build/audit/review skills are viable directly; "set up tokens" likely
  means *extend* an existing set, not bootstrap.

## Step 4 — Record the breadcrumb (optional, still effectively read-only intent)
So a resumed session can see how the route was reached, drop a tiny breadcrumb. This is metadata, not a
canvas change. Verify the signature first.

```js
// Verify: penpot_api_info("PenpotFile", "setSharedPluginData")
penpot.currentFile.setSharedPluginData(
  "penpot-ai",
  "router.lastRoute",
  JSON.stringify({ at: new Date().toISOString(), chosenTarget: "REPLACE-ME" })
);
return { recorded: true };
```

(If the host client is sandboxed or the call is unavailable, skip it — correctness must not depend on
the breadcrumb; `storage.router` is enough for the session.)

## Output discipline
- Keep every return small and structured (names, counts, ids). These are read back by the agent.
- Do **not** `console.log` a value you also `return`.
- One logical read per `execute_code` call — Steps 2, 3, and 4 are separate calls.

## Exit criterion for Phase 0
You can now answer three questions, which Phase 1 needs to classify intent:
1. Does a token/design system already exist? (`hasTokens`)
2. Is the user pointing at specific shapes? (`selection`)
3. Is the file empty, fresh, or a mature product? (`pages` + `topLevel`)

Proceed to Phase 1 (intent classification, `01-intent-taxonomy.md`). No user checkpoint is required to
leave Phase 0 — it changed nothing.
