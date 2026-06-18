# 03 — Infer tokens from an existing (hardcoded) design

When a file uses raw values and few/no tokens, derive a token system bottom-up.

## Method
1. **Collect** distinct visual values across the page:
   - fill/stroke colors (from `shape.fills`/`shape.strokes`),
   - spacing (flex `rowGap`/`columnGap`/`*Padding`, layout margins),
   - radii (`borderRadius*`), font sizes/weights/families (Text shapes).
2. **Cluster** near-duplicates:
   - colors within a small ΔE → one token (prefer the most frequent exact value),
   - spacing snapped to the nearest 4px grid step,
   - font sizes snapped to the Minor Third scale.
3. **Propose** a two-tier system: primitives for each distinct cluster, semantic aliases for the
   roles you can infer (background, text, border, action). Present the proposal — do **not** create
   tokens silently.
4. **Approve** at the checkpoint, then create (Phase 1/2) and apply (Phase 4).

## Notes
- Frequency matters: a color used 40× is a stronger token candidate than one used once.
- Flag off-grid spacing and near-duplicate colors as cleanup opportunities for `penpot-audit-tokens`.
- Inference proposes; the human decides names and which values are "official". See `scripts/inferTokensFromShapes.js`.
