# 04 — Reading the taxonomy on slide decks

> Loaded when diagnosing or directing `penpot-build-deck` output (`MODE = "deck"` in the probe).
> Same keys and weights as `shared/anti-slop.md` §1 — decks just show them differently. Deck
> craft itself (archetypes, safe area, type floor) stays in `penpot-build-deck`.

| Key | How it shows up in a deck | Healthier deck move |
|---|---|---|
| `violet-gradient` / `decorative-glow` | every slide on a dark violet gradient with a corner glow | one flat background family; save atmosphere (if any) for the cover or section dividers |
| `centered-hero-stack` | cover = centered title + centered subtitle + centered date | title anchored to the grid's left column, metadata set small at the bottom edge |
| `identical-triplet` / `icon-in-tile-cards` | "three pillars" slide: 3 icon tiles + 3 labels, repeated across the deck | vary archetypes (big-number, comparison, quote, timeline); one pillar per slide when each matters |
| `emoji-as-icon` | 🚀 / 💡 / ✅ bullets | plain bullets or numbered text; icons from the system set |
| `round-number-stats` | "10x faster · 99% happy · 24/7 support" slide | one real figure from the brief with a source line (big-number archetype) |
| `abstract-3d-art` | a glossy blob on the cover and the closing slide | the product, a real photo the user supplied, or a typographic cover |
| `numbered-steps-default` | "How it works: 1 2 3" with icons | a timeline of real dates/states, or the actual screens |
| `vague-headline` | slide titles like "Overview", "Our Vision", "The Future" | action titles: each slide's title states its conclusion |
| `slogan-triads` | "Fast. Simple. Secure." on the cover | one specific claim |
| `bento-grid` | a "features" bento slide | a grid only when items genuinely differ in importance — then size by importance |

**Deck-only habits** (reported under the closest key, `content` region kind):
- **Generic closer** — a last slide that only says "Thank you!" / "¡Gracias!" / "Questions?" →
  report as `vague-headline` (p 0.7); fix: close with the ask, the next step, or a contact line.
- **Boilerplate agenda** — "Introduction / Problem / Solution / Conclusion" → `vague-headline`
  (p 0.6, usually *unsure*); fix: agenda items that preview the actual claims.
- **Same archetype three times in a row** — already enforced by `penpot-build-deck`'s structural
  gate; don't double count it here.
