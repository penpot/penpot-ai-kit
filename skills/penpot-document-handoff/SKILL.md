---
name: penpot-document-handoff
description: "Document a Penpot design for handoff with a hideable annotation layer BESIDE the design (never on top of it): a context card (goal, business rules, links, status), numbered pins on the UI, matching observation/recommendation notes, optional tooltips. Reuses or proposes an annotation component kit + tokens. NOT for auditing (penpot-audit-*) or renaming layers (penpot-rename-layers). Triggers: 'document this design', 'annotate this screen', 'prepare this for handoff', 'add observation notes', 'create a critique card', 'spec this screen for handoff'."
disable-model-invocation: false
version: 0.3.0
audiences: [product-designer, design-engineer, design-system]
mode-default: review
requires:
  - shared/penpot-mcp-tool-reference.md
  - shared/plugin-api-gotchas.md
  - shared/tokens-schema.json
  - shared/naming-conventions.md
  - shared/state-management.md
  - shared/modes-and-policies.md
  - shared/visual-self-review.md
---

# penpot-document-handoff — design → annotated handoff

Turn a design into a self-explaining handoff, as a **senior handoff specialist who never annotates on
top of the work**: a **context card** to its left (goal, business rules, links, designers, status,
feedback wanted / not wanted), **numbered pins** on the UI regions, a **matching note card** per pin to
its right, and optional **tooltips** for transient states — all inside one **hideable group**, so a
reviewer gets back to the clean design with one click.

**The one rule: annotate beside, never on top — and one annotation per call.** The design is read-only
input: nothing in it is moved, restyled, renamed or restructured. Build the context card, then each
pin + note individually, checkpointing as you go.

Tool surface: `shared/penpot-mcp-tool-reference.md`. API traps: `shared/plugin-api-gotchas.md` (the
`#n` below).

## Brief contract
- **Context** — product, audience, the feature or flow, and the reader (developers, PMs, a critique).
- **Objective** — the one design to document and what the handoff must make unambiguous.
- **Inputs** — the design board; the brief content (US number, title, "How might we" goal, context and
  business rules, links, designers, status, platform, feedback wanted / not wanted); the regions to pin
  with their observation (and optional recommendation); transient states needing tooltips.
- **Constraints** — the design is not modified; the annotation kit is reused if present, proposed if
  not; accent, surface and type are bound to tokens; pins are numbered contiguously and match notes
  1:1; everything sits in the hideable group.
- **Acceptance Criteria** — design untouched (same shape set, same bounds); every pin has exactly one
  note and vice versa; numbering contiguous from 1; annotation text, accent and surface bound to
  tokens; one group toggle hides the whole layer; the three-column reading order holds.

## Workflow
Before every ✋ checkpoint that shows visual work, run the export → look → fix loop of
`shared/visual-self-review.md` (max 2 self-fixes).

**Phase 0 — Discovery (read-only).** `high_level_overview`; resolve the target (`penpot.selection` or a
named board) and keep its id in `storage.dh`; read its structure (depth 2–3) to list pinnable regions
with their `bounds`; inventory the annotation kit and tokens with `scripts/setupAnnotationKit.js` in
`dryRun`. ✋ Confirm the target and whether a kit exists.

**Phase 1 — Brief.** Collect or confirm the context-card content and the pin list (region →
observation → optional recommendation); `references/02-handoff-brief.md`. ✋ Approve both before any
drawing.

**Phase 2 — Annotation kit.** Kit components and `annotation.*` tokens exist → reuse them. Otherwise
**propose** the minimal kit (Critique Card, Chip Note, Pointer S/L, Tooltip) and its tokens
(`color.annotation.accent | surface | on-accent | body`, `font.annotation.title | body | label`) per
`references/04-component-and-tokens.md`, and create it only after approval:
`scripts/setupAnnotationKit.js` creates the tokens and the Pointer components; Chip Note, Critique Card
and Tooltip are then built from the reference, one component per call. ✋ Approve kit and token names,
values and tier.

**Phase 3 — Context card.** `scripts/buildContextCard.js`: instance the Critique Card, fill it from the
brief, place it to the **left** of the design (`references/03-layout-placement.md`). ✋ Export the card.

**Phase 4 — Pins and notes, one per call.** `scripts/placePinAndNote.js`: a numbered Pointer on the
region plus a Chip Note with the same number in the **right** column. Optionally
`scripts/addTooltipCallout.js` for a transient state. ✋ Export after each (or each small batch).

**Phase 5 — Wrap and audit.** `scripts/finalizeHandoff.js` groups every annotation shape under one
group named `Hide this to quit notes` and runs the self-audit: design untouched, pin ↔ note parity,
contiguous numbering, tokens bound, column order. A non-empty `violations` fails the gate — fix before
reporting done. Then the structured report.

