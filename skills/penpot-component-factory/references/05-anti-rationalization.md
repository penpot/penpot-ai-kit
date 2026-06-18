# 05 — Anti-rationalization (components)

| Excuse | Why it's wrong | Countermeasure (halt) |
|--------|----------------|------------------------|
| "Skip Pressed/Focus, Default is enough." | Missing states = broken, inaccessible component. | Required states are gates; build all unless the system drops one explicitly. |
| "Hardcode the hover hex." | Breaks theming/governance. | Bind/propose `color.action.*.hover.bg`. |
| "Detach the instance to tweak it quickly." | Detach is semi-destructive and silent. | Use `switchVariant`/`swapComponent`; detach only with approval + report. |
| "Absolute-position children, faster." | Fights flex; breaks resize. | Flex order + `layoutChild`; absolute only with `layoutChild.absolute` + reason. |
| "Generate every axis combination." | Bloats the matrix with unused variants. | Only build combinations the design language uses. |
| "I'll guess the variant API." | Variants are drift-prone. | Verify with `penpot_api_info`. |
