# 05 — Anti-rationalization (design-to-code review)

> When you catch yourself reaching for one of these, stop and do the countermeasure instead.

| Excuse the LLM makes | Why it's wrong | Deterministic countermeasure |
|----------------------|----------------|------------------------------|
| "The CSS strings differ, so it's drift." | `generateStyle` emits `16px`, code emits `1rem`; `#FFF` vs `#ffffff`; shorthand vs longhand. Raw-string diff yields garbage findings. | Normalize both sides first (units→px, colors→lowercase 6-digit hex, expand shorthand, sort props). Diff the normalized maps only. |
| "Hex matches the code, so this property passes." | A matching hex with **no bound token** still breaks theming and governance — it silently won't switch in dark mode. | Read `shape.tokens`. If no token is bound, emit a `Minor` "value not tokenized" finding even when the hex matches. |
| "No Storybook/code was given, so I can't review." | The skill is required to degrade gracefully. | Switch to design-system-token mode: diff the selection against `tokenOverview()`, mark `codeSource: "none"` in the report header, and report only design-side findings. |
| "generateStyle came back nearly empty — design has barely any styling." | Far more likely you passed a single shape instead of the array, or a wrong `opts` key. | Re-check: pass `penpot.selection` (an array); verify `opts` with `penpot_api_info`. Re-extract before concluding "no drift." |
| "I'll just fix the token mismatch in Penpot while I'm here." | This is a `suggest`-mode read-only skill; mutating breaks the contract and skips the downstream checkpoint. | Do not mutate. Emit the reconciliation as a proposal and hand off to `penpot-foundations`/`penpot-build-from-code`. |
| "Spacing is 18px in both, so it matches — pass." | 18 is off the 4px grid; matching code does not make it correct. | Flag any non-multiple-of-4 spacing as a finding (`grid4px:false`) regardless of code agreement; suggest the nearest grid token. |
