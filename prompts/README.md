# Prompts — token-aware templates

Reusable, fill-in prompt templates you paste into an agent chat (Claude, Cursor, …) to drive Penpot
work. They follow the **token-aware methodology**: a structured brief beats conversational prose
because each instruction acts as a contract that constrains the model and mitigates hallucination.

## Methodology
1. **High-specialization role** — not "a designer" but e.g. "a senior design-systems engineer who never hardcodes values and follows WCAG AA".
2. **Structure like a Jira ticket** — Context, a single Objective, detailed Inputs, inviolable Constraints, quantitative Acceptance Criteria.
3. **Focal direction for visual refs** — tell the model exactly what to look at in an attached image and what to ignore.
4. **Incremental transformations** — sequence small changes; avoid "redesign it all at once".
5. **Mandatory justified explanations** — require the agent to state why each change was made and what it rejected.
6. **Slash-command frontmatter** — every template starts with YAML frontmatter (`description`, `argument-hint`) that Claude Code uses for the slash command; other clients ignore it.

## Templates
| File | Use |
|------|-----|
| `design-brief.md` | brief → screen (drives `penpot-build-screen` / `brief-to-screen`) |
| `deck-brief.md` | outline → presentation deck (drives `penpot-build-deck` / `brief-to-deck`) |
| `component-spec.md` | a component + its variant axes (drives `penpot-component-factory`) |
| `handoff-brief.md` | annotate a design for handoff (drives `penpot-document-handoff`) |
| `migration-brief.md` | Figma → Penpot scope & fidelity (drives `penpot-migrate`) |
| `anti-slop-check.md` | does this screen/deck look AI-generated? score + fixes (drives `penpot-anti-slop`) |
| `audit-request.md` | accessibility / token audit scope (drives the audit skills / `accessibility-gate`) |
| `resume-continuation.md` | resume a truncated long run by `RUN_ID` |
