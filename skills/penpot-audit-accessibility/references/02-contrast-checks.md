# 02 — Contrast checks (WCAG 1.4.3 / 1.4.11)

## Thresholds
- Normal text: **4.5:1**.
- Large text (≥24px, or ≥18.66px bold): **3:1**.
- UI components & graphical objects (borders, icons that convey meaning): **3:1** (1.4.11).
- AAA (if requested): 7:1 normal, 4.5:1 large.

## Method
1. For each text/icon, get foreground hex and the effective background hex.
2. Compute relative luminance and contrast ratio (see SKILL.md §14 snippet).
3. Compare to the threshold for that text size/role.
4. Account for opacity: a token/opacity < 1 changes the effective color — composite over the background.

## Output per failure
`{ criterion:"1.4.3", element, fg, bg, ratio, required, fix:"use color.text.default on color.bg.default / darken accent", confidence }`.
