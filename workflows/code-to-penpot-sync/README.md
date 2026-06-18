# Workflow: code-to-penpot-sync

**Pattern:** reconcile loop. **When:** a design engineer wants the Penpot design and the source code
to agree — build from code, then detect and resolve drift.

## Loop
1. `penpot-build-from-code` — translate the app page/component into Penpot, bound to tokens. ✋ approve.
2. `penpot-design-to-code-review` — extract Penpot markup/style, compare against the source/Storybook, report drift.
3. If drift exists, decide per item: fix in Penpot (route to the owning skill) or flag for code. Repeat until drift is acceptable.

## Inputs
- Source code / Storybook reference, the Penpot design system, the target view.

## Output
An on-system Penpot screen + a drift report (resolved vs. flagged-for-code).

## Failure modes
- Storybook/source side unavailable → `penpot-design-to-code-review` degrades to comparing against the design system tokens.
- Treating every diff as a Penpot bug → some drift should be fixed in code; flag, don't silently change.
