# 06 — Error recovery

> Loaded on failure. Recover deterministically; never paper over a broken handoff.

## Accidentally edited the design
Symptom: Phase 5 audit reports the design's child set or bounds changed.
- Identify the changed shape from the audit diff. If it was a position/size/fill change, **undo it**
  (restore from the Phase 0 snapshot in `storage.dh.designSnapshot`, or ask the user to Ctrl/Cmd-Z).
- Root cause is almost always appending an annotation *into* the design's layout board. Re-parent the
  annotation out to the page / annotation wrapper and set `layoutChild.absolute = true` if needed.
- Re-run the audit until the design is byte-identical to the snapshot.

## Missing / partial annotation kit
- `setupAnnotationKit.js` in `dryRun` reports which of `Critique Card / Chip Note / Pointer / Tooltip`
  exist. Create only the missing pieces (idempotency). If component creation fails, verify the API with
  `penpot_api_info('Library','createComponent')` and `penpot_api_info('Variants')`.
- If tokens can't be created (e.g. set missing), create the `annotation` set first
  (`penpot.library.local.tokens.addSet({name:"annotation"})`), then `addToken`.

## Broken numbering (gaps / duplicates)
- Rebuild the index from reality: read all `Pointer/L` pins under the group and all Chip Notes; sort by
  pin number. Renumber contiguously 1..N (update both the on-canvas pin text and the note header badge),
  fix `storage.dh.pins` and `pinCounter`. Re-run the parity check.

## Orphan note or orphan pin
- A note with no pin → either add the pin on its region or fold the note into the context card.
- A pin with no note → add the matching Chip Note or remove the stray pin.
- The audit's `parity` section lists both; resolve every entry before reporting done.

## Group / hide issues
- If `group()` isn't available with the assumed signature, verify with `penpot_api_info` and use the
  correct grouping call. Ensure the group contains **only** annotation shapes (never the design).
- If hiding the group also hides the design, the design was wrongly included — ungroup, exclude the
  design, regroup.

## Text overflow / wrong note heights
- After setting `characters`, set `growType = "auto-height"` and sleep ~100 ms before reading
  `note.height` to compute the next note's `y`. If a note overflows its box, it's because `resize()`
  forced `growType="fixed"` — set it back to `auto-height`.

## Resume after truncation
- Re-read `storage.dh` + the in-file breadcrumb; read the `Hide this to quit notes` group structure to
  see which pins/notes already exist; continue from `pinCounter`. Never restart from pin 1 over an
  existing layer.
