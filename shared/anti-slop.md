# Anti-slop — designing past the generic-AI look

> **Why this file exists.** Asked for "a landing page" or "a pitch deck" with no further constraint,
> a generative model reaches for the choices it has seen most often: an indigo-to-violet gradient, a
> centered headline under a "New" pill, three identical icon cards, Inter, a row of round-number
> stats. Each choice is defensible on its own; together they are the recognizable *AI look* —
> interchangeable output that tells the viewer nobody decided anything. `shared/design-quality.md`
> already sets the craft baseline (hierarchy, type, color, spacing) and refuses the worst tells.
> This file is the **opt-in strict layer** on top of it: a full taxonomy of generic-AI patterns, how
> to detect each one in a Penpot file, what "healthy" looks like instead, and a 0–100 **slop score**
> that can gate a workflow.
>
> It is loaded by `penpot-anti-slop` (direction / diagnose / treat) and, **only when the user opted
> in**, by `penpot-build-screen` and `penpot-build-deck`. Lists that age (fonts, buzzwords) live in
> `shared/anti-slop/lists.json` — data, versioned and dated, never inlined into prose.

## 0. The opt-in (ask once, remember it)

Strict mode is the user's choice, not a default. The protocol:

1. **Where.** At the Phase 0 checkpoint of `penpot-build-screen` and `penpot-build-deck` (the
   brief-to-screen / brief-to-deck workflows inherit it). Not in `penpot-router` — the router only
   carries a preference the user already stated, so the question is never asked twice.
2. **Skip the question when** the brief already answers it (the "Avoid the AI look" field in
   `prompts/design-brief.md` / `prompts/deck-brief.md`), the user said so in the conversation, or the
   file already stores a preference (step 4).
3. **Ask in the user's language**, as one short question with three options. Canonical wording:
   - EN — *"Do you want the design to avoid the typical generic-AI look (violet gradients, centered
     hero with a pill badge, three identical cards, emoji icons, default fonts…) so it feels more
     genuine and specific to your product?"* → **Yes (recommended)** / **No, conventional patterns
     are fine** / **Explain what changes**
   - ES — *"¿Quieres que el diseño evite la estética típica generada por IA (degradados violetas,
     hero centrado con badge, tres tarjetas idénticas, emojis como iconos, fuentes por defecto…)
     para que se sienta más genuino y propio de tu producto?"* → **Sí (recomendado)** / **No, me
     valen patrones convencionales** / **Explícame qué cambia**
   - "Explain" → three lines: what strict mode adds (§1 taxonomy refused, a direction step before
     styling, a scored check after building), what it does not change (tokens, components, AA), and
     that it can be switched off at any time. Then ask again.
4. **Persist it** in the file so a new session does not re-ask:
   `penpot.currentFile.setSharedPluginData("penpot-ai", "prefs.antiSlop", "on" | "off")` and
   mirror to `storage.prefs.antiSlop`. Helper: `skills/penpot-anti-slop/scripts/antiSlopPrefs.js`.
5. **Toggling.** "Turn off / desactiva el modo anti-IA" (or the reverse) updates the stored value and
   is acknowledged in one line; it never triggers a rebuild by itself.

**What "No" means.** The baseline in `shared/design-quality.md` (§6 honest content, §7 core tells,
§8 scoring) stays on — it is craft, not style. "No" only disables this file's strict taxonomy, the
direction step (§4) and the slop-score gate (§3).

## 1. The taxonomy

Each tell has a stable key, a weight (1 = mild habit, 3 = signature tell), where it is looked for,
how it is **detected** (`probe` = deterministic code over the shape tree, p = 1 when found;
`review` = a yes/no judgement on the exported image, with a probability), the **healthy** state
(what the criterion looks for when the answer is "no") and the **fix**.

Region kinds used by `appliesTo`: `nav`, `hero`, `proof` (logos/testimonials), `features`,
`pricing`, `stats`, `steps`, `cta`, `footer`, `content`, `slide` (any deck slide), `any`.

### 1a. Surface & effects

