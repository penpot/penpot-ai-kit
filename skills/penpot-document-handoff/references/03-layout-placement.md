# 03 — Layout & placement geometry

> Loaded in Phases 3–4. How to position the three columns, anchor pins, and stack notes — without
> touching the design. All gaps on the 4px grid.

## Coordinate basis
The design board has absolute page bounds `D = { x, y, w, h }` (read in Phase 0). The context card and
note cards are **siblings of the design on the page** (or absolute children of a wrapper) — set their
`x`/`y` directly. Pins are placed at absolute positions computed from each region's bounds.

## Column geometry
Let `GUTTER = 80` (a comfortable, on-grid gap). Card widths from the reference system: context ≈ `520`,
note ≈ `484`.

```
contextCard.x = D.x - GUTTER - 520
contextCard.y = D.y                     // top-aligned with the design
notesColumnX  = D.x + D.w + GUTTER      // left edge of the notes stack
```
Store `notesColumnX` in `storage.dh.notesColumnX` so every `placePinAndNote.js` call lines notes up.

## Pin anchoring (on the design, never modifying it)
For region `R = { x, y, w, h }` (absolute), place the **Pointer/L** (40px) so it sits at the region's
top-right corner, nudged outward — matching the reference where pins hug the element they mark:
```
pinL.x = R.x + R.w - 20      // half the pin overlaps the corner
pinL.y = R.y - 20
```
If pins would collide (regions close together), offset along the side by `pin + 8`. The pin is an
**overlay**: it is a sibling/elevated shape, not a child of the design. If you must parent it under a
layout board, set `pin.layoutChild.absolute = true` so the layout doesn't reflow it.

## Note stacking (right column)
Notes stack top→bottom in pin order, aligned to `notesColumnX`, separated by `NOTE_GAP = 24`:
```
note[n].x = notesColumnX
note[n].y = D.y + Σ(height of notes 1..n-1) + (n-1) * NOTE_GAP
```
Because Chip Note height depends on its text (auto-height), compute the next `y` from the **actual**
`note.height` after the text has reflowed (sleep ~100 ms, then read `note.height` / `textBounds`).
Track the running `y` in `storage.dh` (e.g. `notesNextY`) so each call appends below the previous note.

Ideal but not required: align each note's vertical center near its pin's `y`. Simpler and robust:
sequential stacking in pin order (what the reference does). Prefer sequential stacking.

## Tooltips
Place a `Tooltip / Top|Bottom` near its trigger region, arrow pointing at it:
- side `top`: tooltip above the trigger, arrow down → `tip.y = R.y - tip.h - 8`.
- side `bottom`: tooltip below, arrow up → `tip.y = R.y + R.h + 8`.
Horizontally center on the trigger: `tip.x = R.x + R.w/2 - tip.w/2`.

## Don't fight the design's layout
Never append annotation shapes **into** the design's own flex/grid boards (that would reflow the UI).
Annotations are page-level siblings or children of the dedicated annotation wrapper. The Phase 5 audit
verifies the design's child set and bounds are unchanged.
