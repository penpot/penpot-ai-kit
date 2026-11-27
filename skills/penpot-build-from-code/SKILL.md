---
name: penpot-build-from-code
description: "Translate an existing application page, view, or component code into a Penpot screen that is bound to the existing design system — mapping code styles onto semantic tokens and reusing library components instead of raw shapes. Use when the user has real code/markup and wants it reconstructed in Penpot, section by section, on-system. Triggers: 'build this in Penpot from code', 'turn this React/HTML/CSS into a Penpot screen', 'recreate this view in Penpot', 'port this page to Penpot', 'translate this component to Penpot bound to our tokens', 'code to Penpot'."
disable-model-invocation: false
version: 0.4.0
audiences: [design-engineer, product-designer]
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
  - shared/visual-effects.md
---

# penpot-build-from-code — app code to an on-system Penpot screen

Take an existing application artifact — JSX/TSX, HTML, Vue/Svelte templates, CSS/Tailwind, a
styled-components tree — and rebuild it as an **editable Penpot screen bound to the file's design
system**. Work as a **senior design engineer for whom the design system is the single source of
truth**: a code-derived `#0066FF` is not a fill, it is a lookup into the token set; a `<Button>` is an
instance of the library `Button`, not a rounded rectangle.

**The one rule: never one-shot a screen, and never hardcode a value a token already expresses.**
Discover the system first, then build one section per `execute_code` call, resolving every fill,
spacing, radius and type value against the discovered tokens. No match → **propose** a token and stop;
do not invent it.

Tool surface: `shared/penpot-mcp-tool-reference.md`. API traps: `shared/plugin-api-gotchas.md` (the
`#n` below). Verify any signature you are unsure of with `penpot_api_info`.

## Brief contract
- **Context** — the product and surface the code comes from, who uses it, the view it represents.
- **Objective** — e.g. "rebuild `<SettingsPage>` as an editable board bound to the `semantic` set,
  reusing `Button`, `InputField` and `Card`".
- **Inputs** — the code (components, CSS/Tailwind config, any token export), the target page, the
  discovered tokens and components.
- **Constraints** — no raw hex; no off-grid spacing; no reinvented components; no `detach()` without
  approval; semantic tokens over primitives; viewport width.
- **Acceptance Criteria** — ≥ 95% of color / spacing / radius / type values bound to tokens
  (`validateScreen.js`); zero unreported raw values; every part with a matching library component is
  an **instance**; all spacing on the 4px grid; semantic layer names.

## Workflow
Before every ✋ checkpoint that shows visual work, run the export → look → fix loop of
`shared/visual-self-review.md` (max 2 self-fixes).

**Phase 0 — Discovery (read-only).** `high_level_overview`, then `scripts/inspectDesignSystem.js`:
every token (`name`, `type`, `resolvedValue`) and library component (name, id, variant axes), kept as
plain data in `storage.run.ds` — a value → token reverse index and a component-by-role catalog
(`references/01-discovery.md`). Check `penpot.library.connected` too: the system may live in a
connected library. Parse the code into a **section outline** and a **style inventory** in which every
distinct value is matched to a token or flagged `UNMAPPED`.
✋ Show token / component coverage and the UNMAPPED list; ask which become proposed tokens and which
are documented exceptions.

**Phase 1 — Screen wrapper.** `scripts/createScreenWrapper.js` (idempotent by name): a viewport-sized
flex column Board with its background, gap and padding bound to tokens, and the `RUN_ID` ledger.
✋ Export the empty board; confirm size and orientation.

**Phase 2 — Sections, one per call.** `scripts/buildSection.js` for one section from its code fragment
(`references/02-component-assembly.md`, `03-token-binding.md`, `04-incremental-transform.md`):
`component.instance()` for every part with a catalog match, raw shapes only for bespoke parts, every
value bound with `applyToken`. In a **separate, later call** read `shape.tokens` to confirm the
bindings; then export the section.
✋ Show the section; approval covers this section only — name the next one before continuing.

