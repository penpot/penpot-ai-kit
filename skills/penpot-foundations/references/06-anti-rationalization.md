# 06 — Anti-rationalization (governance)

These are the excuses a model reaches for to skip token rigor. Each must HALT the flow.

| Excuse | Why it's wrong | Countermeasure (halt) |
|--------|----------------|------------------------|
| "I'll hardcode the hex and tokenize later." | Hardcoded values break theming; "later" never happens. | Bind to a semantic token now, or propose one for review. |
| "I'll bind the shape to a primitive directly." | Primitives don't switch per theme. | Bind to a semantic token that references the primitive. |
| "18px is close enough to the grid." | Off-grid spacing erodes rhythm and fails governance. | Snap to nearest 4px token; document exceptions only with approval. |
| "I'll pre-create lots of tokens to be safe." | Orphan tokens are debt. | Create only what's needed; propose extras at a checkpoint. |
| "I'll skip validation to finish faster." | Unresolved refs/off-grid values ship silently. | Run `validateTokens.js`; acceptance criteria are gates, not follow-ups. |
| "I'm fairly sure `addTheme` takes these args." | Catalog/theme API is the most drift-prone. | Verify with `penpot_api_info` before relying on it. |