| Key | W | Applies to | Detect | Present when… | Healthy when… | Fix |
|---|---|---|---|---|---|---|
| `violet-gradient` | 3 | any | probe | a gradient fill/stroke has a stop whose hue is indigo, violet, purple or magenta (232°–320°, chroma ≥ 0.11), on a background, button or large shape | no gradients, or gradients without those hues | One solid surface token. If the brand truly is violet, a flat violet held to the primary action. |
| `gradient-headline` | 2 | hero, cta, features, slide | probe | a text shape whose fill is a gradient | every word is one solid color | One solid text token; let size and weight carry the emphasis. |
| `decorative-glow` | 2 | any | probe + review | a layer blur on a shape, a radial gradient fading to transparent, or a drop shadow whose color has chroma (not a neutral) | no blurred blobs, halos or colored shadows | Delete it. Depth, if needed, is one neutral elevation level on a surface that means something. |
| `frosted-glass` | 2 | any | probe | a `backgroundBlur` with a semi-transparent fill (opacity < 1) | surfaces are opaque | Opaque surface token; contrast becomes predictable again. |
| `faint-grid-backdrop` | 1 | hero, slide | probe + review | a repeating grid/dot/line pattern behind the hero (≥ 6 thin parallel lines or a pattern image) | the backdrop is a plain surface or meaningful imagery | Remove the lattice; if structure must show, draw one real rule that aligns content. |
| `dark-neon-default` | 2 | page | probe | the root surface is near-black (L < 12 %) **and** the accent hue is violet/cyan/neon green/magenta — without the brief asking for dark | the brief asked for dark, or the page is light / dark with a restrained accent | Start light unless the product context demands dark; dark is a mode, not a personality. |

### 1b. Iconography & ornaments

| Key | W | Applies to | Detect | Present when… | Healthy when… | Fix |
|---|---|---|---|---|---|---|
| `sparkle-ai-marker` | 1 | any | probe | a ✨ / ✦ / ⭐ character, or an icon layer named `sparkle`/`stars`/`magic`, used to flag "AI" | no sparkle marker | Say what the feature does in words. |
| `emoji-as-icon` | 1 | any, slide | probe | emoji characters at the start of list items, headings or inside icon slots | icons come from the system icon set, or there are words | Use the system icon set, or drop the icon and keep the word. |
| `icon-in-tile-cards` | 2 | features, slide | probe + review | ≥ 3 sibling cards each opening with a small (24–64 px) rounded square/circle holding a line icon | cards lead with content, a product fragment, or a number that matters | Show the feature (a cropped UI fragment, a real example) instead of a symbol in a box. |
| `abstract-3d-art` | 1 | hero, features, slide | review | the main imagery is floating 3D shapes, blobs, spheres or generic gradient art | imagery is the product, real photography/illustration supplied by the user, or none | A labeled product-UI placeholder (`shared/visual-effects.md` §5) beats decorative art. |

### 1c. Composition

| Key | W | Applies to | Detect | Present when… | Healthy when… | Fix |
|---|---|---|---|---|---|---|
| `centered-hero-stack` | 2 | hero, slide (cover) | probe | the hero's headline and subheading are center-aligned **and** its button row is centered | the hero is left-aligned, split, or type-led with an asymmetric anchor | Left-align to the grid or split copy/media; center only a genuinely focused moment. |
| `pill-above-headline` | 2 | hero | probe | a small fully-rounded board (radius ≥ height/2, height ≤ 40 px) sits directly above the largest text of the hero | no badge above the headline | If it is news, it belongs in the headline; otherwise delete it. |
| `serif-accent-word` | 1 | hero, cta, slide | probe | a headline text with `fontFamily` or `fontStyle` = `"mixed"` where one range is an italic or serif face inside a sans headline | one typeface and style per headline | Commit to one face for the headline; emphasis by weight or color. |
| `identical-triplet` | 2 | features, pricing, proof, slide | probe | a flex/grid container with exactly 3 children of equal size (±2 px) and the same child structure | groups of 2, 4+, or unequal spans; or a different pattern | Vary the rhythm: a dominant item + supporting pair, a list, a table, a comparison. |
| `bento-grid` | 2 | features, content, slide | probe + review | a grid of ≥ 4 rounded tiles of mixed spans, each holding one feature | one idea per section, laid out for that idea | Give the strongest idea its own section; list the rest. |
| `single-edge-accent` | 1 | any | probe | a card/callout containing a thin (≤ 4 px) accent-colored rect hugging exactly one edge | emphasis is spent on one element, not stamped on every card | Remove the stripe; if one item matters more, give it a different surface or position. |
| `numbered-steps-default` | 1 | steps, features, slide | probe | sibling texts "1/2/3", "01/02/03" or "Step 1…" heading a sequence of ≥ 3 equal blocks | the product shows the sequence happening, or there is no sequence | Show the steps as real screens/states, or use a plain ordered list. |

### 1d. Proof & content

