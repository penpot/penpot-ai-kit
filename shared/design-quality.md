# Design quality — deliberate aesthetics, by the numbers

> **Why this file exists.** Generative models converge to the statistical average of their training
> set: centered cards, one gradient, uniform gaps, three equal columns. Governance alone does not
> prevent this — a screen can be fully tokenized, on-grid, AA-contrast, semantically named, **and
> still bland**. This file is the kit's aesthetic doctrine: numeric targets instead of adjectives,
> a named-pattern vocabulary instead of improvisation, and a scored rubric so visual quality can
> gate a workflow the same way accessibility already does. Skills that create visible UI
> (`penpot-build-screen`, `penpot-build-from-code`, `penpot-component-factory`) load it before
> making aesthetic decisions and score their output against §8 before declaring done.
>
> Every number below is expressed in the kit's own scales (`shared/tokens-schema.json`): the 4px
> spacing grid (`spacing.4 … spacing.64`) and the Minor Third type scale
> (`font.size.100…900` ≈ 11, 13, 16, 19, 23, 28, 33, 40, 48px). Targets are defaults, not law —
> deviate deliberately, say why at the checkpoint, and record it in the ledger.

## 1. Style profiles — committed, with numbers

Committing to a profile only works if the profile is checkable. The adjectives live in
`penpot-build-screen/references/02-style-profiles.md`; these are the numbers behind them.

| Target | Functional / Enterprise | Modern SaaS | Editorial | Playful / Consumer |
|---|---|---|---|---|
| Density (control height) | 32–36px rows, `spacing.8` insets | 40px controls, `spacing.12–16` insets | type-led, controls secondary | 44–48px controls, `spacing.16` insets |
| Section padding (vertical) | `spacing.24–32` | `spacing.48–64` | `spacing.64` +, asymmetric | `spacing.32–48` |
| Accent budget (share of screen area) | ≤ 5% | 5–10% | ≤ 5%, often type-only | 10–15% |
| Radius family | `radius.control` (4) everywhere | `radius.control` on controls, `radius.card` (8) on surfaces | 0 or `radius.control`, used sparingly | `radius.card` +, pill buttons allowed |
| Heading scale (top of page) | `font.size.500–600` | `font.size.600–700` | `font.size.800–900` | `font.size.600–700`, weight ≥ 600 |
| Elevation | none or 1 shadow level | 1–2 soft levels, cards only | none — rules/whitespace separate | 1–2 levels, springier offsets |

One profile per screen. Mixing (SaaS hero on an enterprise table page) is the most common way a
screen stops reading as designed.

## 2. Typography craft

- **Scale contrast.** Adjacent hierarchy levels must differ by ≥ 2 scale steps **or** a weight jump
  of ≥ 200. `font.size.400` heading over `font.size.300` body reads as an accident, not hierarchy.
- **Line height by role.** Display (≥ `font.size.600`): 1.1–1.2. Headings: 1.2–1.3. Body: 1.4–1.6.
  Labels/captions: 1.2–1.3. A display line at body line-height is the single most visible type defect
  in generated screens.
- **Measure.** Body paragraphs 45–75 characters — roughly 360–620px at `font.size.300`. Never let a
  paragraph span a 1440px content area; cap the text block, not the container.
- **Tracking.** Slightly negative at display sizes (−1% to −2% of em). Positive tracking (+4–6%)
  only on all-caps labels at ≤ `font.size.200`. Default tracking on body.
- **Weights.** Maximum 3 weights per screen. Headings ≥ 500; never carry hierarchy with size alone
  when a weight step is available.
- **Casing.** Sentence case for headings, buttons, and labels. ALL-CAPS only for small eyebrow/
  overline labels (≤ `font.size.200`, tracked, muted color) — and at most one such label pattern per screen.
- **Headline length.** A hero/display headline at `font.size.800–900` carries ≤ 7 words. Longer
  message → step the size down one level or split into heading + supporting line.
- **No italic headings.** Emphasis in headings is weight or accent color, never italics.

## 3. Color craft

- **60/30/10 structure.** ~60% of the screen area is background neutral, ~30% surfaces and content
  neutrals, ≤ 10% accent (see the per-profile budget in §1). If the accent share creeps up, the
  primary action stops being findable.
- **No pure black or pure white.** Backgrounds sit near-white (L ≈ 97–99%), text near-black
  (L ≈ 15–20%). Neutrals may carry a whisper of the accent hue — that faint tint is what makes a
  palette read as chosen rather than defaulted. This lives in the token ramp
  (`penpot-foundations`), not per shape.
