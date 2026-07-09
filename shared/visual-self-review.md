# Visual self-review — look at your own work before showing it

> Shared doctrine for every skill that mutates the canvas (build-screen, build-from-code,
> component-factory, migrate, document-handoff). The models running this kit are multimodal:
> `export_shape` output is not just "for the human checkpoint" — **the agent itself must look at
> the image and critique it BEFORE presenting it**. A checkpoint that shows the user an obviously
> broken render wastes their turn; catching it yourself costs one export and one look.

## The loop (per built section / component / annotation batch)

1. **Export** — call `export_shape` (PNG) on the unit you just built (the section board, the
   variant board, the annotation group). Prefer the smallest shape that contains the change.
2. **Look** — actually inspect the returned image against the checklist below. This is a real
   step, not a formality: compare what you *intended* (the brief/contract) with what you *see*.
3. **Judge** — every checklist item passes → proceed to the ✋ user checkpoint, presenting the
   SAME image (don't re-export). Any item fails → fix it with a targeted `execute_code` (smallest
   change), re-export, re-look.
4. **Bound it** — at most **2 self-correction iterations** per checkpoint. Still failing after 2?
   Stop and present the image to the user WITH the remaining defects named — never silently
   accept them, never loop forever, never hide the miss.

## Checklist (what to look for in the export)

- **Layout integrity** — nothing overlaps unintentionally; nothing overflows or is clipped by the
  board edge; nothing rendered at 0×0 or collapsed; expected elements are all present and in the
  intended order.
- **Alignment & rhythm** — edges that should align do; spacing looks even where the layout says
  it is even (a flex gap that renders lopsided means a stray absolute child or a wrong sizing).
- **Hierarchy** — the intended reading order is visually obvious (title reads bigger than body,
  primary action is the most prominent, section grouping is visible).
- **Text** — no truncated/wrapped-into-ugliness labels, no text spilling out of its container, no
  placeholder text left behind ("Lorem", "REPLACE-ME", auto names).
- **Color & state coherence** — fills render as intended (not the transparent-board trap, gotcha
  #11); interactive states are visually distinct from each other and from default.
- **Off-canvas artifacts** — no stray shapes left outside the board from a failed step.

The checklist is visual, not a substitute for the structural/token checks (`shapeStructure`,
`shape.tokens`, the audits) — do both. A render can look right with hardcoded hex; tokens can be
bound on a layout that looks wrong.

## Rules

- **Never present an unlooked-at export.** If you attached an image to a checkpoint, you have
  looked at it and either it passes or you have named its defects.
- **One fix per iteration, smallest possible.** Self-correction is targeted `execute_code`
  surgery on the defect you saw, not a rebuild of the section.
- **Record it.** Note self-review iterations in the run ledger (`shared/state-management.md`) and
  in the final report ("section hero: 1 self-fix — button overflowed its container").
- **Workflows:** in `brief-to-screen`, this visual critique runs as part of the generate step —
  it complements (never replaces) the `penpot-audit-accessibility` evaluator.

## Anti-rationalization

| Excuse | Why it's wrong | Countermeasure |
|--------|----------------|----------------|
| "The structure read looks right, no need to export." | Structure can't see overlap, clipping, contrast, or a transparent board. | Export + look before every checkpoint that shows visual work. |
| "I'll let the user catch visual issues — that's what the checkpoint is for." | The checkpoint is for design intent, not for defects you could see yourself. | Run the checklist first; present defects you can't fix, not defects you didn't look for. |
| "It failed twice; one more try." | Unbounded self-correction burns tokens and hides a wrong approach. | Hard stop at 2 iterations → present with named defects and ask. |
| "The export is small/blurry, probably fine." | An unreadable validation is not a validation. | Export the smallest containing shape (bigger relative resolution) and look again. |
