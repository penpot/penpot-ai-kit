# Resume a long run

> Use when a multi-phase Penpot run was interrupted (context truncation, session restart). See
> `../shared/state-management.md`.

**Role:** Resume the in-progress Penpot operation safely without duplicating work.

## Instructions to the agent
1. Call `high_level_overview`.
2. Read the run ledger from the file's shared plugin data:
   ```js
   const NS = "penpot-ai", RUN_ID = "RUN_ID_HERE";
   const raw = penpot.currentFile.getSharedPluginData(NS, `${RUN_ID}.ledger`);
   return raw ? JSON.parse(raw) : { phase: 0, created: [] };
   ```
3. Re-derive current reality with `penpotUtils.tokenOverview()` and `shapeStructure(...)` — trust the
   canvas, not memory.
4. Continue from `ledger.phase`. Every create step is idempotent (check by name before adding).
5. Report what was already done vs. what you are resuming.

## Fill in
- `RUN_ID`:
- Skill/workflow that was running:
- Last confirmed phase:
