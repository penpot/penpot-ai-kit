# 04 — Find-or-create the annotation kit + tokens

> Loaded in Phase 2. Reuse the annotation component kit and `annotation.*` tokens if they exist;
> otherwise propose and create a minimal kit (human approves). Never paint the accent/surface raw.

## Find first
Look in the local + connected libraries for the kit by name (the reference system's names):
```js
const want = ["Critique Card", "Chip Note", "Pointer", "Tooltip"];
const libs = [penpot.library.local, ...(penpot.library.connected || [])];
const found = {};
for (const lib of libs) for (const c of lib.components || [])
  for (const w of want) if (c.name === w || c.name.startsWith(w)) found[w] = found[w] || { id: c.id, lib: lib.name };
return found;
```
Also check tokens: `penpotUtils.findTokenByName("color.annotation.accent")` etc. If the components and
tokens are present, **reuse them** — skip creation, store ids in `storage.dh.kit` / `storage.dh.tokens`.

## Token proposals (only if missing — propose, then create on approval)
Put annotation tokens in their **own set** (`annotation`) so they never pollute the product's
`semantic` / `modes/*` sets. Values verified from the reference system; tier = semantic (self-contained
meta-palette — it's fine for these to hold direct values since they're not part of the themed product UI,
but if `primitives` already has matching ramps, reference them instead).

| Token | type | value |
|-------|------|-------|
| `color.annotation.accent` | `color` | `#1A88E0` |
| `color.annotation.surface` | `color` | `#E4F3FF` |
| `color.annotation.on-accent` | `color` | `#FFFFFF` |
| `color.annotation.body` | `color` | `#000000` (or `{color.text.default}` if it exists) |
| `font.annotation.family` | `fontFamilies` | `Work Sans` |
| `font.annotation.title` | `fontSizes` | `24` |
| `font.annotation.body` | `fontSizes` | `14` |
| `font.annotation.label` | `fontSizes` | `12` |

Use the exact `type` spellings from `shared/tokens-schema.json` (`color`, `fontFamilies`, `fontSizes`,
…). Token creation is a **never-autofix** change: present the table, get approval, then `addToken`.

## Minimal kit to create (only if missing — after approval)
Build each as a small library component matching `references/01-annotation-anatomy.md`. Keep them lean;
they exist to be instanced and text-overridden.

- **Pointer** — a fully-rounded Board (size 40 for L / 24 for S), fill bound to `color.annotation.accent`,
  one centered Text (white, bound to `color.annotation.on-accent`) holding the number. Make it a
  component (and, if the API supports it cleanly, a variant with a `Size = S | L` axis — verify with
  `penpot_api_info('Variants')`; otherwise two components `Pointer / S` and `Pointer / L`).
- **Chip Note** — Board, flex `column-reverse`, gap 24, padding `[24,12,24,12]`, bg bound to
  `color.annotation.surface`. Children (append bottom-first for column-reverse): a `Recommendation`
  section (label + body), an `Observation` section (label + body), a `Chip / S` header (Pointer/S +
  UPPERCASE title). Labels bound to `color.annotation.accent` + `font.annotation.label`, body to
  `color.annotation.body` + `font.annotation.body`.
- **Critique Card** — Board, flex `column-reverse`, gap 24, padding `[24,12,24,12]`. Sections per
  `01-annotation-anatomy.md` (Info → divider → Goal → Links → Designers → divider → Context → Feedback
  → No feedback). Title bound to `font.annotation.title`.
- **Tooltip** (optional) — `Tooltip / Top` and `/ Bottom`: content container + arrow path.

## Validated API gotchas (from a live run)
Confirmed against the real Penpot MCP — bake these into any text you create:
- **Don't apply a `fontFamilies` token with `applyToken(tok, ["fontFamilies"])`** — it throws
  `Field message is invalid`. Set the family+weight with the Font API instead:
  `const ws = penpot.fonts.findByName("Work Sans"); ws.applyToText(text, variant)` where `variant` is
  `ws.variants.find(v => v.fontWeight == "500")` (or `"400"`). `fontSize` and `fill` tokens DO apply
  fine via `applyToken(tok, ["fontSize"])` / `["fill"]`.
- **`text.fontWeight = "500"` throws** unless the current font has that weight. Set the family first via
  `ws.applyToText` with the chosen variant; don't set `fontWeight` on the default font.
- **Auto-height text won't wrap** until you give it width: after appending to a flex parent, set
  `text.layoutChild.horizontalSizing = "fill"` (and the same on each section board). Otherwise cards
  render absurdly tall.
- **`penpot.group(shapes)` works** but its tool call sometimes times out on the *return* while the group
  is actually created — verify by re-reading `group.name` rather than re-grouping (idempotency).

## Idempotency
Before creating anything, re-check it doesn't already exist (by name / by `storage.dh.kit`). Creating a
second `Chip Note` component is a bug. If a partial kit exists, create only the missing pieces.

## After creation
Store: `storage.dh.kit = { critiqueCardId, chipNoteId, pointerSId, pointerLId, tooltipId, created:true }`
and `storage.dh.tokens = { accent, surface, onAccent, body, ... }`. These feed every later script.
