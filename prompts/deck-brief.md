---
description: Deck brief (presentation) — drives penpot-build-deck / brief-to-deck
argument-hint: "[topic] [audience] [slide count]"
---

# Deck brief (presentation)

> Fill every section. Vague briefs produce generic slides. Paste into your agent to drive `penpot-build-deck`.

**Role:** Act as a senior presentation designer who commits to one deck style, reuses the existing
tokens, never fabricates a number, and treats every slide as a composition (not a text page).

## Context
- Topic & one-line thesis of the deck:
- Audience (who is in the room, what they already know, what they care about):
- Occasion & format (pitch, keynote, internal review, workshop, webinar; live or read-alone; duration):
- Brand / existing design system in this file (tokens, type, components to reuse):

## Objective (single)
- The one thing the audience should believe, decide, or do after the last slide:

## Inputs
- Outline (slide by slide, top → bottom; mark which slides are essential vs. optional):
- Target slide count:
- Real data, quotes, numbers and their sources (the agent never invents a figure — missing data
  becomes a clearly-marked placeholder):
- Images / logos / screenshots — **attach them to the chat** and state, for each, what to take from it
  and what to ignore:
- Speaker notes needed (yes/no; where):

## Style
- Deck style profile (e.g. Minimal editorial / Bold product launch / Data-dense analyst / Playful /
  custom) — the agent commits to ONE and applies it on every slide:
- Mood, color direction, type direction (or "derive from the file's tokens"):
- Slide archetypes to favour / avoid (cover, agenda, section divider, big-number, comparison, bento,
  quote, timeline, image-bleed, chart, closing):
- Visual references (attach) with focal direction: what to take, what to explicitly ignore:

## Playback
- Playable View-mode flow named **"Deck"** in slide order (Next/Previous navigate-to interactions).
- Export target (PDF handout, live presentation, both) and any slides excluded from the export:
- Any branching / hidden appendix slides:

## Constraints (inviolable)
- Slide boards are **1920×1080**; one slide = one board; every slide is a composition, never a wall of text.
- Reuse existing tokens and components; bind colors/spacing/radius/type to semantic tokens; no hardcoded values.
- Type floors: **no text under 20 px; body text ≥ 28 px**. Contrast ≥ 4.5:1 (text) / 3:1 (large text & UI).
- Never fabricate a number, quote, logo or claim; placeholders are explicit and listed at the end.
- Board naming: `NN-archetype-slug` (e.g. `01-cover-launch`, `05-big-number-retention`), zero-padded, in order.
- Build in **batches of 3–5 slides with a checkpoint** (exported preview + summary) after each; never one-shot the deck.
- Forbidden patterns / content:
- Avoid the generic-AI look (strict anti-slop mode, `shared/anti-slop.md`): [ ] yes  [ ] no
  — answering here skips the agent's opt-in question; "yes" adds a direction step before styling and
  a 0–100 slop score (must be ≤ 35) after building.

## Acceptance Criteria (quantitative)
- Slide count matches the outline; every essential slide present; order matches the outline.
- One committed deck style across all slides (same type pairing, palette, grid, motif); no two adjacent
  slides share the same archetype unless intentional (e.g. a series of comparisons).
- All type ≥ 20 px, body ≥ 28 px; contrast passes on every slide; no clipped or overflowing text.
- All boards named `NN-archetype-slug`; a flow named "Deck" plays start → end with no dead ends.
- Deck-quality score **≥ 3 on all seven axes** (hierarchy, composition, type, color, spacing, content,
  distinctiveness) before the deck is declared done; weak slides are revised, not shipped.
- Exports cleanly to PDF; placeholders (if any) are listed in the final summary.
- A justified explanation accompanies the result: deck style chosen, what was rejected and why.