## Layout
```
[ Critique Card ]      [   the design (read-only)   ]      [ Chip Note #1 ]
  #US · title            ┌─────────┐                          number + TITLE
  status · platform      │  ① ② ③  │ ← Pointer pins           Observation
  HMW goal               │  UI…    │   on the regions         Recommendation?
  links · designers      └─────────┘                        [ Chip Note #2 ] …
  context / feedback     (+ Tooltip for transient states)
```
Anatomy and reference values: `references/01-annotation-anatomy.md`.

## Rules
1. **The design is never modified** — no `resize`, reparenting, `detach`, `remove`, fill or name change
   on any original shape. Highlighting a region means a pin over it, not a recolored layer. The audit
   fails the run if the design's shape set or bounds changed.
2. **One annotation per `execute_code` call.** A one-shot layer is unauditable and de-syncs numbering.
3. **Pin ↔ note parity.** Every pin has exactly one note with the same number; numbers run 1…N with no
   gaps, kept contiguous at every step (not "renumbered later"). A remark with no region belongs in the
   context card, not in an orphan note.
4. **Reuse the kit; never hardcode its palette.** Instance the kit components instead of dropping plain
   text; bind accent and surface to `color.annotation.*` — proposing the tokens if they are missing.
5. **Fill policy (#11) — this skill's most common visual bug.** Every new Board is born opaque white.
   Note cards, the context card and tooltips are surfaces → bind `color.annotation.surface`; inner
   section boards and wrappers are structural → `fills = []`.
6. **Cards are flex Boards**, never absolute-positioned text or plain Groups (the reference system's
   cards use `column-reverse`; the scripts' fallback cards use a plain `column` — match whichever kit
   the file has). Pins and the context card
   are placed at absolute page positions; an `absolute` layout child uses **page** coordinates and
   boards clip at their edges (#14).
7. **Text.** Set `growType` after any `resize()` (#3) and read `textBounds` in a later call. Resolve
   the font by exact name (`penpot.fonts.all.find(f => f.name === "Work Sans")`, #13b); if it is
   absent keep the default and report `font-fallback`.
8. **Token binding (#2).** Verify in a later call; guard every apply (`shape.tokens[prop] !== tok.name`)
   — a re-applied token loses its binding.
9. **One hideable group** (`penpot.group(shapes)`), named `Hide this to quit notes`; hiding is
   `group.hidden = true`.

More failure modes: `references/05-anti-rationalization.md`. Recovery (missing kit, broken numbering,
accidental design edits, grouping issues): `references/06-error-recovery.md`.

## Mode, state and naming
Mode **review** (`shared/modes-and-policies.md`): geometry, components and tokens all go through a
checkpoint. Safe set: documentation metadata (plugin data) and renaming an auto-named annotation layer
this skill just created. Never automatic: creating the kit, creating `annotation.*` tokens, and any
change to the design.

Ledger under `RUN_ID` (`shared/state-management.md`; data in `storage.dh` plus the in-file ledger):
`phase`, `designBoardId`, `kit: { critiqueCardId, chipNoteId, pointerSId, pointerLId, tooltipId,
created }`, `tokens`, `contextCardId`, `notesColumnX`, `groupId`, `pins: [{ n, regionId, pinId,
noteId }]`, `pinCounter`. Resume: read the ledger, re-read the group and pins, continue from
`pinCounter`.

Naming (`shared/naming-conventions.md`): components keep the reference system's names (`Critique Card`,
`Chip Note`, `Pointer`, `Tooltip`); tokens are dot-notation in an `annotation` set; layers are
kebab-case (`context-card`, `note-card`, `pin`); pin labels are the integer index.

## Supporting files
- **references/** — `01-annotation-anatomy.md`, `02-handoff-brief.md`, `03-layout-placement.md`,
  `04-component-and-tokens.md`, `05-anti-rationalization.md`, `06-error-recovery.md`.
- **scripts/** (paste into `execute_code`) — `setupAnnotationKit.js` (inventory; creates the kit when
  not `dryRun`), `buildContextCard.js`, `placePinAndNote.js` (one pin + note; `exceptions` lists any note field it could not fill), `addTooltipCallout.js`,
  `finalizeHandoff.js` (group + audit).

**Doctrine paths.** `shared/…` and `policies/…` resolve inside this bundle in native installs (vendored by the installer); in a Claude Code plugin install they live at the plugin root — `${CLAUDE_PLUGIN_ROOT}/shared/…`, two directories up from this file.