**Phase 3 — Validate and report.** `scripts/validateScreen.js`: token coverage %, raw values, structure
sanity (layouts set, no auto-named layers, instances vs shapes). Then the structured report
(AGENTS.md §12). ✋ Coverage and remaining gaps; sign-off.

## Rules
1. **Every value resolves to a token before it is applied.** Matched → `applyToken`. Unmatched → add it
   to `ledger.proposedTokens` (name, value, tier) and stop for approval; never write the raw value, and
   never add a literal "as a fallback" because a read-back looked empty.
2. **Token binding (#2).** The binding is not readable in the call that applied it — verify
   `shape.tokens` in a later call. Guard every apply (`shape.tokens[prop] !== tok.name`): re-applying a
   bound token removes the binding, and so does a literal write to a bound property.
3. **Spacing is on the 4px grid.** Tailwind `p-5` (20px) maps to the spacing token for 20, not to a
   literal; an off-grid code value is rounded to the nearest grid token and reported.
4. **Semantic tokens over primitives**, so theming works; name proposed tokens after their intent in
   the code (`color.action.primary.bg`, not `color.blue.500`).
5. **A catalog match is an instance.** Set its text and variants on the instance —
   `switchVariant(pos, value)` takes the property *index* (#9). No `detach()` without approval.
6. **One section per mutating call**; idempotent by name. A failed call may have run (#19): read the
   state first — `buildSection.js` returns `skippedNodes: true` instead of duplicating children.
7. **Layout.** Every container is a flex/grid Board; set `layoutChild.*` only after `appendChild`
   (#15); run the `clearFlip` sweep after sections that use fill sizing (#16); structural boards get
   `fills = []`, surfaces a bound token (#11).
8. **Text and fonts.** `growType` after any `resize()` (#3); exact font match with
   `penpot.fonts.all.find(f => f.name === "…")` (#13b).
9. **Names:** screen `screen-<view>`; sections by semantic role (`header`, `nav`, `card-grid`);
   instances keep their component name. Never `Rectangle 12`.

More traps with code-translation examples: `references/05-anti-rationalization.md`. Failures and
fixes: `references/06-error-recovery.md`.

## Mode and state
Mode **review** (`shared/modes-and-policies.md`). Safe set: semantic renaming of layers it created,
and swapping a raw value for a token whose resolved value is exactly equal. Always reviewed: the
screen board and any geometry, instancing or restructuring components, any proposed token, `detach()`,
and any token match that is a judgement call.

Ledger (`shared/state-management.md`, namespace `penpot-ai`, `RUN_ID` such as `bfc-2026-06-05-a`):
`{ runId, phase, boardId, created, sectionsBuilt, proposedTokens, exceptions, pendingReview }`;
`storage.run.ds` caches the design-system map. Resume: read the ledger, re-run
`inspectDesignSystem.js`, read the board's structure to see which sections exist, continue.

Related skills: `penpot-build-screen` (from a brief), `penpot-foundations` (when there are no tokens to
map onto), `penpot-audit-accessibility` (after the build).

## Supporting files
- **references/** — `01-discovery.md`, `02-component-assembly.md`, `03-token-binding.md`,
  `04-incremental-transform.md`, `05-anti-rationalization.md`, `06-error-recovery.md`.
- **scripts/** (paste into `execute_code`) — `inspectDesignSystem.js` (Phase 0, read-only),
  `createScreenWrapper.js` (Phase 1), `buildSection.js` (one per section), `validateScreen.js`
  (Phase 3, read-only).

**Doctrine paths.** `shared/…` and `policies/…` resolve inside this bundle in native installs (vendored by the installer); in a Claude Code plugin install they live at the plugin root — `${CLAUDE_PLUGIN_ROOT}/shared/…`, two directories up from this file.
