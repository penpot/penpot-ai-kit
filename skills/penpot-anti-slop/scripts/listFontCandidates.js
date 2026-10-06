/**
 * listFontCandidates.js
 * Purpose: shortlist typefaces available in this Penpot instance that are on NEITHER anti-slop font list
 *          (shared/anti-slop.md §4.3), so the direction step can PROPOSE a type token chosen for the brief.
 * Usage:   paste into execute_code (direction mode, only when the file has no type tokens of its own). Read-only.
 * Input:   QUERY — optional substring filter ("serif", "mono", "grotesk"…); LIMIT — max names returned.
 * Output:  { systemFamilies:[...], candidates:[{ name, fontFamily, weights, hasItalic }], excluded, total }
 * Note:    penpot.fonts.all is large (Google Fonts + local); never return the full list. Verify with
 *          penpot_api_info("FontsContext") if `all` is missing.
 */
const QUERY = "";
const LIMIT = 40;
const LISTS_VERSION = "2026.10.1"; // keep equal to shared/anti-slop/lists.json version
const EXCLUDE = ["Inter", "Inter Tight", "Geist", "Geist Sans", "Roboto", "Arial", "Helvetica", "Helvetica Neue", "SF Pro", "Segoe UI", "Open Sans", "Poppins", "Montserrat", "Lato", "Source Sans Pro", "Source Sans 3", "Work Sans",
  "Space Grotesk", "Instrument Serif", "Instrument Sans", "DM Sans", "DM Serif Display", "Plus Jakarta Sans", "Outfit", "Manrope", "Satoshi", "Sora", "Bricolage Grotesque", "Fraunces", "Playfair Display", "General Sans", "Cabinet Grotesk", "Clash Display", "Onest"]
  .map((f) => f.toLowerCase());

// families the file's own tokens already commit to — these win over any candidate (system first)
const systemFamilies = [];
try {
  for (const set of penpot.library.local.tokens.sets) if (set.active) for (const t of set.tokens)
    if (t.type === "fontFamilies") systemFamilies.push(String(t.resolvedValue ?? t.value));
} catch (e) { /* no tokens */ }

const fonts = penpot.fonts.all || [];
const pool = fonts.filter((f) => !EXCLUDE.includes(String(f.name).toLowerCase())
  && (!QUERY || String(f.name).toLowerCase().includes(QUERY.toLowerCase()))
  && (f.variants || []).length >= 3);       // need at least regular / medium-or-semibold / bold to build a hierarchy
const candidates = pool.slice(0, LIMIT).map((f) => ({
  name: f.name, fontFamily: f.fontFamily,
  weights: [...new Set((f.variants || []).map((v) => v.fontWeight))].sort(),
  hasItalic: (f.variants || []).some((v) => v.fontStyle === "italic"),
}));
return { listsVersion: LISTS_VERSION, systemFamilies, candidates, excluded: EXCLUDE.length, total: pool.length, truncated: pool.length > LIMIT };
