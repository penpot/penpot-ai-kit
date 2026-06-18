/**
 * addTooltipCallout.js
 * Purpose: Phase 4 (optional) — add a Tooltip callout near a trigger region to document a transient /
 *          hover-only state that isn't visible in the static design (e.g. "Rotate 90º").
 * Usage:   paste into execute_code. One tooltip per call. Does NOT modify the design.
 * Input:   TIP below (triggerRegionId, side, text). Reads storage.dh.
 * Output:  { tooltipId, x, y }.
 * Notes:   Prefer instancing an existing "Tooltip / Top|Bottom" component (storage.dh.kit.tooltipId);
 *          else build a minimal labelled box. Tooltip is a SURFACE (bind bg to color.annotation.surface
 *          or its own tooltip token). Place as a page-level sibling overlay; never append into the design.
 *          Verify members with penpot_api_info if unsure.
 */
const TIP = {
  triggerRegionId: "REPLACE-ME-region-shape-id",
  side: "top",            // "top" | "bottom"
  text: "REPLACE-ME tooltip text"
};

const dh = storage.dh || {};
const region = penpotUtils.findShapeById(TIP.triggerRegionId);
if (!region) return { error: `trigger region ${TIP.triggerRegionId} not found.` };
const tok = n => (n ? penpotUtils.findTokenByName(n) : null);
const T = dh.tokens || {};

let tip;
if (dh.kit && dh.kit.tooltipId) {
  const comp = penpot.library.local.components.find(c => c.id === dh.kit.tooltipId)
    || (penpot.library.connected || []).flatMap(l => l.components).find(c => c.id === dh.kit.tooltipId);
  tip = comp && comp.instance();
  const t = tip && penpotUtils.findShape(s => s.type === "text", tip);
  if (t) t.characters = TIP.text;
}
if (!tip) {
  tip = penpot.createBoard(); tip.name = "tooltip";
  const f = penpotUtils.addFlexLayout(tip, "row"); f.topPadding = f.bottomPadding = 4; f.leftPadding = f.rightPadding = 10;
  f.horizontalSizing = "auto"; f.verticalSizing = "auto"; tip.borderRadius = 4;
  tip.fills = []; const surf = tok(T.surface); if (surf) tip.applyToken(surf, ["fill"]);
  const label = penpot.createText(TIP.text); label.growType = "auto-width";
  const fam = tok(T.fontFamily), sBody = tok(T.bodySize), body = tok(T.body);
  if (fam) label.applyToken(fam, ["fontFamilies"]); if (sBody) label.applyToken(sBody, ["fontSize"]);
  if (body) label.applyToken(body, ["fill"]);
  tip.appendChild(label);
}
penpot.currentPage.root.appendChild(tip);

// position relative to the trigger; arrow side per TIP.side
const tw = tip.width || 80, th = tip.height || 28;
tip.x = Math.round(region.x + region.width / 2 - tw / 2);
tip.y = TIP.side === "bottom" ? Math.round(region.y + region.height + 8) : Math.round(region.y - th - 8);
tip.bringToFront();

dh.tooltips = dh.tooltips || [];
dh.tooltips.push({ id: tip.id, triggerRegionId: TIP.triggerRegionId, side: TIP.side });
storage.dh = dh;
return { tooltipId: tip.id, x: Math.round(tip.x), y: Math.round(tip.y) };
