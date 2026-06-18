/**
 * checkTouchTargets.js
 * Purpose: flag interactive elements below WCAG 2.2 target size (24x24; note 44x44 best practice).
 * Usage:   paste into execute_code (Phase 2).
 * Input:   INTERACTIVES [{id,name,w,h}] (from collectAccessibilityData.js).
 * Output:  { fails24:[...], below44:[...] }.
 */
const INTERACTIVES = []; // REPLACE-ME
const MIN_AA = 24, BEST = 44;

const fails24 = []; const below44 = [];
for (const e of INTERACTIVES) {
  if ((e.w||0) < MIN_AA || (e.h||0) < MIN_AA) fails24.push({ name:e.name||e.id, size:`${e.w}x${e.h}` });
  else if ((e.w||0) < BEST || (e.h||0) < BEST) below44.push({ name:e.name||e.id, size:`${e.w}x${e.h}` });
}
return { fails24, below44 };
