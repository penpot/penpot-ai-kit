# 02 — Hardcoded value detection

A property is **hardcoded** when it carries a raw value but no token is bound for it
(`!shape.tokens[property]`).

## Classify each hardcoded property
1. **Exact match** — the raw value equals an existing token's `resolvedValue` (same hex; same number).
   → safe-set: can be auto-swapped with `shape.applyToken(token, [property])` (with opt-in).
2. **Near match** — within a small threshold (e.g. ΔE for color, ±2px for spacing).
   → suggest the closest token; require review.
3. **No match** — no token represents this value.
   → propose a new token (route creation to `penpot-foundations`); do not create here.

## Color comparison
Normalize hex (uppercase, expand shorthand). For near-match, compare in a perceptual space if possible;
otherwise flag exact-only and list near candidates by simple distance.

## Output per finding
`{ rule:"noHardcodedColor", element, property, current, suggestedToken, exactMatch, confidence }`.
