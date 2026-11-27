# 05 — Anti-rationalization (components)

| Excuse | Why it's wrong | Countermeasure (halt) |
|--------|----------------|------------------------|
| "Skip Pressed/Focus, Default is enough." | Missing states = broken, inaccessible component. | Required states are gates; build all unless the system drops one explicitly. |
| "Hardcode the hover hex." | Breaks theming/governance. | Bind/propose `color.action.*.hover.bg`. |
| "Detach the instance to tweak it quickly." | Detach is semi-destructive and silent. | Use `switchVariant`/`swapComponent`; detach only with approval + report. |
| "Absolute-position children, faster." | Fights flex; breaks resize. | Flex order + `layoutChild`; absolute only with `layoutChild.absolute` + reason. |
| "Generate every axis combination." | Bloats the matrix with unused variants. | Only build combinations the design language uses. |
| "I'll guess the variant API." | Variants are drift-prone. | Verify with `penpot_api_info`. |
| "It's just variants — no need for a restore point or a validate read." | Variant grouping restructures components; below 2.20 it corrupted files, and on any version a bad combination shows up only in `variantError` / `validate()`. | `saveVersion` before Phase 3; read `validate()` + `variantError` in the next call; below 2.20 use the standalone-components fallback. |
| "I'll re-apply the state tokens to be safe." | Re-applying a bound token removes the binding; the `Default` cell inherits the base's. | Apply only where `shape.tokens[prop] !== tok.name`; verify in the next call. |
