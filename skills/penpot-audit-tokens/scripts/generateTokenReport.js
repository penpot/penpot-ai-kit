/**
 * generateTokenReport.js
 * Purpose: assemble governance findings into a severity-ranked markdown report.
 * Usage:   paste into execute_code (Phase 3), passing prior phase outputs.
 * Input:   EXACT, NEAR, NONE, OFFGRID, UNRESOLVED, DUPLICATES, UNUSED.
 * Output:  { markdown, counts, exactSwappable }.
 */
const EXACT=[], NEAR=[], NONE=[], OFFGRID=[], UNRESOLVED=[], DUPLICATES=[], UNUSED=[]; // REPLACE-ME

const high=[], med=[], low=[];
EXACT.forEach(f=>high.push(`[noHardcodedColor] ${f.shape}.${f.property} ${f.current} == ${f.suggestedToken} (exact). Swap available. Confidence: high.`));
UNRESOLVED.forEach(u=>high.push(`[noOrphanTokens] ${u.token} -> unresolved {${u.ref}}. Fix in penpot-foundations.`));
NEAR.forEach(f=>med.push(`[noHardcodedColor] ${f.shape}.${f.property} ${f.current} ~ ${f.suggestedToken} (near). Review. Confidence: medium.`));
OFFGRID.forEach(o=>med.push(`[noOffGridSpacing] ${o.shape}.${o.property} ${o.value} -> ${o.suggest}. Review.`));
DUPLICATES.forEach(d=>med.push(`[noOrphanTokens] duplicate value ${d.value}: ${d.tokens.join(", ")}. Consolidate.`));
NONE.forEach(f=>low.push(`[noHardcodedColor] ${f.shape}.${f.property} ${f.current} — no matching token; propose one.`));
UNUSED.forEach(n=>low.push(`[noOrphanTokens] ${n} unused.`));

const md=[`## Token Governance Audit`,
  `Summary: High ${high.length} · Medium ${med.length} · Low ${low.length} | exact-swappable: ${EXACT.length}`,
  ``,`### High`,...(high.length?high.map(s=>`- ${s}`):["- none"]),
  ``,`### Medium`,...(med.length?med.map(s=>`- ${s}`):["- none"]),
  ``,`### Low`,...(low.length?low.map(s=>`- ${s}`):["- none"]),
  ``,`### Actions`,`- [ ] Auto-apply exact swaps (opt-in)`,`- [ ] Route new tokens / rounding to penpot-foundations`].join("\n");

return { markdown: md, counts:{ high:high.length, med:med.length, low:low.length }, exactSwappable: EXACT.length };
