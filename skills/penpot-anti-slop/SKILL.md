---
name: penpot-anti-slop
description: "Opt-in layer that keeps Penpot designs from looking generically AI-generated: a direction step before building, a scored 0–100 slop check of a screen or deck (tree probes + visual review), and reviewed fixes. Triggers: 'avoid the AI look', 'does this look AI-generated', 'anti-slop check', 'make it feel less generic', 'evitar estética IA', '¿parece hecho por IA?'."
disable-model-invocation: false
version: 0.2.0
audiences: [product-designer, design-system]
mode-default: suggest
requires:
  - shared/penpot-mcp-tool-reference.md
  - shared/plugin-api-gotchas.md
  - shared/anti-slop.md
  - shared/anti-slop/lists.json
  - shared/design-quality.md
  - shared/visual-self-review.md
  - shared/visual-effects.md
  - shared/naming-conventions.md
  - shared/state-management.md
  - shared/modes-and-policies.md
  - shared/report-schemas/slop-report.schema.json
---

# penpot-anti-slop — design past the generic-AI look

The **opt-in strict layer** over `shared/design-quality.md`. It knows the patterns that make output
read as AI-generated (`shared/anti-slop.md` §1), steers a build away from them before it starts, and
scores a finished screen or deck from 0 (genuine) to 100 (AI default). Work as a **senior art director
who can tell a decision from a default — and says which is which**.

| Mode | Invoked by | Does |
|---|---|---|
| **direction** | Phase 0 of `penpot-build-screen` / `penpot-build-deck` when `prefs.antiSlop === "on"` | names the defaults for this brief, replaces each with a brief-driven reason, proposes a typeface, lists the tells to refuse |
| **diagnose** | the `slop` step of `brief-to-screen` / `brief-to-deck`, or a user asking "does this look AI-made?" | tree probes → describe-then-judge visual review → slop score and report |
| **treat** | the user, after a failing diagnosis | proposes the top fixes as concrete edits and applies them with review, one per call |

**The one rule: measure before judging, and never trade one default for another.** Whatever can be
measured on the shape tree is probed and outranks the visual opinion; the visual pass describes before
it judges. A "fix" that lands on the fashionable anti-AI look (cream + italic serif accent + sage, or
one house style reused everywhere) is still a default — every replacement needs a reason from the brief.

Tool surface: `shared/penpot-mcp-tool-reference.md`. API traps: `shared/plugin-api-gotchas.md` (the
`#n` below).

## Brief contract
- **Context** — product, audience and brief behind the design; whether strict mode was opted in.
- **Objective** — "steer the build away from the generic-AI look" (direction), "score how generic
  board X reads" (diagnose), or "apply fix N to board X" (treat).
- **Inputs** — the board or deck page, the brief, active tokens and type tokens, the ledger's earlier
  `antiSlop.direction` picks.
- **Constraints** — read-only in direction and diagnose; system tokens and explicit user requests
  outrank the taxonomy (`shared/anti-slop.md` §5); no invented replacement evidence; fixes are
  Apply-with-review.
- **Acceptance Criteria** — every counted finding cites a probe measurement or a Pass A description
  line; the score comes from `scripts/slopScore.js`; **pass = score ≤ 35** (target ≤ 15); the report
  JSON validates against `shared/report-schemas/slop-report.schema.json`.

## Workflow
**Phase 0 — Opt-in and scope (read-only).** `high_level_overview`; `scripts/antiSlopPrefs.js`
(`ACTION="read"`). Invoked from a build skill with the preference `unset` → ask the question in
`shared/anti-slop.md` §0 in the user's language, then store the answer (`ACTION="set"`). A user who
asks for a diagnosis directly has opted in for that diagnosis — do not ask.
`penpotUtils.shapeStructure(root, 2)` to confirm the scope: one screen board, or a deck page.

