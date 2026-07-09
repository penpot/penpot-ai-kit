# DESIGN.md template — copy, fill, delete the guidance

> The self-contained skeleton of the design-md format. Copy everything below the divider into the
> output file and replace each `<...>` placeholder with values extracted from the Penpot file.
> Lines starting with `# ←` are authoring guidance — DELETE them from the final document.
> The normative rules (section order, interpolation, self-check) live in
> `references/02-designmd-format.md`; this file is the shape, that file is the law.

---

```markdown
---
version: alpha
name: <System>-design-analysis
description: "<ONE dense paragraph a reader can *see* the system from: dominant surface colors
  (with hex), the accent(s) and how scarcely or freely they are used, text character (family,
  weights, tracking, casing habits), shape language (radius habits, borders vs shadows), and the
  page rhythm. No filler adjectives — numbers and hex values inline.>"

colors:
  # ← kebab-case SEMANTIC names, quoted hex. Include ONLY roles the file actually has.
  primary: "#<hex>"            # ← the accent / brand action color
  on-primary: "#<hex>"         # ← text placed on primary
  ink: "#<hex>"                # ← main text
  ink-muted: "#<hex>"          # ← secondary text
  canvas: "#<hex>"             # ← page background
  surface-1: "#<hex>"          # ← raised-surface ladder, in elevation order (surface-2, -3, …)
  hairline: "#<hex>"           # ← border/divider tone
  semantic-success: "#<hex>"   # ← status colors, prefixed semantic-

typography:
  # ← named styles, largest display first. Every property read from the file.
  display-xl:
    fontFamily: <family>
    fontSize: <N>px
    fontWeight: <N>
    lineHeight: <ratio-or-px>
    letterSpacing: <N>px
    # textCase: uppercase      # ← only when the style itself carries it
  body:
    fontFamily: <family>
    fontSize: <N>px
    fontWeight: <N>
    lineHeight: <ratio-or-px>
    letterSpacing: <N>px
  button:
    fontFamily: <family>
    fontSize: <N>px
    fontWeight: <N>
    lineHeight: <ratio-or-px>
    letterSpacing: <N>px

rounded:
  # ← the radius scale actually used, smallest → largest; use none/xs/sm/md/lg/xl/pill names
  none: 0px
  md: <N>px
  pill: 9999px

spacing:
  # ← the spacing scale actually used; xxs → section
  xxs: <N>px
  md: <N>px
  section: <N>px

components:
  # ← kebab-case entries; STATES are separate entries (button-primary-hover, …).
  # ← ALWAYS interpolate {colors.*}/{typography.*}/{rounded.*}/{spacing.*}; raw values only
  #    where no map entry exists (e.g. a one-off padding).
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: <N>px <N>px
  button-primary-hover:
    backgroundColor: "{colors.<state-shade>}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
---

## Overview

<3–6 paragraphs of grounded prose: what the canvas is, how hierarchy is carried, what the accent
does, the type voice, the rhythm — every claim backed by a {ref} or a number.>

**Key Characteristics:**
- <5–8 bullets, each concrete and checkable — e.g. "single chromatic accent, used on exactly N
  things", "radius never exceeds {rounded.lg}", "elevation is border-driven; zero shadow tokens">

## Colors

> Source: <token sets / library color groups / sampled pages the values came from>.

<The Penpot-token → semantic-name mapping table goes here when names were translated.>

### Brand & Accent
<Each accent: where it appears, how scarce, its state shades.>

### Surface
<The ladder, in order, and what sits on each step.>

### Text
<ink tiers and where each is used; text-on-accent rules.>

### Semantic
<Status colors and their pairings; say explicitly if a role is defined but unused.>

## Typography

### Font Family
<Families, cuts, availability — name the substitute if the real face is proprietary.>

### Hierarchy
<A table mapping each {typography.*} style to size/weight/lh/case and where it is used.>

### Principles
<Weight pairing, tracking habits, casing rules — the file's habits, not folklore.>

## Layout

### Spacing System
<The scale, its base grid, and the observed rhythm (gutters, band padding, in-card gaps).>

### Grid & Container
<Container width, column patterns, gaps.>

### Whitespace Philosophy
<Dense or airy, and where the breathing room concentrates.>

## Elevation & Depth

<The shadow/border ladder — or state plainly that the system is flat and what substitutes depth.>

## Shapes

### Border Radius Scale
<The scale and the actual habit (which step dominates; where the exceptions live).>

## Components

> Source: <library components sampled / canvas sections sampled when no library exists>.

### <Family>
**`<component-name>`** — <one-line purpose.>
- <Property bullets using {refs}: background, text, border, radius, padding, type.>
- <States/variant axes as Property=Value matrices when the file has them.>

## Do's and Don'ts

### Do
- <Only rules the file demonstrates — cite the observation.>

### Don't
- <Only absences/prohibitions the file evidences ("no pill shapes anywhere", "accent never a fill").>

## Responsive Behavior

<Only if derivable from the file (breakpoint boards, constraints). Otherwise DELETE this section
and record the gap in Known Gaps.>

## Iteration Guide

1. <Numbered, practical instructions for a future agent editing designs with this doc: reference
   components by their `components:` names, pick surfaces from the ladder, default type styles,
   where the accent may appear.>

## Known Gaps

- <Mandatory. Everything not extractable: motion, responsive rules, error states, proprietary
  fonts, collapsed token detail, undocumented pages, unused-but-defined tokens.>
```
