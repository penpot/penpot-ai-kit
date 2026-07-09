# Inference for token-poor files (Phase 1 fallback)

When the file has few/no tokens, the semantic maps are DERIVED from evidence — never invented.
Every derived entry is marked `(sampled)` in the Colors section source note.

## Order of evidence
1. **Tokens** (any tier) — always first-class.
2. **Library colors** — grouped by `path`; group names (`background/`, `text/`, `border/`) map
   directly to semantic roles. Watch duplicates: same short name across groups.
3. **Fill-frequency sampling** — walk 1–3 representative pages with
   `penpotUtils.analyzeDescendants`, tally `fills[0].fillColor` by shape type:
   - the most frequent large-board fill → `canvas`
   - next most frequent container fills, ordered by luminance distance from canvas → `surface-1..n`
   - most frequent text fills by contrast level → `ink`, `ink-muted`, `ink-subtle`
   - low-frequency saturated hues on interactive shapes → `primary` (+ state shades if hover/
     pressed variants exist)
   - stroke colors on containers → `hairline`
4. **Spacing/radius sampling** — tally `flex` gaps/paddings and `borderRadius` values across the
   same pages; the recurring values (≥3 uses) form the `spacing:`/`rounded:` scales. One-off
   values are noted, not canonized.

## Rules
- A sampled scale is a HYPOTHESIS — present it at the Phase 1 checkpoint as "sampled, needs your
  confirmation" and record it in Known Gaps ("scales sampled from N pages, not tokenized").
- Never fill a role with a "typical" value because the evidence is missing — omit the key and log
  the gap. An absent `semantic-error` is information; a fabricated one is a trap.
- If sampling and library colors disagree, library colors win (they are declared intent).
- Suggest (do not run) `penpot-foundations` infer mode as the follow-up that would tokenize the
  sampled system properly.
