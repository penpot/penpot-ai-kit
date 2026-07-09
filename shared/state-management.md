# State Management & Resumability

> How a skill keeps state across many `execute_code` calls and survives context truncation. Every long-running skill links here.

A non-trivial design operation is dozens of `execute_code` calls. Two things will break a naive
agent: (1) losing track of ids it created, and (2) the conversation getting summarized/truncated
mid-run. This protocol fixes both.

## Primary ledger: `storage` + `setSharedPluginData`

There are two persistence surfaces. **Prefer these — they always work, including on remote/SaaS and
sandboxed clients.**

1. **`storage`** (in-memory across `execute_code` calls in the same session). Cache discovery
   results, created ids, and reusable helper functions here.
   ```js
   storage.run = storage.run || {};
   storage.run.tokensSetId = set.id;          // remember what you made
   storage.run.created = storage.run.created || [];
   storage.run.created.push({ kind: "component", name: "Button", id: comp.id });
   ```

2. **`setSharedPluginData` / `getSharedPluginData`** (persisted INTO the Penpot file itself, so it
   survives even a brand-new session). Write a small ledger keyed by `RUN_ID`.
   ```js
   const NS = "penpot-ai";                      // plugin-data namespace
   penpot.currentFile.setSharedPluginData(NS, `${RUN_ID}.phase`, "2");
   penpot.currentFile.setSharedPluginData(NS, `${RUN_ID}.ledger`, JSON.stringify(ledger));
   // resume:
   const raw = penpot.currentFile.getSharedPluginData(NS, `${RUN_ID}.ledger`);
   const ledger = raw ? JSON.parse(raw) : { phase: 0, created: [] };
   ```
   Verify the exact `setSharedPluginData` signature with `penpot_api_info` on the relevant type
   before relying on it.

## Secondary (optional optimization): a disk state file
A `/tmp/penpot-ai-state-{RUN_ID}.json` mirror can be handy when the agent host has a writable
filesystem. **Treat it as optional** — never make correctness depend on it, because remote/SaaS
clients may not have a persistent or writable `/tmp`. The in-file ledger above is authoritative.

## Resume protocol (after truncation)
1. Read the in-file ledger for the active `RUN_ID`.
2. Re-derive "what exists" with `penpotUtils.shapeStructure` / `tokenOverview` rather than trusting
   memory alone.
3. Continue from `ledger.phase`. Re-running an idempotent step (see below) must be safe.

## Idempotency
Every create step checks for existence first, by name, so re-running never duplicates:
```js
let set = penpot.library.local.tokens.sets.find(s => s.name === "semantic");
if (!set) set = penpot.library.local.tokens.addSet({ name: "semantic" });
```

## What goes in the ledger
`{ runId, phase, created: [{kind, name, id}], decisions: [...], assumptions: [...], pendingReview: [...], selfReview: [...] }`
— enough to reconstruct progress and to produce the final structured report (`selfReview` records
visual self-correction iterations per `shared/visual-self-review.md`).

## The file profile — don't re-discover the design system every session

Phase 0 discovery (token overview + component inventory) is expensive to repeat in every
conversation. On first contact with a file, build a compact **file profile** and persist it
(same namespace, fixed key — not per-RUN_ID):

```js
const NS = "penpot-ai";
const profile = {
  builtAt: new Date().toISOString(),
  penpotVersion: penpot.version || null,
  pages: penpotUtils.getPages().map(p => ({ id: p.id, name: p.name })),
  tokenSets: /* per set: name, active, count, tier guess */ [],
  tokens: /* name, type, resolvedValue — the value→token reverse index source */ [],
  components: /* name, id, variant axes */ [],
  themes: [], namingStyle: "semantic-kebab | auto-generated | mixed",
};
penpot.currentFile.setSharedPluginData(NS, "file-profile", JSON.stringify(profile));
```

**Read protocol (every later session):** read `file-profile` first. If present, verify cheaply
(token set count + component count + page count match a quick live read) and only re-derive the
parts that changed; rebuild the whole profile only when the checks disagree or the user says the
file changed a lot. If the client has its own persistent memory (e.g. Claude Code auto-memory),
mirror a one-line pointer there ("file X has a kit profile in pluginData") — never the profile
itself (the file is the source of truth; local memory goes stale).

The capability probe (`shared/scripts/capability-probe.js`) persists its verdicts the same way
under the `capabilities` key — read it before assuming a version-pinned gotcha applies.
