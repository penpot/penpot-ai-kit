# 08 — Anti-rationalization (decks)

Loaded whenever a shortcut feels reasonable. Each row is an excuse the model produces on its own,
why it fails, and the halting countermeasure.

| Excuse | Why it's wrong | Countermeasure (halt) |
|---|---|---|
| "I'll build all 12 slides in one `execute_code`." | One-shot output converges to the same layout on every slide, cannot be self-reviewed per slide, and one thrown error loses everything. | One slide per call (`buildSlide.js`), batches of 3–5, export + look per slide, checkpoint per batch. |
| "An accent line under the title looks polished." | It is the #1 AI-slide tell — a decoration standing in for hierarchy. | Delete the line; carry hierarchy with size (88 vs. 32) and space (48). |
| "Same layout on every slide = consistency." | Consistency is the profile and the motif; identical layout is monotony (`07` caps distinctiveness at 2). | Vary archetype / anchor / tone per `03` monotony rules; no archetype twice in a row. |
| "A plausible stat makes the point land." | Fabricated evidence (`shared/design-quality.md` §6); the audience may check it. | Only numbers from the brief, each with a `source` line; otherwise `— (source TBD)`. |
| "This slide is fine as text only." | Text-only slides read as notes, not design; `auditDeckQuality.js` fails `hasVisual`. | Add the motif, a placeholder image, or convert to big-number / cards. |
| "I'll skip the flow — the user can click through boards." | Without `Deck` the share link, the section starts and the transitions do not exist; the deliverable is not playable. | `wireDeckFlow.js` before "done"; verify `slide.interactions.length` next call. |
| "I'll grab a stock URL to fill the image." | Unlicensed, un-verified, often blocked by CORS; the user did not supply it. | `img-placeholder` with a labeled description; upload only user URLs, verified in two calls. |
| "24 px is readable on my monitor." | Slides are read from 3–6 m; 24 is the caption ceiling, 20 the hard floor, body ≥ 28. | Split the slide (`more slides, not denser`); `belowTypeFloor[]` is a gate. |
| "The default white board is fine for light slides." | Gotcha #11: an unbound literal `#FFFFFF` is off-system and never follows the tonal arc. | `fills = []` then `applyToken(deck.bg.light, ["fill"])`; verify next call. |
| "Centering everything is safe." | Center is the no-decision alignment; it huddles content in the middle 900 px. | Anchor per `03`; center only on cover, quote, closing; use the edges. |
| "The whole page is easier to export at once." | `export_shape("page")` returns an http error (Finding 7) and a contact sheet hides per-slide defects. | `export_shape(slideId)` per slide; look at each. |
| "I'll create the boards on the current page and move them later." | Cross-page moves do not exist; a board on the wrong page is deleted and recreated (Finding 9). | `createDeckPage.js` PHASE=verify must pass before any `createBoard()`. |
| "The freeze slides are approved — I can tweak the title size on slide 07." | A profile number changed after the freeze breaks the first three slides silently. | Keep profile numbers; if a change is needed, re-export 01–03 and re-approve. |
| "Speaker notes are not native, so I'll skip them." | The brief asked for them; the kit has a convention. | Hidden `notes` layer per slide, or a `Notes` page; state which. |

## How to use this table

- Read it at the start of every batch (Phases 2–N) and before declaring the deck done — the excuses
  cluster at exactly those two moments: when the build feels slow, and when it feels finished.
- An excuse that is not listed is still an excuse if it removes a step from the SKILL.md workflow or a gate
  from `auditDeckQuality.js`. State it at the checkpoint and let the user decide; do not decide alone.
- Every halt is one `execute_code` at most: delete the line, add the placeholder, re-bind the fill,
  run `wireDeckFlow.js`. None of them justifies rebuilding a slide from scratch.
