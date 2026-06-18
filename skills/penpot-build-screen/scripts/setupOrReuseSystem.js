/**
 * setupOrReuseSystem.js
 * Purpose: detect the existing design system (tokens + components) to reuse; report gaps.
 * Usage:   paste into execute_code (Phase 0/1). Read-only.
 * Input:   none.
 * Output:  { hasTokens, sets, components, recommendation }.
 * Note:    if substantial tokens are missing, hand off to penpot-foundations (do not bootstrap here).
 */
const lib = penpot.library.local;
const sets = lib.tokens.sets.map(s => ({ name: s.name, count: s.tokens.length }));
const components = lib.components.map(c => c.name);
const hasTokens = sets.some(s => s.count > 0);
return {
  hasTokens,
  sets,
  components,
  recommendation: hasTokens
    ? "Reuse existing tokens/components."
    : "No token system found — hand off to penpot-foundations before building the screen."
};
