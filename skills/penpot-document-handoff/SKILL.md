---
name: penpot-document-handoff
description: "Document a Penpot design for handoff by building a clean annotation layer BESIDE the design (never on top of it): a left context card (the 'How might we' goal, business rules, links, status, feedback wanted/not), numbered pin markers on the UI, matching observation/recommendation note cards on the right, and optional tooltips — all wrapped in a single hideable group so the clean design can be revealed. Reuses an annotation component kit + tokens if present; proposes and creates a minimal one if missing. NOT for auditing (use penpot-audit-*) or renaming layers (use penpot-rename-layers). Triggers: 'document this design', 'annotate this screen', 'prepare this for handoff', 'add design annotations', 'explain this flow for devs', 'add observation notes', 'create a critique card', 'spec this screen for handoff'."
disable-model-invocation: false
version: 0.2.0
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

## 1. Title + How it works
`penpot-document-handoff` turns a finished (or in-progress) design into a self-explaining handoff:
a **context card** to its left, **numbered pins** on the UI regions, **matching note cards** to its
right, and optional **tooltips** for transient states — every annotation living in one **hideable
group** so reviewers can toggle back to the clean design. Every mutation goes through `execute_code`;
validate visually with `export_shape`; read structure with `penpotUtils.shapeStructure` (full tool
surface: `shared/penpot-mcp-tool-reference.md`). It first discovers the target
design + any existing annotation component kit and tokens, then builds the annotation layer
**incrementally — one annotation per call** — strictly as a **sibling layer**, never editing the
design itself.

## 2. The One Rule That Matters Most
**Annotate beside, never on top — and one annotation per call.** The design being documented is
read-only: you add a separate, hideable annotation layer next to it and you never move, restyle, or
restructure a single shape of the original. Build the context card, then add pins+notes one at a time,
checkpointing as you go. Generating the whole annotation set in one `execute_code` call is a failure
mode.

## 3. Penpot MCP Tool Reference
Full surface: `shared/penpot-mcp-tool-reference.md`. Key calls this skill leans on:
`penpotUtils.shapeStructure` / `findShape` / `findShapes` (locate the design + kit components);
`penpot.library.local.components` + `comp.instance()` (reuse the annotation kit); `penpot.createBoard()`
/ `addFlexLayout()` (build the kit if missing); `penpot.group()` (the hideable wrapper — verify with
`penpot_api_info`); `shape.applyToken` (bind accent/surface/type); `export_shape('selection'|<id>)` at
every checkpoint.

## 4. Plugin API Essentials
Gotcha numbers refer to `shared/plugin-api-gotchas.md`.
- The design is **read-only input**. Read it with `shapeStructure`; resolve pin anchor points from
  child `bounds` (absolute x/y/width/height). Never call `resize`/reparent/`detach`/`remove` on it.
- Annotation cards are **Boards with flex** (`column-reverse`, matching the reference system); compose
  with append order + gaps + padding, never absolute x/y inside a card.
- Pins and the context card sit at **absolute** page positions (they are not inside the design's
  layout) — set `x`/`y` directly, or `layoutChild.absolute = true` if parented into a layout board
  (**#14**: absolute children use PAGE coordinates, and boards clip at their edges).
- **#3 text auto-sizing** — set `growType` to `auto-width`/`auto-height` after any `resize()` (which
  forces `fixed`); sleep ~100 ms before reading back `textBounds`.
- **#2 async token application** — apply in one call, verify `resolvedValue` in a LATER call.
- **#11 every new Board is born with an OPAQUE WHITE fill — this skill's critical failure mode.**
  `createBoard()` ships `fills = [{ fillColor: "#FFFFFF", fillOpacity: 1 }]`. Left in place, a
  structural wrapper's square white corners poke out behind the rounded card it wraps, and any board
  keeping the literal white is off-system (never themes). **Fill policy:** note/context cards and
  tooltips are genuine **surfaces** → bind their bg to `color.annotation.surface` (never a literal);
  inner section boards and wrappers are **structural** → clear with `board.fills = []`.
- Wrap-to-hide: collect every annotation shape and `group()` them under one named group; hiding =
  `group.hidden = true`. Verify `group()` / grouping signature with `penpot_api_info` before relying on it.

## 5. Token-Aware Brief Contract
Restate the request before mutating. Act as a **senior design-systems / handoff specialist who never
annotates on top of the work and never hardcodes the annotation palette.**