| Key | W | Applies to | Detect | Present when… | Healthy when… | Fix |
|---|---|---|---|---|---|---|
| `generic-logo-strip` | 1 | proof, hero | review | a "trusted by" row of ≥ 4 greyed, low-opacity or placeholder logos | no strip, or real logos the user supplied | One real customer with a name and a specific quote — or nothing. Never invent (`design-quality.md` §6). |
| `round-number-stats` | 1 | stats, hero, slide | probe | ≥ 3 sibling texts matching round-number patterns ("10k+", "99.9%", "5x", "24/7") | one number with a source and context, or none | Keep the one real metric from the brief with its source; drop the rest. |
| `vague-headline` | 2 | page | review | the hero headline does not say what the product does or for whom ("Build the future", "Unlock your potential") | the headline names the job and the audience in concrete words | Rewrite: product + who + outcome, ≤ 7 words at display size. |
| `slogan-triads` | 1 | page | probe | ≥ 2 three-beat slogans ("Fast. Simple. Powerful." / "Build, ship and scale") | at most one | Cut to the one adjective that is true and specific. |
| `not-x-but-y` | 1 | page | probe | a "not just X, it's Y" / "no es solo X, es Y" construction | none | State what it is; skip what it isn't. |
| `em-dash-heavy` | 1 | page | probe | ≥ 3 em dashes **and** ≥ 0.5 per 100 words across the design's text | dashes are rare | Commas and full stops. |
| `buzzword-density` | 2 | page | probe | ≥ 3 distinct terms from the buzzword list (EN + ES) | fewer than 3 | Replace each buzzword with what actually happens. |
| `placeholder-residue` | 3 | page | probe | any placeholder from the list ("Lorem ipsum", "Acme", "John Doe", "Fulano", "Empresa S.A.") left in visible text | none, or explicitly labeled placeholders (`IMAGE — …`, `metric TBD`) | Real domain content from the brief, or a labeled placeholder. |

### 1e. Typography

| Key | W | Applies to | Detect | Present when… | Healthy when… | Fix |
|---|---|---|---|---|---|---|
| `default-typeface` | 2 | page | probe | the primary (most-used) text family is in `lists.json → fonts.default` | the primary family is a deliberate choice | Propose a type token with a face chosen for the brief (§4.3). **If the family comes from the file's own type tokens, report it as `inherited` and propose — never swap.** |
| `trend-typeface` | 1 | page | probe | any family in `lists.json → fonts.trend` | none of the trend list | Same as above: a face chosen for this product, not for this year. |

Deck-specific readings of the same keys (cover slides, "Thank you" closers, agenda boilerplate)
are in `skills/penpot-anti-slop/references/04-deck-tells.md`.

## 2. Authenticity signals (they lower the score)

Positive evidence that someone decided. Each present signal subtracts **6** from the score.

| Key | Detect | Present when… |
|---|---|---|
| `chosen-typeface` | probe | the primary family is in neither font list |
| `product-visible` | review | the design shows the product's real interface (or a labeled placeholder for it) rather than abstract art |
| `specific-copy` | review | text contains concrete specifics: named use cases, precise figures with context, real names supplied by the brief |
| `own-structure` | review | the section sequence departs clearly from hero → logos → 3 features → testimonials → pricing → CTA |
| `committed-motif` | review | one recurring visual idea tied to the brief (a crop, a rule system, a color role) runs through the design |

## 3. Scoring — the slop score (0–100, lower is better)

