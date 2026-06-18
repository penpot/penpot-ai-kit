# 04 — Incremental Transformation (Phase 2 loop)

> Loaded while transforming the code. The discipline that keeps a multi-section build correct,
> resumable, and reviewable: one section per call, verify, checkpoint, ledger, repeat.

## Why incremental
A page is dozens of nodes. Building it in one `execute_code` call hides failures (a silent immutable-
array assignment, a token that didn't apply, a flex override of x/y) and produces output nobody has
reviewed section by section. The One Rule (SKILL §2): **never one-shot; one section per call.**

## The loop
For each section in the Phase 0 outline, in source order:

1. **Build** (`execute_code`, one section): run `scripts/buildSection.js`.
   - Instance components for matching roles (02-component-assembly).
   - Create bespoke containers/shapes with flex.
   - Bind every style value to a token (03-token-binding).
   - Append in DOM order; set `layoutChild` sizing.
   - Update the in-memory `ledger` (created ids, proposed tokens, exceptions).
   - `return { section, created:[...], bound:[...], proposed:[...] }`.
2. **Verify** (`execute_code`, separate call — token apply is async):
   - Read back `shapeStructure(sectionBoard)` and a sample of `shape.tokens` / `resolvedValue`.
   - Confirm bindings landed, names are semantic, components are instances.
3. **Visual** (`export_shape` of the section).
4. **Persist** the ledger to `setSharedPluginData` (phase + sections built).
5. **✋ Checkpoint** — show the section + binding summary. "Looks good" approves **only this section**.
   Name the next section explicitly, then loop.

## Ordering sections
Build top-down (header → main → … → footer) so the flex column fills in visual order and each
checkpoint shows a coherent growing screen. Within a section, append children in source order
(02-component-assembly). Don't jump ahead to a later section to "batch similar work" — that breaks the
one-section-per-call rule and the per-section approval.

## Ledger shape (this skill)
```js
const ledger = {
  runId: "RUN_ID_HERE",
  phase: 2,
  boardId: "<screen board id>",
  sectionsBuilt: ["header", "main"],                 // append as each section passes its checkpoint
  created: [{ kind:"instance", role:"button", id:"…" }, { kind:"board", role:"card-container", id:"…" }],
  proposedTokens: [{ from:"#1f2937", suggestName:"color.text.muted", suggestTier:"semantic" }],
  exceptions: [{ value:"13px", cssProp:"gap", reason:"approved off-grid label spacing", approvedBy:"user" }],
  pendingReview: []
};
penpot.currentFile.setSharedPluginData("penpot-ai", "RUN_ID_HERE.ledger", JSON.stringify(ledger));
penpot.currentFile.setSharedPluginData("penpot-ai", "RUN_ID_HERE.phase", "2");
```

## Idempotency / resume
- Each section's container is created only if `board.children` has no child with that semantic name.
- On resume after truncation: re-read the ledger, re-run `inspectDesignSystem.js` (rebuild
  `storage.run.ds`), `shapeStructure(board)` to see which sections exist, then continue from the first
  `role` in the outline not in `ledger.sectionsBuilt`.
- Re-running a completed section must be a no-op (existence checks before every create).

## Keeping it on-system as it grows
After every 2–3 sections, run a quick `validateScreen.js` pass on the partial screen so coverage
problems surface early instead of piling up to Phase 3. Cheaper to fix one section's orphan value now
than to retrofit ten.

## Common incremental mistakes
- Setting x/y on flex children (ignored) instead of ordering + gaps.
- Reading `resolvedValue` in the same call that applied the token (async — read later).
- Forgetting `appendChild` (shape exists but isn't on canvas).
- Mutating an attached instance's children (detach first, with approval).
- Skipping the checkpoint and treating one "looks good" as approval for the whole page.
