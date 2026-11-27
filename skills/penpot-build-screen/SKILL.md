---
name: penpot-build-screen
description: "Design production-grade screens in Penpot from a brief, as a senior visual designer — reusing the existing design system (tokens + components) and assembling section by section, never one-shot. Use to create a screen/page/landing/dashboard from a description. NOT for translating existing code (use penpot-build-from-code). Triggers: 'design a dashboard', 'create a landing page', 'design this app screen', 'build a UI from this brief', 'design a settings page', 'mock up a screen in Penpot'."
disable-model-invocation: false
version: 0.5.0
audiences: [product-designer]
mode-default: review
requires:
  - shared/penpot-mcp-tool-reference.md
  - shared/plugin-api-gotchas.md
  - shared/tokens-schema.json
  - shared/naming-conventions.md
  - shared/state-management.md
  - shared/modes-and-policies.md
  - shared/visual-self-review.md
  - shared/design-quality.md
  - shared/report-schemas/design-quality-report.schema.json
  - shared/visual-effects.md
  - shared/anti-slop.md
---

# penpot-build-screen — brief to on-system screen

Turn a brief into a crafted screen that lives inside the file's design system. Work as a **senior
product/visual designer** who makes deliberate aesthetic decisions and can justify each one.

**The one rule: reuse the system and build incrementally.** Existing components and semantic tokens
come before raw shapes; one section per `execute_code` call, looked at before the next. If the file
has no system, hand off to `penpot-foundations` — do not bootstrap one here beyond the trivial.

Tool surface: `shared/penpot-mcp-tool-reference.md`. API traps: `shared/plugin-api-gotchas.md` (the
`#n` below). Verify any Plugin API signature you are not sure of with `penpot_api_info`.

## Brief contract
Restate the request before building (`references/01-brief-analysis.md`):
- **Context** — product, audience, platform, brand mood.
- **Objective** — the single screen and its primary user goal.
- **Inputs** — content and sections, existing tokens and components, style profile, viewport.
- **Constraints** — existing components only where they exist; semantic tokens only; 4px grid; none of
  the named tells in `shared/design-quality.md` §7; with strict anti-slop on, none of the keys the
  direction step refused (`shared/anti-slop.md` §1).
- **Acceptance Criteria** — clear hierarchy; 4px rhythm; AA contrast; system reused; responsive intent
  stated; design-quality score ≥ 3 on all seven axes (`shared/design-quality.md` §8) or the weak axes
  presented explicitly; with strict anti-slop on, slop score ≤ 35.

## Workflow

Before every ✋ checkpoint that shows visual work, run the export → look → fix loop of
`shared/visual-self-review.md` (max 2 self-fixes) and present that same export with any remaining
defects named.

**Phase 0 — Discovery (read-only).**
1. `high_level_overview`, then `scripts/setupOrReuseSystem.js` to inventory tokens and components.
   Read `penpot.version` and the file profile / capability verdicts from the ledger
   (`shared/state-management.md`).
2. Analyse the brief; pick a style profile (`references/02-style-profiles.md`) **and a named screen
   skeleton** (`shared/design-quality.md` §5). If the ledger shows earlier screens, differ from them
   on at least one axis and say which.
3. **Anti-slop opt-in.** Read the stored preference (`penpot-anti-slop` → `scripts/antiSlopPrefs.js`).
   Unset and not answered by the brief → ask the question in `shared/anti-slop.md` §0 once per file, in
   the user's language, and store the answer. When it is `on`, run the direction step
   (`penpot-anti-slop` `references/02-direction-playbook.md`) *before* choosing profile and skeleton and
   add its refused keys to the Constraints.

✋ Confirm brief + style + skeleton + section list (+ the direction block when strict mode is on).