1. **Bands for `review` answers.** p ≥ 0.65 = *present* (counts). 0.35 ≤ p < 0.65 = *unsure*
   (reported, never counted). p < 0.35 = *absent*. `probe` findings are p = 1 when found.
   A region-level tell takes the **highest** p across the regions it was checked in.
   A tell found by both probe and review keeps the probe result. Findings marked `inherited` (they
   come from the file's own tokens/components) or `accepted` (the user asked for them) are reported
   but **never counted** — the build loop cannot fix them without a human decision.
2. **Points** = Σ weight × p over counted tells.
3. **Tell share** `s = min(1, points / 15)` — fifteen weighted points is a fully generic design.
4. **Template judgement** `t` = a 0–4 answer to *"How closely does this design follow the stock
   template for its type?"* (0 = unmistakably its own … 4 = indistinguishable from a starter),
   counted only when the reviewer's confidence ≥ 0.5.
5. **Score** = `round(100 × (0.75·s + 0.25·t/4)) − 6 × signals`, or `round(100 × s) − 6 × signals`
   when `t` was not counted. Clamp to 0–100. Reference implementation:
   `skills/penpot-anti-slop/scripts/slopScore.js` (pure; unit-tested by `scripts/dev/test-anti-slop.mjs`).
6. **Bands**

| Score | Band | Gate |
|---|---|---|
| 0–15 | `genuine` | target |
| 16–35 | `mostly-genuine` | **pass** (workflow gate: score ≤ 35) |
| 36–55 | `generic` | fail → treat |
| 56–75 | `templated` | fail → treat |
| 76–100 | `ai-default` | fail → treat |

7. **Fixes.** The three counted tells with the highest weight × p (ties: taxonomy order) supply the
   fix list. Zero counted tells → "No fixes needed."
8. **Feeding `design-quality`.** When strict mode is on, the `distinctiveness` axis
   (`design-quality.md` §8) cites the slop score as evidence, and a score > 35 caps it at 2.

## 4. Direction — preventing the look before building it

Detection after the fact is the fallback. The cheaper move is deciding differently up front. In
strict mode, Phase 0 of the build skills runs this step and shows it at the checkpoint.

### 4.1 Name the defaults out loud
For *this* brief, list the five choices you would make with no further thought — layout,
hero treatment, accent, typeface, imagery. Writing them down is what makes them avoidable.

### 4.2 Replace each with a reason from the brief
Every replacement cites something specific: the product's material (its real UI, data, objects),
the audience's context, the content's shape (a single strong number, a long list, a comparison).
"Because it looks fresh" is not a reason. Rules of thumb:

- **One accent, one job.** The accent belongs to the primary action (or one dominant element per
  slide). No ambient decoration in the accent color.
- **Align to the grid.** Left-aligned or split heroes by default; centering is a decision for a
  focused moment.
- **Show the product.** A labeled product-UI placeholder outranks illustration; real images only
  from URLs the user supplied.
- **Vary the rhythm.** No run of identical groups of three; give one item dominance.
- **Lines before boxes.** Group with spacing and hairline rules before adding card surfaces.
- **Opaque and flat by default.** No glass, glows or decorative gradients; at most one neutral
  elevation level where elevation means something.
- **Say the specific thing.** Headlines name the job and the audience; numbers only from the brief,
  with their source.

### 4.3 Typeface
If the file's type tokens set a family, it stands (system first). Otherwise pick from
`penpot.fonts.all` a family **outside both lists** in `lists.json`, chosen for the brief's tone
(`scripts/listFontCandidates.js`), and **propose** it as a type token — never apply it silently.

### 4.4 The counter-default trap
Anti-AI advice has produced defaults of its own: warm cream backgrounds with an italic serif accent
word and a muted sage/olive accent; or a single "anti-template" house style reused across every
brief. Swapping one default for another is still a default. Each run records its direction picks
in the ledger (`antiSlop.direction`) and the variety rule (`design-quality.md` §5) compares them:
consecutive runs in one file must differ on at least one of layout, accent role and typeface.

### 4.5 Output of the step
A short block at the Phase 0 checkpoint: *defaults named → replacements with their reason → typeface
proposal → what will be refused (taxonomy keys)*. These become extra **Constraints** in the brief
contract.

## 5. Precedence

1. **The system wins.** Tokens, components and the user's explicit brief beat this file. A tell that
   comes from the system (an Inter type token, a component that ships with a gradient) is reported as
   `inherited` with a proposal, never auto-changed.
2. **The user wins.** An explicit request ("I want a centered hero") is honored; the tell is noted
   once as `accepted` and not counted.
3. **Honesty wins over polish.** Never replace a removed stat, logo or testimonial with an invented
   one (`design-quality.md` §6).
4. **Fixes are never auto-applied.** Every fix here is geometry, color or content — none is in the
   safe set (`policies/modes.json`). Apply-with-review only.

## Anti-rationalization

| Excuse | Why it's wrong | Countermeasure (halt) |
|---|---|---|
| "The user didn't answer the opt-in, I'll assume yes." | Strict mode is a stylistic choice that belongs to the user. | Ask (§0) or keep it off; never assume. |
| "I'll ask again to be sure." | Re-asking a stored preference is noise. | Read `prefs.antiSlop` first; ask only when it is unset. |
| "I scored my own export, it's clean." | The builder grading its own work skews lenient. | Describe the regions first, then judge each key with its criterion; probes override reviews. |
| "Cream + italic serif looks hand-made, so it's safe." | It is the newest default. | §4.4 — name it as a default and replace it with a brief-driven choice. |
| "Inter is in the tokens but I'll swap it, the mode says so." | The system outranks the mode. | Report `inherited`, propose a type token, leave the binding. |
| "I removed the fake stats; a plausible number fills the gap." | Fabricated evidence. | Labeled placeholder, or a pattern that needs no number. |
