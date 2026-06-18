/**
 * generateReport.js
 * Purpose: assemble collected checks into a severity-ranked markdown report.
 * Usage:   paste into execute_code (Phase 4), passing the prior results in.
 * Input:   CONTRAST_FAILS, TARGET_FAILS, HEADING_ISSUES.
 * Output:  { markdown, counts }.
 */
const CONTRAST_FAILS = []; // REPLACE-ME
const TARGET_FAILS = [];    // REPLACE-ME
const HEADING_ISSUES = [];  // REPLACE-ME

const high = []; const med = []; const low = [];
CONTRAST_FAILS.forEach(f => {
  const line = `[1.4.3 Contrast] ${f.name}: ratio ${f.ratio}:1 (need ${f.required}:1). Fix: use a higher-contrast token pair. Confidence: high.`;
  (f.ratio < 3 ? high : med).push(line);
});
TARGET_FAILS.forEach(t => high.push(`[2.5.8 Target Size] ${t.name}: ${t.size} (need 24x24). Fix: increase min-size/padding token. Confidence: high.`));
HEADING_ISSUES.forEach(h => med.push(`[1.3.1 Info & Relationships] ${h}. Fix: correct heading order / semantic names. Confidence: medium.`));

const md = [
  `## Accessibility Audit (WCAG 2.1/2.2 AA)`,
  `Summary: High ${high.length} · Medium ${med.length} · Low ${low.length}`,
  ``,
  `### High`, ...(high.length?high.map(s=>`- ${s}`):["- none"]),
  ``, `### Medium`, ...(med.length?med.map(s=>`- ${s}`):["- none"]),
  ``, `### Low`, ...(low.length?low.map(s=>`- ${s}`):["- none"]),
  ``, `### Handoff checklist`,
  `- [ ] Fix High contrast issues`, `- [ ] Enlarge sub-24px targets`, `- [ ] Confirm heading order`
].join("\n");

return { markdown: md, counts: { high: high.length, med: med.length, low: low.length } };