**Phase 1 — Frame.** `scripts/createScreenFrame.js`: idempotent, viewport-sized flex column, bg / gap /
padding bound to tokens, ledger initialised. If the screen belongs on another page, `await
penpot.openPage(page)` first and assert `penpot.currentPage.id` (#15). ✋ Approve frame and viewport.

**Phase 2…N — Sections.** `scripts/buildSection.js`, one section per call: a tokenized flex Board that
instances existing components (`references/03-layout-composition.md`, `04-component-recipes.md`).
Verify token bindings in the *next* call (#2). ✋ After each section, with its export.

**Phase N+1 — Assemble and critique.**
1. `scripts/assembleScreen.js` orders the sections.
2. `scripts/auditScreenQuality.js` checks layout coverage, token binding, on-grid spacing and naming.
   A non-empty `boardsWithoutLayout` fails the gate — fix before reporting done.
3. Scored critique (`references/05-critique-framework.md`): score the final export 1–5 on the seven
   axes; any axis below 3 → a targeted revision (max 2 passes). Emit the design-quality report
   (Markdown + JSON per `shared/report-schemas/design-quality-report.schema.json`, mirrored to the ledger).
4. Strict mode on: run `penpot-anti-slop` diagnose on the screen board and include its slop score (it
   feeds the `distinctiveness` axis). Outside a workflow, a score above 35 means presenting its top
   fixes, not declaring done.

✋ Full-screen export + scored critique: approve or iterate. Then the structured report (AGENTS.md §12).

## Rules
1. **Every container is a layout Board.** Give each Board a flex (`addFlexLayout()`) or grid
   (`addGridLayout()`) layout before appending children — screen root, sections, and every nested
   grouping (card, row, list, form field, button group). No absolute `x`/`y` for UI, no plain Groups
   for layout. State each board's sizing intent (fill / auto / fix).
2. **Fill policy (#11) — this skill's most common visual bug.** `createBoard()` is born with an opaque
   white fill. A *structural* board (section, row, wrapper) gets `fills = []`; a *surface* (screen
   background, card, sheet, button) binds a `color.bg.*` token. A leftover white wrapper shows square
   corners behind rounded children and never flips in dark mode.
3. **Tokens, not literals.** Bind color, spacing, radius and type to semantic tokens; all spacing on
   the 4px grid. No fitting token → propose one for approval, never invent a value silently.
4. **Token binding is fragile (#2).** Apply once, verify `shape.tokens` in the next call, and guard
   every apply (`shape.tokens[prop] !== tok.name`): re-applying a bound token removes the binding, and
   so does writing a literal to a bound property. `applyToken(tok, ["all"])` throws — list properties.
5. **Instance components** that exist; do not redraw them as raw shapes.
6. **Text and fonts.** Set `growType` after any `resize()` (#3). Resolve fonts by exact name —
   `penpot.fonts.all.find(f => f.name === "…")`; `findByName` is a substring search (#13b).
7. **Layout children.** Set `layoutChild.*` only after `appendChild` (#15). Size a board before filling
   it with wide children and run `clearFlip` after each section (#16, helper in
   `shared/visual-effects.md`). `await board.waitForLayoutUpdate()` before reading geometry (#17).
8. **Images** come only from user-supplied URLs: `await penpot.uploadMediaUrl(name, url)`, verified in
   the next call; otherwise a labeled placeholder (#18, `shared/visual-effects.md`).
9. **A failed call may have run (#19).** Read state before retrying; the scripts are idempotent by name.

The excuses that lead to breaking these, with their countermeasures:
`references/06-anti-rationalization.md`. When a step fails: `references/07-error-recovery.md`.

## Mode and state
Default mode **review**: geometry and layout changes always go through a checkpoint
(`shared/modes-and-policies.md`). "Looks good" approves only the phase just shown.

Ledger under `RUN_ID` (`shared/state-management.md`): `phase`, `screenBoardId`,
`sections: [{ name, id, done }]`, `styleProfile`, `skeleton`, `designQuality` (the report object), and
`antiSlop` (`pref`, `direction`, `reports[]`) when strict mode is on. The opt-in itself is file-wide
plugin data: `penpot-ai` → `prefs.antiSlop`. Resume by reading the ledger and re-reading the structure.

Naming (`shared/naming-conventions.md`): semantic HTML layer names (`header`, `main`, `section`,
`nav`, `button`); the screen Board is named for the view (`Dashboard`).

## Supporting files
- **references/** — `01-brief-analysis.md`, `02-style-profiles.md`, `03-layout-composition.md`,
  `04-component-recipes.md`, `05-critique-framework.md`, `06-anti-rationalization.md`,
  `07-error-recovery.md`. Effects, gradients and image placeholders: `shared/visual-effects.md`.
- **scripts/** (paste into `execute_code`) — `setupOrReuseSystem.js` (Phase 0, read-only),
  `createScreenFrame.js` (Phase 1), `buildSection.js` (one per section), `assembleScreen.js`,
  `auditScreenQuality.js` (Phase N+1).

**Doctrine paths.** `shared/…` and `policies/…` resolve inside this bundle in native installs (vendored by the installer); in a Claude Code plugin install they live at the plugin root — `${CLAUDE_PLUGIN_ROOT}/shared/…`, two directories up from this file.
