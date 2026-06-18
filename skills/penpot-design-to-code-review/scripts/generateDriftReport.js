/**
 * generateDriftReport.js — Phase 4 of penpot-design-to-code-review
 *
 * PURPOSE
 *   Assemble the structured DRIFT report by diffing the extracted DESIGN data
 *   (Phase 1, in storage.run.extracted) against the MAPPED CODE data (Phase 3,
 *   supplied by the caller). Normalizes both sides, classifies each property as
 *   match/drift/design-only/code-only, assigns severity, and emits a one-line
 *   reconciliation per non-match.
 *
 * USAGE
 *   Paste into a single `execute_code` call after Phases 1–3. Read-only on canvas.
 *   Replace RUN_ID_HERE and the CODE_MAP / STATE_INPUT placeholders with the
 *   values you built in Phase 3 (references/02, /03). If no code source exists,
 *   set CODE_SOURCE="none" and CODE_MAP=[] — the script runs a design-system
 *   token check instead (graceful degradation).
 *
 * INPUTS
 *   - RUN_ID_HERE                : stable run slug, e.g. "d2c-2026-06-05-a"
 *   - CODE_SOURCE                : "file" | "storybook" | "none"
 *   - CODE_MAP                   : [{ designNodeName, property, codeElement,
 *                                     codeToken|null, codeValue|null }]
 *   - STATE_INPUT                : { designStates:[...], codeStates:[...] }
 *   - AUTHORITATIVE              : { visual:"design", behavior:"code" }
 *   - ROOT_PX                    : rem base for length normalization (default 16)
 *
 * OUTPUT
 *   { ok, report } where report follows references/04 §5 schema.
 *
 * VERIFY-DON'T-GUESS
 *   This script does NOT mutate. If you later apply a fix, hand off to
 *   penpot-infer-tokens / penpot-generate-design under their checkpoints.
 *   Token type spellings: see shared/tokens-schema.json (color, spacing,
 *   borderRadius, fontSizes, ...). Verify shape.tokens via penpot_api_info.
 */

const RUN_ID = "RUN_ID_HERE";                 // REPLACE-ME
const CODE_SOURCE = "REPLACE-ME-file-storybook-or-none";
const CODE_MAP = [/* REPLACE-ME from Phase 3 */];
const STATE_INPUT = { designStates: [/* REPLACE-ME */], codeStates: [/* REPLACE-ME */] };
const AUTHORITATIVE = { visual: "design", behavior: "code" };
const ROOT_PX = 16;

const extracted = (storage.run && storage.run.extracted) || null;
if (!extracted) {
  return { ok: false, reason: "no-extracted-data",
           hint: "Run extractMarkupStyle.js (Phase 1) first; storage.run.extracted is empty." };
}

// ---------- normalization ----------
function normColor(v) {
  if (v == null) return null;
  let s = String(v).trim().toLowerCase();
  const rgb = s.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgb) {
    const h = n => Number(n).toString(16).padStart(2, "0");
    return "#" + h(rgb[1]) + h(rgb[2]) + h(rgb[3]);
  }
  s = s.replace("#", "");
  if (s.length === 3) s = s.split("").map(c => c + c).join("");
  return s.length === 6 ? "#" + s : v;
}
function normLen(v) {
  if (v == null) return null;
  if (typeof v === "number") return Math.round(v);
  const m = String(v).trim().match(/^(-?[\d.]+)(px|rem|em)?$/);
  if (!m) return v;
  const n = parseFloat(m[1]);
  if (m[2] === "rem" || m[2] === "em") return Math.round(n * ROOT_PX);
  return Math.round(n);
}
function normWeight(v) {
  if (v == null) return null;
  const map = { thin:100, light:300, normal:400, regular:400, medium:500, semibold:600, bold:700, black:900 };
  return map[String(v).toLowerCase()] ?? Number(v);
}

