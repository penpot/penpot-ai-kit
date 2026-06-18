# 04 — Report generation

Produce a structured, handoff-ready report. Group by severity; never bury High issues.

## Severity
- **High** — fails AA and blocks use (text contrast < 3:1, unlabeled control, target far below 24px).
- **Medium** — fails AA but usable (contrast 3–4.5:1 on normal text, target 24–44px, ambiguous heading order).
- **Low** — best-practice gaps (AAA misses, minor spacing of targets).

## Format
```
## Accessibility Audit — <scope>  (WCAG 2.1/2.2 AA)
Summary: High N · Medium N · Low N   |  Pass: contrast? targets? headings?

### High
- [1.4.3 Contrast] <element>: ratio 2.9:1 (need 4.5:1). Fix: use color.text.default on color.bg.surface. Confidence: high.
...
### Handoff checklist
- [ ] Fix High contrast issues
- [ ] Enlarge sub-24px targets
- [ ] Confirm heading order h1→h2→…
```

## Rules
- Each issue: severity, criterion, element, current vs required, concrete fix, confidence.
- Note any sampling/scope limits explicitly.
- Offer to route safe fixes to the owning skill (Apply-with-review) — don't auto-apply here.
