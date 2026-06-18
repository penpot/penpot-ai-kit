# 01 — Intent Taxonomy (router classification map)

> Loaded during **Phase 1 (Intent classification)** of `penpot-router`. This is the full mapping of
> what users actually say to the one skill or workflow that should handle it, plus the fallbacks and
> tie-breakers that keep the router from guessing. The router itself mutates nothing; it picks one
> target and hands off the Token-Aware Brief Contract (SKILL.md §5).

## How to use this file
1. Read the user's literal request.
2. Combine it with Phase 0 state (see `02-preflight-overview.md`): does a token system exist? is
   something selected? is the file empty or mature?
3. Match against the **Primary intents** table. The first strong match wins.
4. If two rows match with comparable confidence, apply the **Tie-breakers**.
5. If the request bundles multiple intents, apply **Multi-intent splitting**.
6. If nothing matches, apply **Fallbacks**.

---

## Primary intents → skill

| # | Canonical intent | Target skill | Strong-signal phrasings | Weak/ambiguous phrasings (need Phase 0 to confirm) |
|---|------------------|--------------|--------------------------|-----------------------------------------------------|
| 1 | Establish/extend foundations: token scales (color, spacing, type, radius), themes | `penpot-foundations` | "set up our design tokens", "create a color scale", "add a spacing scale", "add a dark theme", "define our type ramp", "bootstrap foundations" | "set up our design system" (route to `design-system-bootstrap` workflow if also components/docs are implied) |
| 2 | Build/extend reusable components & variant matrices | `penpot-component-factory` | "make a Button component", "build an Input with states", "add a Size axis", "turn this selection into a component", "create variants for hover/disabled" | "make a button" (a one-off shape vs. a component — confirm reuse intent) |
| 3 | Assemble a screen/view from a brief using the existing system | `penpot-build-screen` | "design a settings screen", "lay out a dashboard", "build the pricing page from this brief", "create a profile view" | "make a page" (could be a Penpot page vs. a UI screen — confirm) |
| 4 | Build a screen/view from code/markup | `penpot-build-from-code` | "create this React page in Penpot", "push this JSX to a board", "build the screen to match this component code", "here's the HTML, make the design" | "build this in Penpot" *with code attached* → from-code; without code → `penpot-build-screen` |
| 4b | Document/annotate a design for handoff | `penpot-document-handoff` | "document this design", "annotate this screen", "prepare this for handoff", "add observation notes", "create a critique card", "explain this flow for devs", "spec this for handoff" | "prepare for handoff" (annotation layer vs. `penpot-rename-layers` for semantic names — confirm: explaining intent → document-handoff; tidy layer names → rename-layers) |
| 5 | Accessibility audit (WCAG 2.1/2.2) | `penpot-audit-accessibility` | "check accessibility", "WCAG AA audit", "contrast check", "are touch targets ≥ 44px", "heading hierarchy review", "a11y report" | "review this design" (could be a11y, tokens, or code-drift — see tie-breakers) |
| 6 | Token governance audit | `penpot-audit-tokens` | "find hardcoded colors", "audit token usage", "what's off the 4px grid", "find orphan/unused tokens", "are we using semantic tokens" | "clean up this design" (tokens vs. layer naming — confirm) |
| 7 | Design-vs-code drift review | `penpot-design-to-code-review` | "does this design match the code", "design-to-code review", "find drift between Penpot and the component", "is the implementation faithful" | "review against the repo" (drift vs. `code-to-penpot-sync` workflow — one board vs. ongoing sync) |
| 8 | Import/migrate from Figma | `penpot-migrate` | "migrate this Figma file", "import from Figma", "bring our Figma library into Penpot", *(a figma.com URL is present)* | "move our designs over" (confirm source is Figma) |
| 9 | Rename layers semantically | `penpot-rename-layers` | "rename these layers", "clean up layer names", "semantic HTML layer names", "fix Rectangle 12 names", "prepare layers for handoff" | "clean up this file" (naming vs. token audit — confirm) |

