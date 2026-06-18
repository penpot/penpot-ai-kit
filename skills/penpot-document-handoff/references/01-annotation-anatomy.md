# 01 — Annotation system anatomy (reverse-engineered)

> The reference handoff system this skill reproduces, captured from real Penpot files
> (Guillermo Adán's proposal annotations: "Fill types", "Shortcuts", "Toolbar drawing tools grouping").
> Reproduce these structures and the single visual system below.

## The three columns
A documented design is read left→right as **context → design → notes**:

1. **Context card** (left) — one `Critique Card` per design. The "why".
2. **The design** (center) — the actual UI mockup, **untouched**, with numbered pins overlaid.
3. **Note cards** (right) — a vertical stack of `Chip Note`s, each matched to a pin. The "what/observe".

Everything except the design is wrapped in one hideable group (see last section).

## Component: `Critique Card` (the left context panel)
A Board, flex `dir: column-reverse`, `rowGap: 24`, padding `[24,12,24,12]`. Width ≈ 520. Because the
layout is `column-reverse`, **children are appended bottom-of-content first**; visually (top→bottom):

1. **Info** block (flex column-reverse, gap 16):
   - `#541` — the US/issue number (small).
   - Title — e.g. "Image fill modes — (Fill, Fit, Stretch, Crop and Tile)" — Work Sans **24** / 400.
   - A row of three metadata fields: **State of designs** · **State of copy** · **Platform(s)**
     (each a small label + value, e.g. "Exploration" / "Designer copy" / "Web").
   - A **status pill** (`Status / Inprogress`): label "In progress" + a visibility (eye) icon, padded box.
2. Divider (a thin `Path`).
3. **Goal/Purpose** — section label + the **"How might we…"** question (Work Sans 24/400).
4. **Links** — label + a row (detach/link icon + the URL text; GitHub / Taiga links).
5. **Designer(s)** — label + name(s).
6. Divider (`Path`).
7. **Context** — label + body paragraph(s): the problem, current friction, the proposal, what's out of
   scope / deferred to a later phase.
8. **What type of feedback we're looking for** — label + body (Tech / Product questions).
9. **What type of feedback we're NOT looking for** — label + body.

Every **section** = a small flex Board: an UPPERCASE accent label + the body, `rowGap: 4`.

## Component: `Chip Note` (a right-column note card)
A Board, flex `dir: column-reverse`, `rowGap: 24`, padding `[24,12,24,12]`, **bg `#E4F3FF`** (surface).
Width ≈ 484. Visually top→bottom:

1. **Header** (`Chip / S`, flex row, gap 8): a `Pointer / S` badge (24px accent circle, white number)
   + the note **title** in UPPERCASE accent (e.g. "MODE SELECTOR", "POSITION SELECTOR", "FIT").
2. **Observation** — label "Observation" (accent, 12/500) + body text (black, 14/400).
3. **Recommendation** (optional) — label + body. Default placeholder text: `Recommendation goes here...`.

## Component: `Pointer` (the numbered marker), two sizes
A small Board, fully-rounded (`radius: 9999`), accent fill `#1A88E0`, containing a centered white number.
- `Pointer / L` — **40px** — the pin placed **on the design**, over the region it points at.
- `Pointer / S` — **24px** — the badge embedded in each Chip Note header.
The **same number** links the on-canvas pin (L) to its note's header badge (S): pin ① ↔ note ①.

## Component: `Tooltip` (optional, for transient states)
`Tooltip / Top` and `Tooltip / Bottom`: a content container + an arrow (`Tooltip / Inner / Arrow /
Top|Bottom`). Used to annotate hover-only / transient UI ("Rotate 90º", "Restore adjustments") that
isn't visible in a static screenshot.

## The single visual system
| Aspect | Value | Token (proposed) |
|--------|-------|------------------|
| Accent (labels, pins, chip titles) | `#1A88E0` | `color.annotation.accent` |
| Card surface (Chip Note bg) | `#E4F3FF` | `color.annotation.surface` |
| Number on accent | `#FFFFFF` | `color.annotation.on-accent` |
| Body text | `#000000` | `color.annotation.body` |
| Font family | Work Sans | `font.annotation.*` |
| Section/Chip label | 12px / 500 / **UPPERCASE** | `font.annotation.label` |
| Body | 14px / 400 | `font.annotation.body` |
| Title / "How might we" | 24px / 400 | `font.annotation.title` |
| Card padding | `24 / 12 / 24 / 12` | (4px grid) |
| Section gap / label gap | 24 / 4 | (4px grid) |
| Pin | 40 (L) / 24 (S), radius full | — |

Discipline: **one** accent color, **one** surface color, **one** type family across the whole system.
That restraint is what makes it read as clean and intentional — preserve it.

## The hideable group
All annotation shapes (the Critique Card, all Pointer pins, all Chip Notes, all Tooltips) are collected
into **one group** named **`Hide this to quit notes`**. Toggling its visibility (`group.hidden = true`)
returns the reviewer to the pristine design. This skill always produces that single toggle.

## Authoring tell (observed)
In the source files these are **component instances reused as templates**: the `characters` are
overridden per design, but layer *names* often still carry text from a previous feature. When reusing
the kit, override the text content; don't trust a layer's name as its current content.
