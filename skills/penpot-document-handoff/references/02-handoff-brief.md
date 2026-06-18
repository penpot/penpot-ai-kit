# 02 — Eliciting the handoff brief

> Loaded in Phase 1. The annotation layer is only as good as the brief behind it. Collect this before
> drawing anything. The `prompts/handoff-brief.md` template is the fill-in version of this.

## Context-card content (drives the `Critique Card`)
Ask for / confirm each field. Leave a field out only if the user explicitly says it's N/A.

| Field | What to capture | Example |
|-------|-----------------|---------|
| US / issue number | The tracker id | `#541` |
| Title | Short feature name | "Image fill modes — (Fill, Fit, Stretch, Crop and Tile)" |
| State of designs | Maturity of the design | Exploration / In review / Final |
| State of copy | Maturity of the copy | Placeholder / Designer copy / Final copy |
| Platform(s) | Where it ships | Web / Desktop / Mobile |
| Status | A pill state | In progress / Ready / Blocked |
| Goal / "How might we…" | The single framed problem | "How might we give users explicit control over how an image scales…" |
| Links | Issue/spec URLs | GitHub issue, Taiga US |
| Designer(s) | Names | "Guillermo Adán" |
| Context | The problem, current friction, the proposal, what's out of scope / deferred | (paragraphs) |
| Feedback we're looking for | The specific Tech / Product questions you want answered | (bullets) |
| Feedback we're NOT looking for | What to ignore (e.g. "visual polish, color choices") | (bullets) |

Keep the "How might we…" framing for the goal — it sets the critique tone the system was built around.

## Pin list (drives the `Pointer` pins + `Chip Note`s)
A numbered list, each row a single observation tied to one UI region:

| # | Region (UI element to point at) | Title (UPPERCASE) | Observation | Recommendation (optional) |
|---|--------------------------------|-------------------|-------------|----------------------------|
| 1 | the 5-mode icon row | MODE SELECTOR | "Five-mode icon row replacing the existing 'Keep aspect ratio' checkbox…" | — |
| 2 | the position 3×3 selector | POSITION SELECTOR | "Tabs to reduce scroll… Hidden for Stretch, Crop and Tile." | — |
| 3 | the adjustments header | ADJUSTMENTS SECTION | "Collapsible, collapsed by default… reset appears only when a value differs." | "Could be Phase 2." |

Rules for a good pin list:
- **One idea per pin.** If an observation covers two regions, split it into two pins.
- **Tie every pin to a concrete region** (a child shape of the design). Resolve its id/bounds in Phase 0
  so `placePinAndNote.js` can anchor the pin. A truly global remark belongs in the context card's
  Context section, not a note.
- **Numbering is contiguous** from 1, in reading order (usually top→bottom, left→right of the design).
- **Title is a short UPPERCASE noun phrase**; the Observation is descriptive prose; the Recommendation
  (optional) is the actionable / decision part (e.g. "could be Phase 2", "needs a min tile size").

## Transient states (drive optional `Tooltip`s)
List any state not visible in the static design that a reviewer must know about: hover tooltips, menu
labels, empty/error states. Each becomes a `Tooltip / Top|Bottom` callout near its trigger.

## Output of Phase 1
A confirmed brief object you can store in `storage.dh.brief`:
```
{ usNumber, title, stateDesigns, stateCopy, platforms, status, goal, links:[], designers:[],
  context, feedbackWanted, feedbackNot,
  pins:[ { n, regionId, title, observation, recommendation? } ],
  tooltips:[ { triggerRegionId, side:"top"|"bottom", text } ] }
```
