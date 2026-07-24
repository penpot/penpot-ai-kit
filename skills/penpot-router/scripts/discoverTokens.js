/**
 * discoverTokens.js — Phase 0b: token-state sense
 * Purpose:  read-only check of whether a design system (token sets) already exists.
 * Usage:    paste into an execute_code call after discoverState.js. Mutates nothing.
 * Input:    none.
 * Output:   { hasTokens, overview }.
 * Note:     verify tokenOverview() signature with penpot_api_info before relying on it.
 */
const ov = penpotUtils.tokenOverview();
return {
  hasTokens: !!(ov && ov.totalTokens),
  overview: ov
};
