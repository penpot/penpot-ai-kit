# 05 — Anti-rationalization (extended)

> Loaded any phase. When you catch yourself reaching for one of these excuses, stop and do the
> rigorous thing. Extends the table in `SKILL.md` §13.

| Excuse | Why it's wrong | Countermeasure that halts the flow |
|--------|----------------|-------------------------------------|
| "I'll highlight this by recoloring the design layer / nudging it for clarity." | Any edit to the deliverable is a regression; annotations must be removable. | Stop. Use a Pointer pin overlay + a note. Never write to an original shape. The Phase 5 audit diffs the design's child ids + bounds and fails on change. |
| "I'll generate the whole pin+note set in one call — it's deterministic." | One-shot is unauditable; if it half-fails you can't tell which notes landed, and numbering desyncs. | One annotation per `execute_code`; checkpoint; bump `storage.dh.pinCounter`. |
| "Just hardcode the blue/light-blue — they're annotation chrome, not product UI." | Off-system values can't rebrand and fail token governance. | Bind to `color.annotation.*`; propose the token if missing (name/value/tier) and create under review. |
| "This observation is general; I'll add a note with no pin." | Reviewers read by number→region; an orphan note breaks the model. | Pin every note to a concrete region; a global remark goes in the context card's Context. |
| "The Chip Note component is overkill; a text box reads the same." | Raw text drifts from the system and won't restyle with the kit. | Instance the component; if absent, create the kit once (review) and reuse. |
| "I'll fix numbering at the end." | Gaps/duplicates corrupt the handoff silently. | Keep contiguous + matched at every step; audit rejects gaps/dupes. |
| "Skip the hideable group — the panel toggles are fine." | Without one toggle reviewers can't reveal the clean design. | Wrap all annotation shapes under `Hide this to quit notes`. |
| "I'll append the note into the design's flex board so it lines up." | That reflows the actual UI — a destructive edit. | Notes are page-level siblings (or children of the annotation wrapper), never inside the design's layout. |
| "Two accent colors / a second font would make sections pop." | The system's restraint (one accent, one surface, one family) is the point. | Keep one accent, one surface, one type family; vary by size/weight/case only. |
| "The kit already half-exists; I'll just recreate it cleanly." | Duplicate components fork the system and confuse instance swap. | Idempotency check first; create only the missing pieces; reuse the rest. |
