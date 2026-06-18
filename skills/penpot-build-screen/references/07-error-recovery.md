# 07 — Error recovery (screens)

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Audit reports `boardsWithoutLayout` | A board was created without `addFlexLayout()`/`addGridLayout()` | Add a layout to each flagged board (then re-append/order children); re-run the audit until empty. |
| Elements don't reflow / overlap / ignore gaps | Children arranged by absolute x/y, no flex on parent | Add flex to the parent Board; let append order + gap + align/justify position them. |
| Section children misaligned | Flex overriding x/y | Order via append; use `layoutChild`; align with `alignItems`/`justifyContent`. |
| Text box won't grow with content | `resize()` set `growType` to fixed | Set `text.growType = "auto-height"` (or `auto-width`). |
| Component instance looks wrong | Edited an attached instance | Don't mutate internals; swap/switch variant, or detach (with reason). |
| Colors not applying | Token apply async / no token | Verify in a later call; ensure the semantic token exists. |
| Screen too big to reason about | Built one-shot | Rebuild section by section; checkpoint each. |
| Lost place after truncation | No ledger | Read `RUN_ID` ledger; re-derive structure; continue. |
