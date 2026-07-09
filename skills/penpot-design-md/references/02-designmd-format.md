# The DESIGN.md format contract

The design-md format is an open convention: a YAML-frontmatter token spec + prose sections that
together let any human or agent reproduce a design system from one markdown file. The output must
match this contract exactly — consumers rely on the section names and frontmatter keys. The
fill-in skeleton lives in `references/04-designmd-template.md` (copy it, fill it, delete the
guidance lines); this file is the normative spec the filled template must satisfy.

## 1. YAML frontmatter

```yaml
---
version: alpha                     # keep "alpha" unless the user versions it
name: <System>-design-analysis     # or the design system's name
description: "<ONE dense paragraph: dominant surface colors (with hex), the accent(s) and how
  scarcely/freely they're used, text character (family, weights, tracking), shape language
  (radius habits, borders vs shadows), and the page rhythm. This paragraph alone should let a
  reader *see* the system.>"

colors:                            # kebab-case SEMANTIC names, quoted hex values
  primary: "#00d1b8"               # the accent
  on-primary: "#ffffff"
  primary-hover: "#..."            # state shades of the accent if they exist
  ink: "#..."                      # main text
  ink-muted: "#..."                # secondary text
  ink-subtle: "#..."               # tertiary/disabled text
  canvas: "#..."                   # page background
  surface-1: "#..."                # ladder of raised surfaces, in elevation order
  surface-2: "#..."
  hairline: "#..."                 # border colors
  semantic-success: "#..."         # status colors, prefixed semantic-
  # ...only roles the file actually has. Do not pad to match this list.

typography:                        # named styles, largest display first
  display-xl:
    fontFamily: <family>
    fontSize: <N>px
    fontWeight: <N>
    lineHeight: <ratio or px>
    letterSpacing: <N>px | 0
  body: { ... }
  button: { ... }
  mono: { ... }                    # if the system has one

rounded:                           # radius scale actually used, xs → pill
  xs: 4px
  md: 8px
  pill: 9999px

spacing:                           # spacing scale actually used
  xxs: 4px
  md: 16px
  section: 96px

components:                        # kebab-case; states are SEPARATE entries
  button-primary:
    backgroundColor: "{colors.primary}"     # ALWAYS interpolate {colors.*} etc.
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 8px 14px                       # raw values allowed only where no map entry exists
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    # ...
---
```

**Interpolation rule:** raw hex/px live ONCE, in the maps. Everywhere else (components frontmatter,
body prose) reference `{colors.x}`, `{typography.y}`, `{rounded.z}`, `{spacing.w}`. A raw hex in
`components:` where a `colors:` entry holds the same value is a lint failure.

## 2. Body sections — this order, these names

1. `## Overview` — 3–6 paragraphs of grounded prose, then a `**Key Characteristics:**` bullet
   list (5–8 bullets, each one concrete: "single chromatic accent", "four-step surface ladder",
   "radius never exceeds {rounded.lg} except pills").
2. `## Colors` — subsections `### Brand & Accent`, `### Surface`, `### Text`, `### Semantic`.
   Open with a `> Source:` callout naming where values came from (token sets, library colors,
   sampled pages). Include the Penpot-token → semantic-name mapping table here.
3. `## Typography` — `### Font Family` (+ availability/substitute note), `### Hierarchy` (a table
   or list mapping styles to use), `### Principles` (tracking/weight habits).
4. `## Layout` — `### Spacing System` (the scale + the grid rule, e.g. 4px), `### Grid &
   Container`, `### Whitespace Philosophy`.
5. `## Elevation & Depth` — the shadow/border ladder; if the system is flat, say so explicitly.
6. `## Shapes` — `### Border Radius Scale` + the shape language prose.
7. `## Components` — one `### <Family>` per component family; inside, each entry as
   **`` `component-name` ``** — one-line purpose, then property bullets using `{refs}`. Document
   variant axes as `Property=Value` matrices where the file has them.
8. `## Do's and Don'ts` — `### Do` / `### Don't` bullets. OBSERVED rules only.
9. `## Responsive Behavior` — only if derivable (breakpoint boards, constraints); otherwise omit
   and note it in Known Gaps.
10. `## Iteration Guide` — numbered, practical: how a future agent should use this doc to edit
    the design (reference components by their `components:` names, pick surfaces from the ladder,
    default body style, where the accent may appear).
11. `## Known Gaps` — mandatory. Everything not extractable: motion, responsive rules, error
    states, proprietary fonts, undocumented pages, collapsed token detail.

## 3. Tone

Dense, specific, quietly opinionated, zero filler. Prefer "the
accent appears on exactly three things: X, Y, Z" over "the accent is used sparingly". Numbers and
`{refs}` in every claim that supports them.

## 4. Self-check before writing the file (Phase 4 gate)

- [ ] Frontmatter parses as YAML; all five maps present (or their absence noted in Known Gaps).
- [ ] Every `{ref}` in the document resolves to an existing frontmatter key.
- [ ] No raw hex in `components:` or body where a `colors:` entry holds that value.
- [ ] Section order and headings exactly as §2.
- [ ] Every color/typography/spacing value traceable (source cited in Colors/Known Gaps).
- [ ] `description` and Overview were written AFTER viewing exports.
- [ ] Known Gaps is present and honest.
