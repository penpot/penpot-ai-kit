# 04 — Report generation (governance)

## Severity
- **High** — systematic hardcoding (a raw color used widely that has an exact token), unresolved token references.
- **Medium** — near-match hardcoded values, off-grid spacing, duplicate tokens.
- **Low** — unused tokens, minor consolidation opportunities.

## Format
```
## Token Governance Audit — <scope>
Summary: High N · Medium N · Low N | exact-swappable: N

### High
- [noHardcodedColor] header/title fill #0066FF == color.action.primary.bg (exact). Swap available. Confidence: high.
- [noOrphanTokens] color.text.inverse → unresolved reference {color.gray.0}. Fix in penpot-foundations.
### Medium
- [noOffGridSpacing] card-container rowGap 18 → nearest spacing.4 (16) or spacing.5 (20). Review.
### Low
- [noOrphanTokens] spacing.10 unused.

### Actions
- [ ] Auto-apply exact swaps (opt-in)
- [ ] Route new tokens / rounding to penpot-foundations
```

## Rules
- Mark which findings are **exact-swappable** (safe set) vs review-only.
- Each finding: severity, rule, element, current, suggested token, exactMatch, confidence.
- State scope/sampling. Offer the exact-swap auto-apply at the checkpoint; never apply silently.
