/**
 * validateComponent.js
 * Purpose: verify a component's variant matrix completeness, token usage, and naming.
 * Usage:   paste into execute_code (Phase 4). Read-only.
 * Input:   BASE_NAME; REQUIRED_STATES.
 * Output:  { variants, missingStates, hardcoded:[...], namingIssues:[...], pass }.
 */
const BASE_NAME = "Button"; // REPLACE-ME
const REQUIRED_STATES = ["Default", "Hover", "Pressed", "Focus", "Disabled"];

const variants = penpotUtils.findShapes(s => s.name && s.name.startsWith(BASE_NAME + ","), penpot.currentPage.root);
const states = new Set();
const hardcoded = []; const namingIssues = [];

for (const v of variants) {
  const m = v.name.match(/State=([A-Za-z]+)/);
  if (m) states.add(m[1]);
  // crude hardcoded check: a fill present but no token bound for "fill"
  const hasFill = (v.fills || []).length > 0;
  const tokForFill = v.tokens && v.tokens.fill;
  if (hasFill && !tokForFill) hardcoded.push(v.name);
  if (!/=/.test(v.name)) namingIssues.push(v.name);
}

const missingStates = REQUIRED_STATES.filter(s => !states.has(s));
return {
  variants: variants.map(v => v.name),
  missingStates,
  hardcoded,
  namingIssues,
  pass: missingStates.length === 0 && hardcoded.length === 0 && namingIssues.length === 0
};
