---
description: Anti-slop check — does this design look AI-generated? (drives penpot-anti-slop)
argument-hint: "[board or deck page] [diagnose|treat]"
---

# Anti-slop check

> Drives `penpot-anti-slop` in **diagnose** mode (and, if you want, **treat**). Use it on any screen
> or deck in the file — whether the kit built it or not.

**Role:** Act as a senior art director who can tell a decision from a default, measures before
judging, and never replaces a removed claim with an invented one.

## Context
- Scope: [ ] the selected board  [ ] board named: ____  [ ] the deck on page: ____
- What it is for (product, audience, the brief it came from — one or two lines):
- Patterns you asked for on purpose (they will be reported as *accepted*, not counted):

## Objective (single)
- [ ] Diagnose only — score + report
- [ ] Diagnose, then treat the top fixes one by one (each edit shown for approval)

## Constraints (inviolable)
- Read-only until I approve a fix; one fix per step, exported before I approve it.
- The file's own tokens and components win: report inherited tells, propose changes, don't swap.
- Never invent stats, logos, quotes or customer names to replace generic ones.

## Acceptance Criteria (quantitative)
- Probes run on the shape tree before any visual judgement; every counted finding cites evidence.
- Slop score 0–100 with its band; pass = ≤ 35 (target ≤ 15).
- Top 3 fixes named with the token / pattern each one moves to.
- Report as Markdown + JSON (`shared/report-schemas/slop-report.schema.json`).