// ---------- WCAG contrast (for color-drift severity escalation) ----------
function lum(hex) {
  const h = String(hex).replace("#", "");
  const ch = i => {
    const c = parseInt(h.substr(i, 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * ch(0) + 0.7152 * ch(2) + 0.0722 * ch(4);
}
function contrast(a, b) {
  if (!a || !b) return null;
  const l1 = lum(a), l2 = lum(b);
  const r = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  return Math.round(r * 100) / 100;
}

// ---------- build a flat design property table from perNode ----------
const designProps = [];
for (const n of extracted.perNode) {
  if (n.rawFill && n.rawFill.fillColor) {
    designProps.push({
      node: n.name, dimension: "color", property: "fill",
      designValue: normColor(n.rawFill.fillColor),
      token: n.boundTokens.fill || n.boundTokens.fills || null,
    });
  }
  if (n.radius != null) {
    designProps.push({
      node: n.name, dimension: "radius", property: "borderRadius",
      designValue: normLen(n.radius), token: n.boundTokens.borderRadius || null,
    });
  }
  if (n.typography) {
    designProps.push({ node: n.name, dimension: "typography", property: "fontSize",
      designValue: normLen(n.typography.fontSize), token: n.boundTokens.fontSize || null });
    designProps.push({ node: n.name, dimension: "typography", property: "fontWeight",
      designValue: normWeight(n.typography.fontWeight), token: n.boundTokens.fontWeight || null });
  }
}
if (extracted.spacing) {
  for (const k of ["rowGap","columnGap","topPadding","rightPadding","bottomPadding","leftPadding"]) {
    if (extracted.spacing[k] != null) {
      designProps.push({ node: extracted.spacing.source, dimension: "spacing", property: k,
        designValue: normLen(extracted.spacing[k]),
        token: null /* spacing tokens usually bound on layout; record raw + grid */ });
    }
  }
}

// ---------- diff against the code map ----------
function findCode(node, property) {
  return CODE_MAP.find(c => c.designNodeName === node && c.property === property) || null;
}
let idn = 0;
const findings = [];
for (const dp of designProps) {
  const code = (CODE_SOURCE === "none") ? null : findCode(dp.node, dp.property);
  const codeValue = code
    ? (dp.dimension === "color" ? normColor(code.codeValue)
       : dp.dimension === "typography" && dp.property === "fontWeight" ? normWeight(code.codeValue)
       : normLen(code.codeValue))
    : null;
  const codeToken = code ? (code.codeToken || null) : null;

  let status, delta = null, grid4px = null, wcag = null, severity, reconciliation;

  if (CODE_SOURCE !== "none" && code == null) {
    status = "design-only";
  } else if (CODE_SOURCE !== "none" && codeValue != null && dp.designValue == null) {
    status = "code-only";
  } else if (CODE_SOURCE === "none") {
    status = "design-only"; // token-only check: report design hygiene
  } else if (String(dp.designValue) === String(codeValue) &&
             (!dp.token || !codeToken || dp.token === codeToken)) {
    status = "match";
  } else {
    status = "drift";
  }

  // dimension-specific delta + grid
  if (dp.dimension === "spacing") {
    grid4px = (typeof dp.designValue === "number") ? (dp.designValue % 4 === 0) : null;
    if (codeValue != null && typeof dp.designValue === "number")
      delta = codeValue - dp.designValue;
  }
  if (dp.dimension === "color" && status === "drift" && codeValue) {
    // contrast impact requires the mapped background; caller may inject it via CODE_MAP note
    const bg = (code && code.bgColor) ? normColor(code.bgColor) : null;
    const dC = contrast(dp.designValue, bg), cC = contrast(codeValue, bg);
    if (dC != null && cC != null) delta = `contrast ${dC}:1 → ${cC}:1`;
    if (cC != null && cC < 4.5) wcag = "1.4.3";
  }

  // severity rubric (references/04 §3)
  if (wcag) severity = "Critical";
  else if (status === "drift" &&
           (dp.dimension === "typography" ||
            (dp.dimension === "spacing" && typeof delta === "number" && Math.abs(delta) >= 8) ||
            (dp.token && codeToken && dp.token !== codeToken)))
    severity = "Major";
  else if (status === "design-only" || status === "code-only") severity = "Major";
  else severity = "Minor";

  // hardcoded-value hygiene: no bound token even if value matches
  const notTokenized = (dp.token == null);

  if (status === "match" && !notTokenized) {
    // still record matches in summary but skip a findings row unless useful
  } else {
    reconciliation =
      status === "design-only" && CODE_SOURCE !== "none"
        ? `Code missing ${dp.property} for "${dp.node}" (design ${dp.designValue}); add it.`
      : status === "code-only"
        ? `Code declares ${dp.property}=${codeValue} not present in design; confirm intent.`
      : status === "drift" && dp.token && codeToken && dp.token !== codeToken
        ? `Token mismatch: design uses ${dp.token}, code uses ${codeToken}; align to ${AUTHORITATIVE.visual === "design" ? dp.token : codeToken}.`
      : status === "drift"
        ? `Set code ${dp.property} to ${dp.designValue}${dp.token ? " (token " + dp.token + ")" : ""}.`
      : notTokenized
        ? `Value ${dp.designValue} on "${dp.node}" is not tokenized; propose a token (penpot-infer-tokens).`
      : null;

    findings.push({
      id: `drift-${dp.dimension}-${String(++idn).padStart(2, "0")}`,
      dimension: dp.dimension, designNode: dp.node, codeElement: code ? code.codeElement : null,
      designValue: dp.designValue, codeValue, token: dp.token, codeToken,
      status, delta, grid4px, wcag,
      severity: (status === "match" && notTokenized) ? "Minor" : severity,
      reconciliation,
    });
  }
}

// ---------- state matrix ----------
const allStates = Array.from(new Set([
  ...(STATE_INPUT.designStates || []), ...(STATE_INPUT.codeStates || []),
]));
const cells = allStates.map(s => ({
  state: s,
  design: (STATE_INPUT.designStates || []).includes(s),
  code: (STATE_INPUT.codeStates || []).includes(s),
}));
for (const c of cells) {
  if (c.design !== c.code) {
    findings.push({
      id: `drift-state-${c.state}`, dimension: "state",
      designNode: null, codeElement: null,
      designValue: c.design, codeValue: c.code, token: null, codeToken: null,
      status: c.design ? "design-only" : "code-only",
      delta: null, grid4px: null,
      wcag: /focus/i.test(c.state) ? "2.4.7" : null,
      severity: "Critical",
      reconciliation: c.design
        ? `Code missing the "${c.state}" state present in the design; implement it.`
        : `Code has a "${c.state}" state with no design counterpart; add the variant or remove.`,
    });
  }
}

// ---------- summary ----------
const summary = {
  match: findings.filter(f => f.status === "match").length,
  drift: findings.filter(f => f.status === "drift").length,
  designOnly: findings.filter(f => f.status === "design-only").length,
  codeOnly: findings.filter(f => f.status === "code-only").length,
  critical: findings.filter(f => f.severity === "Critical").length,
  major: findings.filter(f => f.severity === "Major").length,
  minor: findings.filter(f => f.severity === "Minor").length,
};

const notes = [];
if (CODE_SOURCE === "none")
  notes.push("No code source: design-system token check only; findings are design-side (hardcoded/off-grid). codeSource=none.");
if (extracted.notes && extracted.notes.length) notes.push(...extracted.notes);

const report = {
  runId: RUN_ID, scope: extracted.perNode.map(n => n.name),
  codeSource: CODE_SOURCE, authoritative: AUTHORITATIVE, rootPxAssumption: ROOT_PX,
  summary, findings,
  stateMatrix: { rows: allStates, cells }, notes,
};

storage.run = storage.run || {};
storage.run.report = report;

return { ok: true, report };
