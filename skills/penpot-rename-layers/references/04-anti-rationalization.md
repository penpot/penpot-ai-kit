# 04 — Anti-rationalization (layer renaming)

> When you catch yourself reaching for one of these, stop and do the countermeasure instead.

| Excuse the LLM makes | Why it's wrong | Deterministic countermeasure |
|----------------------|----------------|------------------------------|
| "This layer already has a name, I'll just improve it while I'm here." | A human's deliberate name is not in the safe-set; silently overwriting it loses intent and is irreversible without the ledger. | Bucket it as **review**. Do not auto-apply. Show old→new at the Phase 1 checkpoint and wait for approval. |
| "It's clearly a button — I'll also tighten its padding/size." | This skill writes `shape.name` only. Geometry changes are never auto-fix and belong to another skill. | Halt. Rename only. Record the geometry observation as a note for review; do not call `resize()`/`setParentXY`. |
| "Renaming the component's main shape is the same as renaming an instance." | Renaming the main shape renames the component for **every** instance across the file — a shared-asset edit, never auto-fix. | Branch on `isComponentMainInstance()`. Skip the main instance and everything inside it; report as `skipped: main component`. |
| "I'll label every big text `h1` by font size alone." | Multiple `h1`s break heading hierarchy and fail the a11y precondition this skill exists to satisfy. | Order headings by visual prominence: one `h1` per region, descending `h2`/`h3`. Use the level rules in `references/02-semantic-inference.md`. |
| "These three repeated cards are each a `section`." | Repeated siblings in a list are `li` inside a `ul`, not standalone `section`s; mis-labeling corrupts the code-review mapping. | Detect repetition by sibling count + matching structure; name the container `ul` and children `li` (with descriptors). |
| "I'll rename the whole tree in one execute_code call to be fast." | One-shotting defeats checkpoints and makes a bad inference unrecoverable mid-run. | Batch ≤100 per call, top-down, write the ledger between batches. |