- **One accent, and the primary action owns it.** The single most saturated element on the screen
  is the primary action. Nothing decorative (icons, dividers, illustrations) may exceed the primary
  action's chroma.
- **Feedback colors are reserved.** `color.feedback.*` (danger/warning/success/info) appear only
  with feedback meaning — never as decoration or as a second accent.
- **Dark mode is a lightness flip, not an inversion.** Surfaces get *lighter* as they elevate in
  dark mode; accents usually need one step more lightness to hold contrast. If `modes/dark` exists,
  spot-check the screen's key tokens in both modes at the final checkpoint.

## 4. Spacing, density, grouping

- **Gap hierarchy, not uniform gaps.** A screen with `spacing.24` between everything has no
  grouping. Default ladder: `spacing.4–8` inside a control, `spacing.8–12` between related elements
  in a card, `spacing.16–24` between cards/blocks, `spacing.48–64` between sections.
- **Proximity rule.** The gap *between* groups is ≥ 2× the gap *within* a group. This is the
  cheapest, most reliable hierarchy device available — reach for it before borders or backgrounds.
- **Inset symmetry.** Horizontal padding pairs match; vertical pairs match. Asymmetric insets are an
  editorial device, used deliberately and stated.
- **Section rhythm.** One vertical padding token per section family, consistent down the screen. A
  hero may take 1.5–2× the rhythm; nothing else deviates without a reason.
- **Alignment.** Every element aligns to *something* — a column edge, a shared baseline, a grid
  track. Centered is a choice for focused/marketing moments, not the default resting place of
  every block.

## 5. Screen skeletons — pick a named structure first

Structure before styling. At Phase 0, name the skeleton out loud at the checkpoint — picking on the
page, not in your head, is what prevents every screen from collapsing into the same shape.

**Shells** (app screens):
- **Sidebar shell** — fixed side nav (200–280px) + content column. Dense products, many destinations.
- **Topbar shell** — horizontal nav only, full-width content. Few destinations, content-first.
- **List + detail split** — master list (320–400px) + detail pane. Inboxes, CRMs, file browsers.
- **Focused shell** — single centered column (400–560px), no nav chrome. Auth, checkout, onboarding steps.
- **Canvas shell** — full-bleed work surface + floating panels/toolbars. Editors and tools.

**Content patterns** (inside the shell):
- **Dashboard** — KPI row (3–4 stats) → one primary visualization (≥ 2× the height of the KPI row)
  → secondary grid. Never a uniform grid of equal tiles: hierarchy needs a dominant element.
- **Settings / form page** — section groups of label+control rows, one column, `spacing.32–48`
  between groups, sticky or end-anchored save action.
- **Table page** — toolbar (title + primary action) → filters → table → pagination. Row height and
  cell insets from the density profile (§1).
- **Landing** — hero → proof/features → detail sections → closing CTA. Vary the hero: type-led
  (headline + CTA, no media), split (copy left, media right — or mirrored), or product-first
  (screenshot dominant). Alternate section alignment down the page; three identical centered
  sections in a row reads as templated.
- **Empty / loading / error states** — every list, table, and dashboard pattern ships its empty
  state: what this is + why it's empty + one action. Not an afterthought — it is the first render
  every new user sees.

**Variety rule.** Consecutive screens built in the same session or file must not repeat all three
of: skeleton, hero/dominant-element treatment, and accent placement. Differ on at least one axis,
state which, and record the picks in the run ledger (`skeleton`, `styleProfile`) so the next run
can check.

## 6. Content honesty & microcopy

- **Never invent evidence.** No fabricated metrics ("+47% conversion"), user counts, testimonials,
  press logos, or ratings. Real data from the brief, or a clearly labeled placeholder
  (`—` / "metric TBD") — or a pattern that doesn't need the number.
- **Realistic domain content.** Populate with content that could ship for *this* product — no
  "Lorem ipsum", no "John Doe", no "Item 1/2/3" left at a checkpoint. Placeholder text that must
  remain is labeled as such.
- **Buttons are verb-first**, ≤ 3 words, specific: "Create project", "Send invite" — not "Submit",
  "Click here", "Go".
- **Empty states**: what this is + why it's empty + one action to fill it.
- **Errors**: what happened + how to fix it, in the user's vocabulary, no blame, no codes-only.
- **Headings state a benefit or a fact**, not a category ("Track every deploy" beats "Features").

## 7. Named tells — generic-output patterns to refuse

The audit vocabulary: report these by name. Each row is *tell → why it reads generated → fix*.