## Primary intents → workflow (multi-skill orchestrations)

| # | Canonical intent | Target workflow | Strong-signal phrasings | Composed of |
|---|------------------|-----------------|--------------------------|-------------|
| W0 | Meta: decide where to start | `routing` | "I don't know which tool I need", "where do I begin", "help me with this Penpot file" | (this router) |
| W1 | End-to-end design system from scratch/code | `design-system-bootstrap` | "set up a full design system", "tokens + components + docs from our codebase", "bootstrap the whole library" | foundations → component-factory → audit-tokens |
| W2 | Brief → finished, validated screen | `brief-to-screen` | "take this brief and ship a screen", "design and validate this page end to end" | (foundations check) → build-screen → audit-accessibility |
| W3 | Keep Penpot in sync with code | `code-to-penpot-sync` | "sync our components to code", "reconcile Penpot with the repo", "keep design and code aligned" | design-to-code-review → build-from-code → audit-tokens |
| W4 | Full Figma → Penpot migration program | `figma-migration` | "migrate our entire Figma project", "full Figma import with tokens, components, screens" | migrate → foundations → component-factory → rename-layers |
| W5 | Accessibility gate before handoff | `accessibility-gate` | "block handoff until a11y passes", "run the accessibility gate", "validate before we ship" | audit-accessibility (+ rename-layers if heading hierarchy is unreadable) |

---

## Tie-breakers (two rows match)

- **"review this design"** → ask the user, or use Phase 0: if many raw hex/off-grid values →
  `penpot-audit-tokens`; if low-contrast/missing semantics → `penpot-audit-accessibility`; if a code
  reference is attached → `penpot-design-to-code-review`.
- **"set up our design system"** → if the ask includes components or docs, or the file is empty →
  `design-system-bootstrap` (workflow). If it's only token scales → `penpot-foundations` (skill).
- **"build this in Penpot"** → code/markup attached → `penpot-build-from-code`; only a description/brief
  → `penpot-build-screen`.
- **"clean up this file"** → unnamed/auto-named layers dominate → `penpot-rename-layers`; raw values
  dominate → `penpot-audit-tokens`. Use Phase 0 `shapeStructure` to see which.
- **"match the code"** → one-time check → `penpot-design-to-code-review`; ongoing reconciliation →
  `code-to-penpot-sync` (workflow).
- **"prepare this for handoff"** → wants explanatory annotations (intent, flows, business rules, notes)
  → `penpot-document-handoff`; wants only clean semantic layer names → `penpot-rename-layers`. If both,
  rename first (cleaner pin targets), then document.
- **Single skill vs. its workflow** → if the user wants *just that step*, route the skill; if they
  describe an end-to-end outcome spanning steps, route the workflow.

## Multi-intent splitting
When a request bundles intents ("set up tokens, build a Button, and check contrast"):
1. Pick the **primary** objective (usually the first stated, or the prerequisite — foundations before
   components before screens before audits).
2. Route the primary; record the rest in `storage.router.queuedIntents`.
3. After the primary's downstream skill checkpoints out, re-enter the router for the next queued intent.
4. If the bundle *is* a known workflow shape (e.g. tokens → components → audit = `design-system-bootstrap`),
   route the **workflow** instead of splitting.

## Fallbacks (no clean match)
1. **Empty/near-empty file + vague ask** → suggest `design-system-bootstrap` or `penpot-foundations`
   (you need a system before you can build on it).
2. **Mature file + vague ask** → ask one disambiguating question listing the two most likely targets.
3. **Non-Penpot request** → this is not a routing case; the router declines and hands back to the
   general assistant.
4. **Host client already auto-selected a skill** → do not re-dispatch; present this taxonomy as a
   reference map and step aside (graceful degradation, SKILL.md §1 and Critical Rule 7).
