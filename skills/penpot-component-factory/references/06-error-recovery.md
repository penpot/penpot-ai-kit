# 06 — Error recovery (components)

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `createComponent` returns nothing useful | Passed wrong shapes / empty array | Pass the base Board in an array: `createComponent([board])`. |
| Children jump around after layout | Flex overriding x/y | Order via append; use `layoutChild`; set `absolute` only intentionally. |
| `createVariantFromComponents` errors | Wrong arg / not main-instances | Pass component MAIN INSTANCES (Board[]); there is no `combineAsVariants`. |
| `switchVariant` no effect | Wrong position index/value | Read `Variants.properties` order; match value casing exactly. |
| Variant looks unstyled | Token applied but read too soon | Token application is async; verify in a later call. |
| Duplicate variants on re-run | No idempotency | Check existing variant descriptors before cloning. |
| Instance edits affect main | Mutated attached instance | `detach()` first (and report it). |
