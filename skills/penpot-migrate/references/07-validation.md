# 07 — Validation (fidelity)

After migration, prove how close the result is and report gaps honestly.

## Checks
- **Structure** — IR node count vs created Penpot shapes; hierarchy preserved; child order intact.
- **Tokens** — every migrated token resolves; references intact; modes→themes working.
- **Components** — variant matrices reconstructed; required states present.
- **Layout** — flex/grid matches Auto Layout intent (sizing fill/auto/fix).
- **Visual** — `export_shape` of key screens; compare against Figma screenshots side by side.

## Report
```
## Migration Fidelity — <scope>
Tokens: X migrated (Y unresolved)  Components: X (Z variant gaps)  Screens: X
Visual: <close / minor diffs / needs work>
Gaps: <Figma features that didn't map cleanly, with reasons>
```
Never claim a perfect 1:1 if features (certain constraints, prototyping, effects) didn't translate.