- **Context** — product, audience, the feature/flow being documented, target reader (devs? PMs? design
  critique?).
- **Objective** — the single design (board/frame or selection) to document and what the handoff must
  make unambiguous.
- **Inputs** — the design board id; the handoff brief content (US number, title, the "How might we"
  goal, context/business rules, links, designer(s), status, platform, feedback wanted / not wanted);
  the list of UI regions to pin with their observation (and optional recommendation) text; any
  transient states needing tooltips.
- **Constraints** — do not modify the design; reuse the annotation kit if present (else propose one);
  bind accent/surface/type to tokens (propose `annotation.*` tokens if missing — human approves);
  pins numbered contiguously and matched 1:1 to notes; everything inside the hideable group.
- **Acceptance Criteria** — design byte-for-byte untouched; every pin has exactly one matching note and
  vice-versa; numbering contiguous from 1; all annotation text bound to annotation type tokens; accent
  & surface bound to tokens; the whole layer hides/shows from one group toggle; 3-column reading order
  (context | design | notes) holds.

## 6. Mandatory Workflow

> **Visual self-review (mandatory):** before every ✋ checkpoint that shows visual work,
> run the export → look → fix loop from `shared/visual-self-review.md` — export the unit you
> just built, inspect the image yourself against the checklist, fix visible defects (max 2
> iterations), and present that same export with any remaining defects named.

**Phase 0 — Discovery (read-only).** `high_level_overview`; resolve the target design
(`penpot.selection` or a named board) and copy its id into `storage.dh`; read its structure
(`scripts/locateDesign` pattern, depth 2–3) to enumerate pinnable regions; inventory the annotation kit
+ tokens (`scripts/setupAnnotationKit.js` in `dryRun`). **✋ Checkpoint:** confirm the design + whether
a kit exists or must be created.

**Phase 1 — Handoff brief.** Collect/confirm the context-card content and the pin list (region →
observation → optional recommendation). Use `references/02-handoff-brief.md` / `prompts/handoff-brief.md`.
**✋ Checkpoint:** approve the brief + pin list before any drawing.

**Phase 2 — Ensure the annotation kit.** If the kit components + `annotation.*` tokens exist, reuse
them. If not, **propose** the minimal kit (Critique Card, Chip Note, Pointer S/L, Tooltip) + tokens
(`color.annotation.accent`, `color.annotation.surface`, `color.annotation.on-accent`,
`color.annotation.body`, `font.annotation.title|body|label`) per `references/04-component-and-tokens.md`,
and create it only after approval (`scripts/setupAnnotationKit.js`). **✋ Checkpoint:** approve kit +
token names/values/tier.

**Phase 3 — Context card.** Build/instance the Critique Card, fill it from the brief, place it to the
**left** of the design (`scripts/buildContextCard.js`). **✋ Checkpoint:** `export_shape` the card.

**Phase 4 — Pins + notes (one per call).** For each region: place a numbered Pointer/L pin anchored to
the region on the design, and a matching Chip Note in the **right** column with the same number
(`scripts/placePinAndNote.js`). Optionally add a Tooltip for a transient state
(`scripts/addTooltipCallout.js`). **One annotation per `execute_code` call.** **✋ Checkpoint:**
`export_shape` after each (or each small batch).

**Phase 5 — Wrap & audit.** Group every annotation shape under one hideable group named
`Hide this to quit notes`; run the self-audit (`scripts/finalizeHandoff.js`): design untouched, pin↔note
parity, contiguous numbering, tokens bound, 3-column order. A non-empty `violations` fails the gate —
fix before reporting done. Report.

## 7. Critical Rules
1. **Never modify the design.** No geometry, fill, name, or structure change on any original shape. The
   skill only *adds* a sibling annotation layer. The Phase 5 audit fails the run if the design's shape
   set or bounds changed.
2. **One annotation per `execute_code` call.** Context card, then each pin+note individually. Never
   one-shot the whole layer.
3. **Pin↔note parity & contiguous numbering.** Every Pointer pin has exactly one Chip Note with the
   same number; numbers run 1..N with no gaps; the on-canvas pin (L) and the note's header pin (S) share
   the number.
4. **Reuse the kit; propose tokens, never hardcode.** Instance existing annotation components; if the
   kit/tokens are missing, propose and create them under review — never paint raw `#1A88E0`/`#E4F3FF`.
5. **3-column layout.** Context card left, design center (untouched), note cards stacked right; pins
   overlay the regions they point to.
