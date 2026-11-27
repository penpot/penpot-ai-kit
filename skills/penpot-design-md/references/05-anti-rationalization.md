# 05 — Anti-rationalization (DESIGN.md extraction)

> When you catch yourself reaching for one of these, stop and do the countermeasure instead.

| Excuse the LLM makes | Why it's wrong | Deterministic countermeasure |
|----------------------|----------------|------------------------------|
| "The file has no tokens, so I'll write a typical palette." | Fabricated values poison every downstream consumer of the doc. | Stop. Sample real shape fills (`references/03-inference.md`), map what exists, put the rest in Known Gaps. |
| "I can describe the aesthetic from the token names." | `color.primary = #00d1b8` doesn't tell you whether the design is dense or airy, flat or elevated. | Halt Phase 3 until ≥1 `export_shape` has been viewed. Prose cites what was seen. |
| "107 tokens is too many; I'll just list them all raw." | A raw dump is not documentation — the format demands curated semantic groups. | Curate into the semantic map, then disclose the collapse explicitly in Colors + Known Gaps. |
| "This component is obvious — a standard button, 8px radius." | "Standard" is fabrication; this file's button may be 6px with a hairline border. | Sample the actual `mainInstance()` before writing any component entry. |
| "Do's & Don'ts are generic best practices anyway." | The section documents THIS system's rules, not design folklore. | Each Do/Don't must trace to an observation (token structure, sampled styles, or a viewed export). |
| "Light and dark values differ; I'll average or pick per-property." | Mixed-theme values describe a design that doesn't exist. | Pick the canonical theme (Phase 0 decision); document the other as a delta subsection. |
