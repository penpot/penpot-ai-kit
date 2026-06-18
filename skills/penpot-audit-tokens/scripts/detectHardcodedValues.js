/**
 * detectHardcodedValues.js
 * Purpose: from usage + tokenIndex, classify hardcoded properties as exact / near / no match.
 * Usage:   paste into execute_code (Phase 1), passing the output of collectStyleUsage.js.
 * Input:   USAGE, TOKEN_INDEX, typeOf(property) mapping.
 * Output:  { exact:[...], near:[...], none:[...] }.
 */
const USAGE = [];       // REPLACE-ME
const TOKEN_INDEX = {}; // REPLACE-ME

const typeOf = (p) => p==="fill"||p==="strokeColor" ? "color"
  : p==="borderRadius" ? "borderRadius"
  : (p==="rowGap"||p==="columnGap") ? "spacing" : "dimension";

const exact = []; const near = []; const none = [];
for (const u of USAGE) {
  if (u.bound) continue; // already tokenized
  const type = typeOf(u.property);
  const key = `${type}:${String(u.current).toUpperCase()}`;
  const names = TOKEN_INDEX[key];
  if (names && names.length) exact.push({ ...u, suggestedToken: names[0], exactMatch: true, confidence: "high" });
  else {
    // crude near-match for numbers
    if (type==="spacing" || type==="dimension" || type==="borderRadius") {
      const n = Number(u.current);
      const cand = Object.keys(TOKEN_INDEX).filter(k=>k.startsWith(type+":"))
        .map(k=>({ k, v:Number(k.split(":")[1]) }))
        .filter(x=>!Number.isNaN(x.v))
        .sort((a,b)=>Math.abs(a.v-n)-Math.abs(b.v-n))[0];
      if (cand && Math.abs(cand.v-n) <= 2) near.push({ ...u, suggestedToken: TOKEN_INDEX[cand.k][0], exactMatch:false, confidence:"medium" });
      else none.push({ ...u, confidence:"n/a" });
    } else none.push({ ...u, confidence:"n/a" });
  }
}
return { exact, near, none };