6. **Flex inside every card.** Cards/sections are flex Boards (`column-reverse` like the reference), not
   absolute-positioned text or plain Groups.
7. **Everything hideable from one group.** All annotation shapes live under a single named group so
   reviewers toggle the clean design with one click.
8. **Default mode = review.** Geometry is created → checkpoint at each phase; kit/token creation is a
   never-autofix change requiring approval.

## 8. Domain Architecture
The annotation layer is three columns around the untouched design:

```
[ Critique Card ]      [   the design (read-only)   ]      [ Chip Note #1 ]
  #US · title            ┌─────────┐                          number+TITLE
  State/Copy/Platform    │  ① ② ③  │ ← Pointer/L pins         Observation
  status pill            │  UI…    │   on the regions         Recommendation?
  HMW goal               └─────────┘                        [ Chip Note #2 ] …
  links · designers      (+ Tooltip/Top|Bottom for
  context                 transient states)
  feedback wanted
  feedback NOT wanted
```
All of it (cards + pins + tooltips) is wrapped in one group: `Hide this to quit notes`.
Component kit + token taxonomy: `references/01-annotation-anatomy.md`, `references/04-component-and-tokens.md`.

## 9. Modes & Policies
Default **review** (`shared/modes-and-policies.md`). Creating geometry, components, or tokens always
requires a checkpoint. **Safe-set** items this skill may auto-apply: adding documentation metadata
(plugin-data tags) and renaming an auto-named annotation layer it just created. **Never auto-fix:**
creating the kit components, creating `annotation.*` tokens, and (always) any change to the design being
documented. Fill policy: note/context cards are genuine **surfaces** → bind their bg to
`color.annotation.surface`; inner section boards are **structural** → `fills = []`.

## 10. State Management
Ledger under `RUN_ID` (`shared/state-management.md`), in `storage.dh` + an in-file breadcrumb:
`phase`, `designBoardId`, `kit:{critiqueCardId,chipNoteId,pointerSId,pointerLId,tooltipId,created}`,
`tokens:{accent,surface,...}`, `contextCardId`, `notesColumnX`, `groupId`,
`pins:[{n,regionId,pinId,noteId}]`, `pinCounter`. On resume: re-read the ledger, re-derive reality with
a structure read (the group + pins), and continue from `pinCounter`.

## 11. User Checkpoints
| After phase | Artifacts shown | What we ask |
|-------------|-----------------|-------------|
| 0 discovery | design summary + pinnable regions + kit/token presence | Confirm target + kit plan? |
| 1 brief | context-card content + numbered pin list | Approve brief + pins? |
| 2 kit | proposed components + token names/values/tier (only if creating) | Approve kit + tokens? |
| 3 context card | `export_shape` of the card | Approve content/placement? |
| each pin+note | `export_shape` of the region + note | Approve / adjust? |
| 5 wrap & audit | hideable group + audit result | Approve handoff / iterate? |