These are the **always-on core** — craft, not style, so they apply whether or not the user opted in
to strict mode. When the user opts in (`prefs.antiSlop === "on"`, `shared/anti-slop.md` §0), the full
generic-AI taxonomy in `shared/anti-slop.md` §1 applies on top (violet gradients, glows, glass, pill
badges, icon tiles, emoji icons, default/trend typefaces, buzzwords…) and `penpot-anti-slop` scores
it. Overlaps keep one name each: *three equal cards* ↔ `identical-triplet`, *gradient hero* ↔
`violet-gradient` + `centered-hero-stack`, *invented stats/logos* ↔ `round-number-stats` +
`generic-logo-strip`.

| Tell | Why it reads generated | Fix |
|---|---|---|
| Three equal cards centered under a centered heading | The single most common training-set layout | Unequal spans, an asymmetric pair, or a different pattern (§5) |
| Gradient hero on white with two centered buttons | Default landing-page attractor | Type-led or split hero; accent held for the primary CTA |
| Card-in-card-in-card | Nesting as decoration, not grouping | One surface level; group with spacing (§4), not more borders |
| Uniform gap everywhere | No proximity hierarchy | Apply the gap ladder (§4) |
| Pure `#000` / `#FFF` as text/background | Defaulted, not chosen; harsh at both ends | Near-black / near-white neutrals from the ramp (§3) |
| Every block centered | Center is the no-decision alignment | Align to a column grid; center only focused moments |
| Italic display headings | Emphasis done the lazy way | Weight or accent color (§2) |
| Invented stats / logos / testimonials | Fabricated evidence | Honest-content rule (§6) |
| Mixed radius per element | No family discipline | One radius family per profile (§1) |
| Every card elevated with the same shadow | Elevation without meaning | Elevation ladder: at most 2 levels, meaning-bearing |
| Accent on icons, borders, charts *and* CTA | Accent budget blown; CTA lost | Re-apply the budget (§1/§3); primary action owns the accent |
| Equal-sized tiles across a whole dashboard | No dominant element | One primary visualization ≥ 2× (§5) |

## 8. Scoring — how quality is measured

After the assembled screen passes the structural gate and the visual self-review, score the export
1–5 on seven axes. Anchors: **1** = the tell is the design; **3** = competent but interchangeable —
nothing would identify this product; **5** = deliberate, distinctive, and consistent — every choice
traceable to profile + skeleton + brief.

| Axis | The question |
|---|---|
| `hierarchy` | Does the eye land on the user's goal first? Is exactly one action primary? |
| `composition` | Named skeleton executed with a dominant element and real alignment? |
| `typography` | §2 held — scale contrast, line heights, measure, casing? |
| `color` | §3 held — budget, neutrals, accent ownership, reserved feedback colors? |
| `spacing` | §4 held — gap ladder, proximity rule, section rhythm? |
| `content` | §6 held — honest, realistic, verb-first, states covered? |
| `distinctiveness` | Would this screen be recognizable next to the average output for the same brief? Zero §7 tells? With strict mode on, cite the slop score (`shared/anti-slop.md` §3) — a score > 35 caps this axis at 2. |

**Procedure.** Score against the *export image*, not the intention — every score cites evidence
visible in the export or the shape tree. Any axis **< 3** triggers a targeted revision pass (max 2,
mirroring `shared/visual-self-review.md`), then re-score. Still < 3 after 2 passes? Stop and
present the export with the weak axes named — never silently accept, never round a 2 up to a 3.

**Output.** Emit both: a short Markdown critique (what works / what's weak / concrete fixes) and a
JSON object matching `shared/report-schemas/design-quality-report.schema.json`. The derived field
`belowThreshold` (count of axes scoring < 3) is what workflow branch conditions read. Findings use
stable ids (`dq-<axis>-NN`) so loop iterations diff cleanly.

## Anti-rationalization

| Excuse | Why it's wrong | Countermeasure (halt) |
|---|---|---|
| "It's tokenized and AA — it's done." | Governance ≠ design; compliant screens can be bland. | Score §8; any axis < 3 means it is not done. |
| "The numbers are guidelines, I'll skip stating deviations." | Silent deviation is indistinguishable from drift. | Deviations are stated at the checkpoint and recorded in the ledger, or reverted. |
| "Scoring myself 3 everywhere is safe." | A flat self-score is a non-answer that dodges revision. | Every score cites visible evidence; a 3 without evidence of *competence* is a 2. |
| "This tell is fine here, it's a common pattern." | Common is the problem — §7 exists because these read as generated. | Name the tell in the report and fix it, or get the user's explicit OK to keep it. |