**Direction** (inside a build skill's Phase 0). `references/02-direction-playbook.md`: defaults named →
replacements with reasons → typeface (`scripts/listFontCandidates.js`, only when the file has no type
tokens) → counter-default check against the ledger → the checkpoint block. Hand the "will refuse" keys
back as Constraints. The build skill's own Phase 0 checkpoint shows the block.

**Diagnose 1 — Probes.** One call with `scripts/scanSlopProbes.js` (`ROOT_ID`, `MODE`);
`references/01-penpot-mapping.md` says what each key measures. Mark what the user explicitly asked for
as `accepted` (a brief-requested dark theme is `accepted` for `dark-neon-default`).

**Diagnose 2 — Visual review.** `export_shape` the board (decks: batches of at most 4 slides) and
follow `references/03-exam-protocol.md`: Pass A (describe, written out) → Pass B (judge the review
keys, citing Pass A) → template judgement → authenticity signals. Decks: `references/04-deck-tells.md`.

**Diagnose 3 — Score and report.** `scripts/slopScore.js` over `storage.slop`. Markdown report (score,
band, counted tells with evidence, unsure tells, inherited / accepted, signals, top 3 fixes) plus the
JSON; mirror both to the ledger. ✋ Present export + report; offer treat for the top fixes.

**Treat** (opt-in per fix). One fix per call, each a concrete edit naming the token or pattern it
moves to ("replace the hero gradient with `color.bg.default`; left-align headline and subheading;
remove `pill-badge`"). Run the export → look loop of `shared/visual-self-review.md`, then ✋ approve
each. After the last approved fix, re-run Diagnose 1–3 and report the before/after **score and
points**: the score saturates at 15 points, so on a very generic design the first fixes move the
points long before they move the score (live run: 29.7 → 24.7 points, 100 → 94).

## Rules
1. **Opt-in only.** Strict mode runs when `prefs.antiSlop === "on"` or the user asked for a diagnosis.
   Read the stored preference first and ask at most once per file — it is the user's style decision.
2. **Probes before review**, every diagnosis; a probe result for a key replaces any review answer for
   it. Self-review is lenient; the tree is not.
3. **Describe, then judge.** Pass A is written before Pass B, and Pass B cites it.
4. **Only `present` findings with p ≥ 0.65 count.** `unsure`, `inherited` and `accepted` are reported,
   never counted.
5. **The system outranks the taxonomy.** A typeface or color that comes from the file's tokens is
   `inherited`: report it and propose a token change through `penpot-foundations`; do not swap it.
6. **Never replace removed proof with invented proof.** Fake stats, logos and quotes become a labeled
   placeholder or a pattern that needs no number.
7. **Every fix is Apply-with-review, one per call** — geometry, color, content and fonts alike; none is
   in the safe set. New type tokens are proposed, not created here.
8. **Treat edits and the API:** replace whole `fills` / `shadows` arrays (#1); a removed gradient lands
   on a token-bound surface or `[]`, never on literal white (#11) — with no color tokens in the file,
   on a literal recorded as a ledger exception plus a token proposal; verify a new binding in the next
   call and never re-apply a bound token (#2); resolve fonts by exact name (#13b).
9. **Record the direction picks;** consecutive runs differ on at least one of layout, accent role and
   typeface.
10. **Report the lists version** used, and flag lists older than 6 months as a governance note.

Reading the tree: text `fontFamily`, `fontStyle` and `align` return `"mixed"` when ranges differ (the
serif-accent signal) and `fontSize` is a string; `shape.blur` / `board.backgroundBlur` are
`{ value, hidden }`; gradients live in `fills[].fillColorGradient.stops[]`; strokes are uniform per
shape, so a one-edge accent is always a thin child rectangle. Region detection relies on semantic
board names (`hero`, `features`, `pricing`, `footer`) — when most regions come back as `content`,
suggest `penpot-rename-layers`.

## State
```
storage.slop = {            // plain data only
  listsVersion, scopeId,
  findings: [{ key, weight, p, source: "probe" | "review", status?, region, shapeIds, evidence, fix? }],
  template: { value: 0..4, confidence },
  signals:  [{ key, present, evidence }],
  result:   { score, band, pass, points, findings, topFixes }     // written by slopScore.js
}
ledger.antiSlop = { pref: "on" | "off", direction: { defaults, picks, typefaceProposal, refused }, reports: […] }
```
Score formula, bands and the gate: `shared/anti-slop.md` §3. Workflows branch on `slop.score` and
`slop.pass`. Finding ids are `slop-<key>-NN`, stable across iterations. The preference itself lives
file-wide in plugin data `penpot-ai` → `prefs.antiSlop`, independent of any run. On resume, re-run the
probe (cheap and idempotent) rather than trusting cached findings.

Mode **suggest** (`shared/modes-and-policies.md`, `policies/modes.json`): direction and diagnose are
read-only.

## Supporting files
- **references/** — `01-penpot-mapping.md` (probes), `02-direction-playbook.md` (direction),
  `03-exam-protocol.md` (visual review), `04-deck-tells.md` (decks),
  `05-anti-rationalization.md` (excuses and countermeasures).
- **scripts/** — `antiSlopPrefs.js` (opt-in read / store), `scanSlopProbes.js` (deterministic probes),
  `slopScore.js` (pure scoring, unit-tested by `scripts/dev/test-anti-slop.mjs`),
  `listFontCandidates.js` (typeface shortlist).
- **shared/** — `anti-slop.md` (taxonomy, signals, score, direction, precedence),
  `anti-slop/lists.json` (fonts, buzzwords EN/ES, placeholders, patterns — versioned).

**Doctrine paths.** `shared/…` and `policies/…` resolve inside this bundle in native installs (vendored by the installer); in a Claude Code plugin install they live at the plugin root — `${CLAUDE_PLUGIN_ROOT}/shared/…`, two directories up from this file.
