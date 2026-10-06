# Visual effects — gradients, glass, shadows, images, edge decorations

> Shared recipes for every skill that paints **surfaces** (`penpot-build-screen`, `penpot-build-deck`,
> `penpot-build-from-code`, `penpot-component-factory`). Effects are where generated UI most often
> turns generic ("gradient hero on white") or breaks governance (a literal that no token can
> express). This file says *when* an effect is allowed, *how* to apply it through the real Plugin
> API, and *how to record* the ones that cannot bind to tokens. API traps: `plugin-api-gotchas.md`
> #11 (white board fill), #14 (absolute children + clipping), #16 (flipX), #17 (`waitForLayoutUpdate`),
> #18 (image fills).

## 1. When an effect is allowed
- Effects go on **surfaces** only (screen/slide background, cards, sheets, controls). A structural
  board (`fills = []`) never carries a gradient, shadow or blur — the fill policy in
  `modes-and-policies.md` decides which is which.
- Budget: **one** atmospheric device per screen/slide (a gradient *or* a glow *or* an edge shape),
  **≤ 2** elevation levels, **one** glass treatment family. More than that is the "every card
  elevated" tell (`design-quality.md` §7).
- Accent still belongs to the primary action / the one dominant element. A glow may carry the
  accent hue at low opacity; it may not out-saturate the CTA.
- **Strict anti-slop mode** (`prefs.antiSlop === "on"`, `shared/anti-slop.md`): the atmospheric
  budget drops to **zero** unless the brief asks for it — no glass (§3), no decorative glows, no
  violet/indigo gradients; at most one neutral elevation level. Flat token surfaces carry the design.

## 2. Gradients
```js
// Linear, top-left → bottom-right, two stops. Coordinates are 0..1 within the shape.
surface.fills = [{
  fillOpacity: 1,
  fillColorGradient: {
    type: "linear", startX: 0, startY: 0, endX: 1, endY: 1, width: 1,
    stops: [{ color: "#0B1020", offset: 0 }, { color: "#1B2A4A", offset: 1 }]
  }
}];
// Radial "glow" anchored near a corner: small width, accent at 35 % opacity → transparent.
glow.fills = [{
  fillOpacity: 1,
  fillColorGradient: {
    type: "radial", startX: 0.85, startY: 0.15, endX: 0.85, endY: 0.65, width: 0.6,
    stops: [{ color: "#4F7CFF", opacity: 0.35, offset: 0 }, { color: "#4F7CFF", opacity: 0, offset: 1 }]
  }
}];
```
Rules: verify the `Gradient` shape with `penpot_api_info("Gradient")` before first use; stops use
uppercase hex; keep gradients to 2–3 stops; anchor glows at an **edge or corner**, never centered.
**Gradients cannot bind to color tokens.** Record every gradient in the run ledger as
`{ kind: "gradient-literal", shape: <id>, stops: [...], derivedFrom: ["color.bg.app", "color.brand.500"] }`
so `penpot-audit-tokens` can review it instead of flagging it blind.

## 3. Glass cards (dark surfaces)
```js
const card = penpot.createBoard();
card.name = "card-glass";
card.fills = [{ fillColor: "#FFFFFF", fillOpacity: 0.08 }];       // 6–10 %
card.strokes = [{ strokeColor: "#FFFFFF", strokeOpacity: 0.12, strokeWidth: 1, strokeAlignment: "inner" }];
card.backgroundBlur = { type: "layer-blur", value: 24 };            // 16–32; verify with penpot_api_info("Board","backgroundBlur")
card.borderRadius = 24;
```
Glass only reads on a dark or busy background (a gradient/glow behind it). On light surfaces use a
plain surface token + one soft shadow instead. Bind the radius to a token (`radius.card`); the
white-at-8 % fill is a literal by necessity — ledger it as `{ kind: "glass-literal" }`.

## 4. Shadows
```js
card.shadows = [{
  style: "drop-shadow", offsetX: 0, offsetY: 8, blur: 24, spread: 0,
  color: { color: "#0B1020", opacity: 0.12 }
}];
```
Verify the `Shadow` shape with `penpot_api_info("Shadow")`. Elevation ladder: level 1 = `0 2 8 / 8 %`,
level 2 = `0 8 24 / 12 %`; nothing above level 2; shadows only where elevation *means* something
(a floating panel, a hovered card), never on every card. Prefer a `shadow` **token**
(`tokens-schema.json`) when the file has one — `applyToken(tok, ["shadow"])`.

## 5. Images — placeholder first, upload only what the user gave you
**Placeholder** (default): a rectangle named `img-placeholder` bound to a muted surface token
(`color.bg.muted` / `deck.surface.placeholder`), radius from the profile, with a centered caption
text `IMAGE — <what should go here>` at 20–24 px in the muted text token. It is honest, editable, and
survives the checkpoint checklist (`visual-self-review.md` flags leftover "REPLACE-ME", not labeled
placeholders).

**Upload** (only for URLs the user supplied):
```js
// call A
try {
  const img = await penpot.uploadMediaUrl("hero", "https://example.com/hero.jpg");
  target.fills = [{ fillOpacity: 1, fillImage: img }];
  storage.pendingImages = [...(storage.pendingImages || []), target.id];
  return { uploaded: true, id: target.id };
} catch (e) { return { uploaded: false, error: String(e) }; }
// call B — verify, then export_shape(target.id)
const t = penpotUtils.findShapeById(storage.pendingImages[0]);
return { ok: !!(t.fills[0] && t.fills[0].fillImage) };
```
Failure → keep/restore the placeholder and add `{ kind: "image-upload-failed", url, reason }` to the
ledger `exceptions`. Never invent a URL (`design-quality.md` §6). Local mode may use the
`import_image` tool instead; the verification step is identical.

## 6. Edge decorations and bleeds
A shape that should hang off the edge (a rotated tile, a large numeral, a half-bleed image) is an
**absolute** child: `parent.appendChild(deco); deco.layoutChild.absolute = true;` then position in
**page coordinates** (`deco.x = parent.x + offset`, gotcha #14). Boards **clip** at their edges by
default (`clipContent = true`) — that clipping is the bleed. Keep decorations at ≤ 15 % of the
surface area and below the content in z-order (`sendToBack()` after appending).

## 7. `clearFlip` — run after every unit that uses fill sizing
```js
// Canonical helper (gotcha #16). Idempotent; returns how many flips it cleared.
const clearFlip = (sh) => { let n = 0; const walk = (s) => { if (s.flipX) { s.flipX = false; n++; } (s.children || []).forEach(walk); }; walk(sh); return n; };
```
Call `clearFlip(sectionBoard)` / `clearFlip(slideBoard)` before returning from any build script and
include the count in the returned object; a non-zero count is worth a line in the checkpoint
summary.

## Anti-rationalization
| Excuse | Why it's wrong | Countermeasure |
|---|---|---|
| "A gradient hero is the modern look." | It is the single most common generated-landing tell. | One atmospheric device, anchored at an edge, justified by the profile; otherwise a flat token surface. |
| "I'll grab a stock photo URL that probably exists." | Fabricated content; the upload silently fails or ships a random image. | Placeholder unless the user supplied the URL. |
| "The upload call returned, so the image is there." | The promise resolving is not the fill being set. | Verify `fills[0].fillImage` in the next call and look at the export. |
| "Shadows on every card add depth." | Uniform elevation carries no meaning. | ≤ 2 levels, only where elevation means something. |
