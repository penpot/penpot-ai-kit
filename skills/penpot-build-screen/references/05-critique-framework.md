# 05 — Critique framework

Before declaring a screen done, self-review against these heuristics and record findings.

## Checklist
- **Hierarchy** — is the primary action obvious? Does the eye land where the user goal is?
- **Rhythm** — is spacing on the 4px grid and consistent across sections?
- **Type** — clear scale (h1→body→label) from semantic tokens; no random sizes?
- **Color** — semantic tokens only; sufficient contrast (AA: 4.5:1 text, 3:1 large/UI)?
- **Reuse** — components instantiated, not redrawn? Any raw shapes that should be components?
- **Consistency** — radius/shadow family consistent; one style profile throughout?
- **Responsiveness** — sizing intent (fill/auto/fix) sensible per section?
- **Naming** — semantic layer names ready for handoff?

## Output
A short critique with: what works, what's weak, and concrete fixes. Run a quick contrast check (or hand
off to `penpot-audit-accessibility`). Justify the aesthetic decisions you made.
