# Handoff brief (annotate a design)

> Fill every section. Vague briefs produce generic annotations. Paste into your agent to drive
> `penpot-document-handoff`. The skill builds a hideable annotation layer BESIDE the design and never
> modifies the design itself.

**Role:** Act as a senior design-systems / handoff specialist who annotates beside the work (never on
top of it), reuses the annotation component kit (or proposes one), and binds the annotation palette to
tokens instead of hardcoding.

## Context
- Product & audience:
- Feature / flow being documented:
- Who reads this handoff (devs / PMs / design critique):

## Objective (single)
- The one design (board/frame or selection) to document, and what the handoff must make unambiguous:

## Inputs — context card
- US / issue number:
- Title:
- State of designs / State of copy / Platform(s):
- Status (In progress / Ready / Blocked):
- Goal — “How might we …?”:
- Links (issue / spec URLs):
- Designer(s):
- Context (problem, current friction, the proposal, what’s out of scope / deferred):
- Feedback we’re looking for (Tech / Product questions):
- Feedback we’re NOT looking for:

## Inputs — pin list (one observation per pin, in reading order)
| # | Region to point at | Title (UPPERCASE) | Observation | Recommendation (optional) |
|---|--------------------|-------------------|-------------|----------------------------|
| 1 |  |  |  |  |
| 2 |  |  |  |  |

## Inputs — transient states (optional tooltips)
- Trigger region · side (top/bottom) · text:

## Constraints (inviolable)
- Do NOT modify the design — annotations are a separate, hideable layer.
- Reuse the annotation kit if present; otherwise propose it (components + `annotation.*` tokens) for approval.
- Bind accent / surface / type to tokens; no hardcoded hex.
- Pins numbered contiguously from 1 and matched 1:1 to notes.
- One annotation per step, with a checkpoint after each.

## Acceptance Criteria (quantitative)
- Design byte-for-byte untouched (verified by the Phase 5 audit).
- Every pin has exactly one matching note; numbering contiguous 1..N.
- 3-column reading order: context card (left) · design (center) · notes (right).
- The whole annotation layer hides/shows from one group (`Hide this to quit notes`).
- A justified explanation accompanies the result.
