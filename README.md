# Penpot AI Kit

[![Latest release](https://img.shields.io/github/v/release/penpot/penpot-ai-kit?label=release&color=6911d4)](https://github.com/penpot/penpot-ai-kit/releases/latest)
[![validate](https://github.com/penpot/penpot-ai-kit/actions/workflows/validate.yml/badge.svg)](https://github.com/penpot/penpot-ai-kit/actions/workflows/validate.yml)
[![Last commit](https://img.shields.io/github/last-commit/penpot/penpot-ai-kit)](https://github.com/penpot/penpot-ai-kit/commits/main)
[![License: CC BY 4.0](https://img.shields.io/badge/license-CC%20BY%204.0-lightgrey)](LICENSE)
[![Requires Penpot MCP](https://img.shields.io/badge/requires-Penpot%20MCP-000000)](https://help.penpot.app/mcp/)

<img width="1278" height="639" alt="Penpot AI Kit" src="https://github.com/user-attachments/assets/f4d016df-ebea-4520-af69-058ae300488e" />

**Let an AI assistant work directly inside your Penpot file, while you stay in control.**

Penpot’s MCP already works well with the right prompts. You can ask an AI assistant like Claude, OpenCode or Cursor to edit a real Penpot file, use your components and design tokens, follow your system rules, check accessibility, and show you changes before they are applied.

This AI Kit builds on that.

Instead of writing a fresh prompt for every task, you give the assistant a clear set of skills and instructions. That helps it handle common workflows more reliably, move faster, and produce better results with less back-and-forth.

This is not a “type a prompt and get a flat image” workflow. The AI creates real Penpot designs you can edit afterward, with actual tokens, components, and layouts.

The kit is meant to be adapted. You can shape it around your team’s workflow, add new skills, refine the agent’s instructions, and share improvements so it works better across different projects and design systems.

> New to this? The fastest path is to let your AI assistant **install the kit for you** —
> see **[Fastest setup](#fastest-setup--let-your-assistant-install-it)** below.
> Prefer to do it by hand? The **[Quick start — Step by step guide](#quick-start--step-by-step-guide)** walks every step. No coding required.

---

## Watch this video

[![Watch the video](https://github.com/user-attachments/assets/a67258b9-06c9-4b87-b632-92b3e61990ed)](https://www.youtube.com/watch?v=l-dsgHiycIY)

---

## What you can ask it to do

Just describe what you want in plain language. The kit figures out the right tool for the job.

| You say… | It does… |
|----------|----------|
| “Set up a color, spacing and type system (design tokens) for this file.” | Builds a clean, themeable token system (incl. light/dark). |
| “Create a Button with all its states — hover, pressed, focus, disabled.” | Builds a real component with a complete set of variants, fully tokenized. |
| “Design a dashboard (or landing page) from this brief.” | Builds the screen section by section, using your existing system. |
| “Build a 12-slide pitch deck from this outline.” | Designs the deck slide by slide (1920×1080 boards), wires it into a playable flow, ready to export as PDF. |
| “Turn this app screen / code into a Penpot design.” | Recreates it in Penpot, wired to your tokens. |
| “Check this screen for accessibility problems.” | Audits contrast, tap-target sizes, headings (WCAG AA) and reports issues. |
| “Find hardcoded colors that should be tokens.” | Audits the file for off-system values and suggests fixes. |
| “Bring this Figma file into Penpot.” | Migrates layout, components and variables with fidelity. |
| “Rename these messy layers properly.” | Renames layers to clear, semantic names. |
| “I'm not sure where to start.” | It asks a quick question and routes you to the right place. |

You don't need to know the names of any “skills” — just ask.

---

## Fastest setup — let your assistant install it

If your AI assistant supports MCP **and** can read this folder (Claude Code, Claude Desktop, Cursor,
Windsurf, OpenCode, OpenAI Codex — CLI or desktop app — or similar), you don't have to wire anything by
hand. Open this folder in your assistant and say:

```
Install this Penpot AI Kit
```

The assistant reads [`INSTALL.md`](INSTALL.md) and runs a short, guided install: it detects your client,
asks just two things (**remote or local Penpot?** and your **MCP Key**), then connects the Penpot MCP and
wires the kit's behavior (skills, workflows, and the brief templates in [`prompts/`](prompts/)) — and
verifies the live connection before declaring success. It **confirms before every change**, never prints
your key, and is safe to re-run.

How it stays clean and safe:
- **This clone is a read-only seed.** The installer copies the kit once to `~/.penpot-ai-kit` and never
  modifies (or writes into) this folder — so you can move or delete the clone afterward.
- **Your MCP Key stays out of any repo.** It's written only to your client's user/global config.
- It records an `install-manifest.json` so uninstalling is just removing those files. Exactly what each
  client gets is in [`docs/clients.md`](docs/clients.md).
- No MCP-capable assistant, or want to understand each step? Use the manual quick start below.

### Other things you can ask it (after installing)

Same deal — open this folder in your assistant and say it in plain language. All of these are
covered by the same playbook ([`INSTALL.md`](INSTALL.md)), confirm before changing anything, and are
safe to re-run:

| You say… | It does… |
|----------|----------|
| “Update this Penpot AI Kit” (e.g. after a `git pull` or local edits) | One step (`update.mjs`): refreshes the installed copy **and** re-wires every installed client's skills. Idempotent. |
| “Is my Penpot AI Kit up to date?” | Compares clone vs. installed copy (a content hash, costs ~0 tokens) and answers in one line. |
| “Set up automatic update checks” | Wires a silent session-start hook that only speaks up when the kit is stale (Claude Code). |
| “Install the kit for Cursor too” | Re-runs the install for another client — earlier installs are kept and recorded. |
| “I rotated my MCP Key” / “Switch me to my self-hosted Penpot” | Updates the `penpot` MCP entry in your client's user config (never the repo). |
| “Clean up old penpot skills” | Finds stale `penpot-*` skills from older kit generations that shadow the current ones, and removes them after you confirm. |
| “Verify the Penpot connection” | Live check: `high_level_overview` + a read-only probe of your open file. |
| “Uninstall the Penpot AI Kit” | Removes everything the install manifest recorded: wired files, the `penpot` MCP entry, the installed copy. |

## Install as a Claude Code plugin

The kit also ships as a **Claude Code plugin** (manifests in `.claude-plugin/`). In Claude Code:

```
/plugin marketplace add penpot/penpot-ai-kit
/plugin install penpot-ai-kit@penpot-ai-kit
```

Then configure the Penpot MCP separately — follow [`docs/setup-remote.md`](docs/setup-remote.md) or run
`node scripts/install/write-mcp-config.mjs` from a clone. Skills appear namespaced as
`penpot-ai-kit:penpot-*`, and the brief templates as `/penpot-ai-kit:design-brief`,
`/penpot-ai-kit:deck-brief`, etc.

> ⚠️ **Don't combine the plugin with the Node installer for Claude Code** — the same skills would
> trigger twice. If you used the installer, run `node scripts/install/uninstall.mjs --yes` first;
> or skip the plugin and keep the installer, whichever you prefer.

---

## Quick start — Step by step guide

You'll connect your AI assistant to Penpot once (about 5 minutes), then just chat with it.

**What you need:**
- A **Penpot account** (penpot.app).
- An **AI assistant that supports MCP** — e.g. **Claude Desktop** or **Cursor**. (MCP is just the
  secure bridge that lets the assistant work inside your open Penpot file.)

### Step 1 — Get your Penpot “MCP Key”
In Penpot: **Your Account → Integrations → MCP Key**, and generate a key. Keep it private (treat it
like a password). Full details: [`docs/setup-remote.md`](docs/setup-remote.md).

### Step 2 — Connect your AI assistant to Penpot
Open the ready-made config in [`templates/`](templates/) for your assistant
(`claude-desktop-config.remote.json` or `cursor-mcp-config.json`), paste in your MCP Key, and add it to
your assistant. The setup guide walks through exactly where each file goes.

### Step 3 — Open your Penpot file and the plugin (keep it open!)
Open the file you want to work in and **leave that browser tab open** the whole time. If you close it, the assistant loses its connection.

### Step 4 — Point the assistant at this kit
Tell your assistant to read this folder’s **`AGENTS.md`** (most assistants let you attach a folder or a
file as context / project instructions). That's what teaches it the good habits — use your system,
never hardcode, ask before changing things.

### Step 5 — Just ask, in plain language
Try one of the examples above, e.g.:

> “Read AGENTS.md first. Then set up a starter design-token system for this file: a brand color, a
> neutral gray scale, a 4px spacing scale, and light/dark themes. Show me before applying.”

The assistant will check your file, propose a plan, and get to work in small steps.

### Step 6 — Review at each checkpoint
The kit is built to **pause and show you a preview** (an exported image) plus a short summary, and ask
for your OK before continuing. “Looks good” only approves the step you just saw — it always tells you
what's next. You're never surprised.

> ✅ **First thing to try:** open a *fresh, empty* Penpot file and ask it to *“set up a starter design
> system and build me one Button component with all its states.”* It's a great 5-minute taste of the kit.

---

## A few good-to-knows
- **It works on your real file.** If you're trying it out, use a **duplicate** of an important file until
  you trust it.
- **It asks before meaningful changes** and only auto-applies tiny, safe things (like renaming an
  unnamed layer). It will never restructure components or delete shared assets without asking.
- **It prefers your existing components and tokens** over inventing new ones, so results stay on-brand
  and editable.
- **It grades its own design work.** Before declaring a screen done, it scores the result on seven
  design axes (hierarchy, composition, type, color, spacing, content, distinctiveness) against
  numeric targets — and revises weak spots instead of shipping “technically correct but bland”.
- **If something looks off**, ask it to explain what it did or to undo the last step.

---

## How it works (in one minute)
- **AGENTS.md** — the assistant's “house rules” (use the system, never hardcode, ask first).
- **Skills** (`skills/`) — focused how-to recipes for specific jobs (tokens, components, audits, …).
- **Workflows** (`workflows/`) — multi-step recipes that chain skills (e.g. *design a screen, then keep
  improving it until it passes both accessibility and the design-quality bar*).
- A built-in **router** reads your request and picks the right skill — so you don't have to.

For the full picture, see [`docs/architecture.md`](docs/architecture.md).

---

## The catalog — everything the kit can do

You never need to memorize these names — the router picks for you. This is the inventory, so you
know what's on the shelf.

**How each skill behaves** (its default mode):
🔍 **Suggest** — reports and proposes, never touches the canvas · ✏️ **Review** — applies step by
step, shows a preview at every checkpoint and waits for your OK · ⚡ **Auto-fix** — applies directly,
but only trivially-safe changes (like renaming `Rectangle 12`).

### Skills — build & create

| Skill | What it does | Say something like… |
|-------|--------------|----------------------|
| ✏️ `penpot-foundations` | Sets up your design tokens: color/spacing/type scales, semantic tiers, **light & dark themes** — or infers tokens from an existing design. | *“Set up a starter token system for this file.”* |
| ✏️ `penpot-component-factory` | Builds components with the **complete** variant matrix — sizes, hierarchies, hover/pressed/focus/disabled — fully tokenized. | *“Create a Button with all its states.”* |
| ✏️ `penpot-build-screen` | Designs a screen from a written brief, **section by section**, reusing your tokens and components — then **scores its own result** against the kit's design-quality bar (hierarchy, composition, type, color, spacing…) and revises what's weak. | *“Design a settings page from this brief.”* |
| ✏️ `penpot-build-from-code` | Rebuilds an existing app page/component **from its code**, bound to your design system. | *“Turn this React page into a Penpot screen.”* |
| ✏️ `penpot-document-handoff` | Documents a design for **handoff**: a hideable annotation layer beside it — context card (the “How might we”, business rules, links, status), numbered pins on the UI, matching observation/recommendation notes, tooltips. Never touches the design. | *“Document this screen for handoff.”* |
| ✏️ `penpot-build-deck` | Designs a **presentation deck** from a brief: 1920×1080 slide boards built one slide at a time, a committed deck style, varied slide layouts (cover, agenda, big-number, comparison, bento, quote, timeline, image-bleed…), tokenized, wired into a **playable View-mode flow** and exportable to PDF. | *“Build a pitch deck from this outline.”* |

### Skills — audit & review (they report; they never change your file)

| Skill | What it does | Say something like… |
|-------|--------------|----------------------|
| 🔍 `penpot-audit-accessibility` | WCAG 2.1/2.2 AA audit: contrast, tap-target sizes, heading structure, focus order — with a severity-ranked report. | *“Check this screen for accessibility problems.”* |
| 🔍 `penpot-audit-tokens` | Design-system governance: hardcoded values, off-grid spacing, orphan/duplicate tokens, detached instances. | *“Find hardcoded colors that should be tokens.”* |
| 🔍 `penpot-design-to-code-review` | Compares the Penpot design against the real component/Storybook and reports the **drift**, side by side. | *“Does my code match this design?”* |
| 🔍 `penpot-anti-slop` | **Opt-in** check against the generic-AI look (violet gradients, centered hero with a pill badge, three identical icon cards, emoji icons, default fonts, buzzwords…). When building, the kit asks once per file whether you want it; with *yes* it names the defaults it would reach for and picks brief-driven alternatives before styling, then scores the result 0–100 (tree probes + visual review) and loops until it's ≤ 35. On any existing design it reports the score and proposes fixes — applied only if you approve each one. | *“Does this landing look AI-generated?”* |
| 🔍 `penpot-design-md` | Extracts a portable **DESIGN.md** spec from the file's real tokens, assets and sampled components — so humans and coding agents can reproduce the system without opening Penpot. | *“Generate a DESIGN.md for this design system.”* |

### Skills — migrate & housekeeping

| Skill | What it does | Say something like… |
|-------|--------------|----------------------|
| ✏️ `penpot-migrate` | Migrates Figma → Penpot with fidelity: Auto Layout → flex, Variables → tokens, component sets → variants. | *“Bring this Figma file into Penpot.”* |
| ⚡ `penpot-rename-layers` | Renames messy auto-generated layers to clear, semantic names (`nav`, `card-container`, `h1`…). | *“Clean up these layer names.”* |
| 🔍 `penpot-router` | The dispatcher: reads your request, checks the file's state, and routes to exactly **one** of the above. | *“I'm not sure where to start.”* |

### Workflows — multi-step recipes that chain skills

| Workflow | The recipe | Ask for it like… |
|----------|------------|-------------------|
| `brief-to-screen` | build a screen → score design quality + audit accessibility → **fix and repeat until both pass** | *“Take this brief and ship an accessible screen.”* |
| `brief-to-deck` | build a deck → accessibility on slides + deck-quality score → **fix and repeat until both pass** | *“Turn this outline into a polished, playable deck.”* |
| `design-system-bootstrap` | tokens → core components → governance audit → clean naming | *“Bootstrap a full design system in this file.”* |
| `code-to-penpot-sync` | build from code → drift review → reconcile, in a loop | *“Keep this Penpot file in sync with the repo.”* |
| `figma-migration` | migrate → reconcile tokens → accessibility + governance audits | *“Migrate our whole Figma project, end to end.”* |
| `accessibility-gate` | both audits in parallel → one merged report → only safe fixes, with your OK | *“Run every check before we hand this off.”* |
| `routing` | preflight reads + dispatch to exactly one target | *“Where do I begin with this file?”* |

### Brief templates — structured prompts for better results

Vague asks produce generic output; these fill-in templates produce briefs the skills can act on
precisely. In **Claude Code** they're slash commands; in other clients, open the file in
[`prompts/`](prompts/) and fill it in chat.

| Template | Feeds | Use it when… |
|----------|-------|---------------|
| `/penpot-design-brief` | build-screen | you want a screen and can describe audience, sections, constraints |
| `/penpot-component-spec` | component-factory | you know exactly which axes/states the component needs |
| `/penpot-handoff-brief` | document-handoff | you're annotating a screen for devs and want the context card + pins pre-filled |
| `/penpot-deck-brief` | build-deck | you want a presentation and can describe audience, occasion, outline and style |
| `/penpot-migration-brief` | migrate | you're scoping a Figma migration (fidelity, mapping rules) |
| `/penpot-anti-slop-check` | anti-slop | you want an existing screen or deck scored for the generic-AI look, with fixes |
| `/penpot-audit-request` | the audits | you want a formal, scoped audit (level, exceptions, scope) |
| `/penpot-resume-continuation` | any long run | a multi-phase run got interrupted and must resume safely |

### Kit lifecycle

Install, update, verify, multi-client, cleanup, uninstall — all in plain language. See
[**Other things you can ask it**](#other-things-you-can-ask-it-after-installing) above.

---

## For technical users

<details>
<summary>Skill catalog, architecture, repository layout, contributing</summary>

### Who it's for
- **Design system teams** — tokens, libraries, variants, governance, theming.
- **Product / UI designers** — build screens and components from a brief, accessibly.
- **Design engineers** — design↔code bridge, token mapping, drift review.
- **Teams migrating to Penpot** — from Figma, with fidelity.

Built on open standards (Anthropic Agent Skills, Agent Skills Discovery, MCP, Claude Code plugins). It is **content only** —
files and manifests, no build step.

### Skill catalog
The single inventory of skills, workflows and brief templates lives in
[**The catalog**](#the-catalog--everything-the-kit-can-do) above (one source — it won't drift).
Per-skill default modes are pinned in [`policies/modes.json`](policies/modes.json); audiences per
skill are recorded in [`skills.json`](skills.json).

### Layered architecture
```
AGENTS.md (instructions)
  → skills/ (capabilities)
    → workflows/ (orchestration)
      → Penpot MCP (core tools: high_level_overview, penpot_api_info, execute_code, export_shape; + import_image in local mode)
        → policies/ (suggest / review / autofix + safe set)
          → evals/ (golden tests)
shared/ = single source of truth (tool reference, API gotchas, token schema, naming, state, modes,
          visual self-review, design quality, report schemas, pipeline schema, capability probe)
```

### Repository layout
```
AGENTS.md            instructions layer
INSTALL.md           conversational installer playbook ("Install this Penpot AI Kit")
scripts/install/     installer helpers (install one-shot + detect-client, install-seed, write-mcp-config, install-behavior, update one-step, check-updates, lib)
shared/              single source of truth (tool ref, gotchas, token schema, naming, state, modes, SKILL template, visual self-review, design-quality.md, report-schemas/, pipeline.schema.json, scripts/capability-probe.js)
skills/              13 skills, each: SKILL.md + references/ (progressive disclosure) + scripts/ (execute_code templates)
workflows/           7 orchestration recipes (README.md prose + pipeline.json)
prompts/             token-aware brief templates
templates/           MCP client configs (remote/local) + local-model calibration
policies/            modes (suggest/review/autofix), safe set, approval checkpoints
evals/               golden tests + fixtures
docs/                setup, troubleshooting, architecture, glossary, mcp-api-findings (dev feedback)
skills.json          aggregate manifest · .well-known/agent-skills/index.json discovery index · skills.lock version pins
.claude-plugin/     Claude Code plugin + marketplace manifests (optional install path)
```

### Contributing a skill
1. Copy the anatomy in `shared/SKILL-template.md` (frontmatter + the 16 sections).
2. Ground every API call in `shared/penpot-mcp-tool-reference.md` + `shared/plugin-api-gotchas.md`;
   verify unfamiliar members with `penpot_api_info`. Use the real token types in `shared/tokens-schema.json`.
3. Add an Anti-Rationalization Table and a Token-Aware Brief Contract. If the skill mutates the
   canvas, wire the visual self-review loop (`shared/visual-self-review.md`); if it audits, define
   its structured report in `shared/report-schemas/`.
4. Register the skill in `skills.json` and `.well-known/agent-skills/index.json`, and route it in
   `workflows/routing/pipeline.json`.
5. Add a golden eval under `evals/golden/` (runnable with `scripts/dev/run-eval.mjs`).
6. Lint + lock: `node scripts/dev/validate-kit.mjs` must pass (it checks manifests, versions,
   modes, `requires:`, pipelines, evals, and dangling `penpot-*` references), then regenerate
   hashes with `node scripts/dev/update-lock.mjs`.

</details>

---

## License
- [Creative Commons Attribution 4.0 International Public License](https://creativecommons.org/licenses/by/4.0/)