## 12. Naming Conventions
`shared/naming-conventions.md`. Components PascalCase (`Critique Card`, `Chip Note`, `Pointer`,
`Tooltip` — keep the reference system's names if reusing). Tokens dot-notation under an `annotation`
set (`color.annotation.accent`, `font.annotation.label`). Layers kebab-case/semantic
(`context-card`, `note-card`, `pin`, `annotations`); the hideable group keeps the recognizable name
`Hide this to quit notes`. Pin labels are the integer index.

## 13. Anti-Rationalization Table
| Excuse the LLM makes | Why it's wrong | Deterministic countermeasure that halts the flow |
|----------------------|----------------|--------------------------------------------------|
| "I'll just drop the note text on top of the design / recolor a layer to highlight it." | That mutates the deliverable; handoff annotations must be removable and non-destructive. | Stop. Add a sibling annotation shape in the notes column or a Pointer pin overlay; never edit an original shape. The Phase 5 audit fails if the design changed. |
| "I'll create all the pins and notes in one `execute_code` to save calls." | One-shot output is unauditable and de-syncs pin↔note numbering. | One annotation per call; checkpoint with `export_shape`; advance `storage.dh.pinCounter` each time. |
| "The accent blue is just decoration — hardcode `#1A88E0`." | Off-system values fail governance and won't theme/rebrand. | Bind to `color.annotation.accent`; if it doesn't exist, propose it (name/value/tier) for approval. |
| "This note doesn't really need a pin — it's general." | Orphan notes break the number→region reading model reviewers rely on. | Every Chip Note gets a Pointer pin on a concrete region; if it's truly global, it belongs in the context card, not a note. |
| "A plain text block is faster than instancing the Chip Note component." | Raw text drifts from the system and won't restyle with the kit. | Instance the kit component; if the kit is missing, create it once (under review) and reuse. |
| "I'll renumber notes later; order doesn't matter yet." | Gaps/dupes in numbering silently corrupt the handoff. | Keep numbering contiguous and matched at every step; the audit rejects gaps/dupes. |
| "I'll skip the hideable group; the layers are tidy enough." | Without one toggle, reviewers can't get back to the clean design. | Wrap all annotation shapes under the single `Hide this to quit notes` group before reporting done. |

## 14. Helper Code Snippets
```js
// Phase 0 — lock the target design + enumerate pinnable regions (READ-ONLY)
const design = penpot.selection[0] || penpotUtils.findShape(s => s.name === "REPLACE-ME-board");
if (!design) return { error: "Select the design board to document, or pass its name." };
storage.dh = Object.assign(storage.dh || {}, { designBoardId: design.id });
const regions = (design.children || []).map(c => ({
  id: c.id, name: c.name, type: c.type,
  x: Math.round(c.x), y: Math.round(c.y), w: Math.round(c.width), h: Math.round(c.height)
}));
return { design: { id: design.id, name: design.name, x: Math.round(design.x), y: Math.round(design.y),
  w: Math.round(design.width), h: Math.round(design.height) }, regionCount: regions.length, regions };
```
```js
// Reference palette/typography of the annotation system (verified from the example file).
// Use these as the VALUES when proposing annotation.* tokens — do NOT paint them raw on shapes.
return {
  color: { accent: "#1A88E0", surface: "#E4F3FF", onAccent: "#FFFFFF", body: "#000000" },
  type:  { family: "Work Sans",
           label: { size: 12, weight: 500, case: "uppercase", fill: "accent" },
           body:  { size: 14, weight: 400, fill: "body" },
           title: { size: 24, weight: 400, fill: "body" } },
  card:  { bg: "surface", padding: [24,12,24,12], flexDir: "column-reverse", sectionGap: 24, labelGap: 4 },
  pin:   { L: 40, S: 24, radius: 9999, bg: "accent", number: "onAccent" }
};
```

## 15. Reference Resources
- `penpot_api_info('Board')`, `penpot_api_info('LibraryComponent')`, `penpot_api_info('Text')`,
  `penpot_api_info('Context','group')` — verify the grouping signature before wrapping.
- `shared/penpot-mcp-tool-reference.md` (tool surface), `shared/plugin-api-gotchas.md` (#11 fill
  policy; async tokens; resize→growType), `shared/tokens-schema.json` (token `type` spellings).

## 16. Supporting Files

### references/ (progressive-disclosure deep dives)
| File | Loaded when | Contents |
|------|-------------|----------|
| `references/01-annotation-anatomy.md` | Phases 2–4 | The reverse-engineered system: Critique Card sections, Chip Note structure, Pointer S/L, Tooltip, palette/type, the hideable group. |
| `references/02-handoff-brief.md` | Phase 1 | How to elicit/structure the context-card content and the pin list. |
| `references/03-layout-placement.md` | Phases 3–4 | 3-column geometry, pin anchoring math, note stacking, spacing rhythm. |
| `references/04-component-and-tokens.md` | Phase 2 | Find-or-create the annotation component kit + the `annotation.*` token proposals. |
| `references/05-anti-rationalization.md` | any phase | Extended failure-mode catalogue with countermeasures. |
| `references/06-error-recovery.md` | on failure | Recovery for missing kit, broken numbering, accidental design edits, group/ungroup issues. |

### scripts/ (paste-into-`execute_code` templates)
| File | Phase | Purpose |
|------|-------|---------|
| `scripts/setupAnnotationKit.js` | 0/2 | Inventory the kit + tokens; in non-dryRun, create the minimal kit + propose tokens. |
| `scripts/buildContextCard.js` | 3 | Build/instance the Critique Card and fill it from the brief. |
| `scripts/placePinAndNote.js` | 4 | Add ONE numbered pin on a region + its matching Chip Note. |
| `scripts/addTooltipCallout.js` | 4 | Add an optional Tooltip callout for a transient/hover state. |
| `scripts/finalizeHandoff.js` | 5 | Wrap annotations in the hideable group and run the parity/untouched/token audit. |
