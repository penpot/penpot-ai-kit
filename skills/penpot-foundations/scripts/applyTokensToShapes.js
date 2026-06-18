/**
 * applyTokensToShapes.js
 * Purpose: bind semantic tokens to the current selection (or shapes by id).
 * Usage:   paste into execute_code (Phase 4). Token application is async (~100ms) — verify later.
 * Input:   BINDINGS array of { tokenName, properties:[...] } (TokenProperty values like "fill").
 * Output:  { applied:[{shape, token, properties}], missingTokens:[...] }.
 * Note:    do NOT read the styled value back in this same call.
 */
const BINDINGS = [
  { tokenName: "color.action.primary.bg", properties: ["fill"] },
  { tokenName: "radius.control", properties: ["borderRadiusTopLeft", "borderRadiusTopRight", "borderRadiusBottomRight", "borderRadiusBottomLeft"] }
  // REPLACE-ME. Valid TokenProperty values: "fill","strokeColor","fontSize","fontWeight","opacity",
  // "rowGap","columnGap", the 4 borderRadius corners, "width","height".
  // NOT bindable at runtime (gotchas #8): paddings (set resolved value on flex + report the mirrored
  // token) and "all" (use the 4 explicit corner props for radius instead).
];

const shapes = penpot.selection && penpot.selection.length
  ? penpot.selection
  : []; // or: ["SHAPE_ID"].map(id => penpotUtils.findShapeById(id)).filter(Boolean)

const applied = []; const missingTokens = [];
for (const b of BINDINGS) {
  const token = penpotUtils.findTokenByName(b.tokenName);
  if (!token) { missingTokens.push(b.tokenName); continue; }
  for (const sh of shapes) {
    sh.applyToken(token, b.properties);
    applied.push({ shape: sh.id, token: b.tokenName, properties: b.properties });
  }
}
return { applied, missingTokens, note: "Verify resolved values in a SEPARATE execute_code call (async)." };
