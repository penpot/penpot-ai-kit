# 03 — Sizing checks (WCAG 2.5.8 Target Size)

## Thresholds
- WCAG 2.2 AA SC 2.5.8: interactive targets **≥ 24×24 CSS px** (with spacing exceptions).
- Best practice for primary touch targets: **≥ 44×44**.

## Method
1. Identify interactive elements (buttons, links, inputs, icon buttons) by semantic name/component.
2. Read `width`/`height` (or `bounds`).
3. Flag any below 24×24; note ones below 44×44 as "review for touch".
4. Consider hit area vs visual size if padding provides extra target area.

## Output per failure
`{ criterion:"2.5.8", element, size:"WxH", required:"24x24", fix:"increase padding/min-size token", confidence }`.
