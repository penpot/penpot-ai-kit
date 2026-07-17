# Install the Penpot AI Kit — agent playbook

> **You are an AI agent installing this kit for the user.** This file is instructions for *you*, not
> prose for a human. Execute it top to bottom. Be conversational, confirm before writing, never echo
> the user's secret key, and stop the moment something is ambiguous. It's ~4 short phases and 2 questions.

If the user said something like *"Install this Penpot AI Kit"*, begin here. Lifecycle requests map to
sections of this same playbook — don't improvise a flow:

| User asks | Go to |
|-----------|-------|
| install | Phase 0 → 3, in order |
| update / "is it up to date?" (after a `git pull` or edits) | Phase 0 (already-installed branch) + Phase 4 |
| install for **another** client | Phase 0 → 3 with the new `--client` (the manifest accumulates; nothing is lost) |
| rotated MCP Key / switch remote↔local | Phase 1–2 with `--force` (updates the existing `penpot` entry) |
| clean up old penpot skills | Phase 2 notes — `--prune` (Claude Code only; always confirm first) |
| verify the connection | Phase 3 only |
| uninstall | **Uninstall** section at the end |

## Model: a disposable seed → global by default, project-scoped where selected

This cloned folder is a **read-only seed**. Installing:
1. **Copies the kit once** to a stable user location (`~/.penpot-ai-kit`, the "seed home"). The clone is
   then disposable — `shared/`/`policies/` relative links stay intact because the whole tree moves together.
2. **Connects the Penpot MCP** by writing a server entry to the client's **user/global** config — so the
   secret MCP Key never lands near a git repo.
3. **Wires the behavior** per client: for **Claude Code** it installs the penpot-* skills *natively and
   self-contained* into `~/.claude/skills/` (B3 — `shared/`+`policies/` vendored into each, so they're
   auto-discovered) plus a slim `~/.claude/CLAUDE.md` pointer; for **OpenCode** it adds an `instructions`
   pointer in `opencode.json`; for **Codex** either a block in global `~/.codex/AGENTS.md` (the default)
   or, with `--scope project`, a block in `<project>/AGENTS.md` plus self-contained native skills in
   `<project>/.agents/skills/`; for **Cursor/Windsurf** a per-project rules file; for **Desktop/generic**
   an attachable instructions file. Behavior pointers reference the seed; native skill bundles are
   self-contained.

The cloned repo is **never modified**, and nothing is written into it (a read-only guard enforces this).

### 🪙 Token discipline (important)
Copying files does **not** cost tokens — moving bytes is the OS's job. Tokens are spent only when *you*
read file contents into context. So: **do NOT read the kit's content** (skills, `shared/`, `AGENTS.md`)
during install — those are read later, at use time. Here you only **run the helper scripts and relay
their short JSON**. The scripts move the bytes; you stay cheap. This file is the only kit doc you read.

The helpers live in `scripts/install/`; all accept `--dry-run` and print JSON. Prefer the one-shot
`install.mjs` for the happy path (fewer turns = fewer tokens); use the individual scripts only to debug.

---

## Phase 0 — Preflight (read-only, no tokens spent on kit content)

1. Confirm you're at the kit root (an `AGENTS.md` is here). Check Node ≥ 22 (`node -v`); if missing, point
   the user to `docs/setup-remote.md` and stop.
2. Probe the host (read-only):
   ```bash
   node scripts/install/detect-client.mjs
   ```
3. Summarize in one short paragraph: OS, which of **Claude Code / Claude Desktop / Cursor / Windsurf /
   OpenCode / Codex** were detected, the seed destination, and the user/global config path each would
   use. Anything else → `generic`. Note: **Codex's CLI and desktop App share `~/.codex`**, so one `codex`
   choice covers both.
4. **Already installed?** Read the `install` block of the same output (`installNote` summarizes it):
   - `install.installed === false` → fresh install; continue to Phase 1 normally.
   - `install.installed === true && upToDate` → tell the user it's **already installed** at
     `install.seedHome` (version, and the recorded installs — `manifest.installs` lists mode/MCP **per
     client**, plus any recorded scope and target directory; `manifest.lastClient` is the most recent). Don't blindly
     reinstall — offer three choices: **update/repair** (re-run install, idempotent — refreshes the seed,
     re-wires behavior, MCP skips unless `--force`), **change client/MCP mode** (re-run with new flags),
     or **skip** (nothing to do; go to Phase 3 to verify the live bridge).
   - `install.installed === true && !upToDate` → installed but the source is a **different version**;
     recommend an **update** (re-seed; safe/idempotent) and proceed through Phase 1–2 with the same client.
   The manifest tells you what was installed last time — reuse it as the default answers in Phase 1.

---

## Phase 1 — Two questions (+ placement where needed)

1. **Which client?** Offer the detected one as default; let them correct it or pick `generic`. If the
   user is talking to you *through* one of these, that's the target — say so and confirm.
2. **Remote, local, or already configured?** Three choices — offer all three:
   - **Remote** (default) = hosted `penpot.app`, needs an **MCP Key**. → `--mode remote`
   - **Local** = self-hosted (`docs/setup-local.md`), no key. → `--mode local`
   - **"Ya tengo el Penpot MCP instalado, no hace falta configurarlo"** = the user already has a working
     Penpot MCP server in their client. → `--mode none` (skips the MCP step entirely; the kit still seeds
     + wires behavior). Pick this whenever the user wants to skip MCP config — do **not** stall or abort.

If **remote**, get the key safely:
> "Open Penpot → **Account → Integrations → MCP Key**, copy it, and paste it here. It's a secret — I'll
> write it only into your client's user config (never the repo), and never print it back."

If **already configured** (`--mode none`), no key is needed and no MCP config is touched — proceed
straight to Phase 2 with `--mode none`.

**Key hygiene (non-negotiable):** pass the key via the `PENPOT_MCP_KEY` env var (or piped stdin), **never**
as a CLI argument, and never repeat it. The scripts redact it everywhere.

**Pasted-URL tolerance:** users often paste the **full endpoint URL**
(`https://design.penpot.app/mcp/stream?userToken=<key>`) instead of the bare key. That's fine — pass it
through as-is; `write-mcp-config.mjs` detects the `userToken=` parameter and keeps only the key. Don't
re-ask or trim it yourself.

If the client is **Codex**, ask where its behavior should be installed:
- **Global** (default) → `--scope global`; writes the marker-bounded pointer to `~/.codex/AGENTS.md`.
- **Project** → `--scope project --target-dir <user-project>`; requires an explicit project directory
  outside this kit, writes the pointer to `<project>/AGENTS.md`, and installs self-contained skills in
  `<project>/.agents/skills/` for native discovery.

The Codex MCP entry remains in global `~/.codex/config.toml` in both scopes, so its key never lands in
the project. If the client is **Cursor or Windsurf**, their rules are always per-project — ask for the
project directory they will work in (also outside this kit). For Claude Code / Desktop / generic, no
project directory is needed.

---

## Phase 2 — Install (one command, token-frugal)

Dry-run first, show the user the redacted summary, then run for real on approval:

```bash
# remote (key via env; target-dir needed for cursor/windsurf and Codex project scope):
PENPOT_MCP_KEY='<pasted-key>' node scripts/install/install.mjs --client <id> --mode remote [--target-dir <user-project>] --dry-run
PENPOT_MCP_KEY='<pasted-key>' node scripts/install/install.mjs --client <id> --mode remote [--target-dir <user-project>]

# local (no key):
node scripts/install/install.mjs --client <id> --mode local [--target-dir <user-project>]

# MCP already installed — skip MCP config (no key, no MCP write):
node scripts/install/install.mjs --client <id> --mode none [--target-dir <user-project>]

# Codex project-local behavior (works with remote/local/none; --target-dir is required):
node scripts/install/install.mjs --client codex --mode none --scope project --target-dir <user-project>

# Codex global behavior is the default (--scope global is optional):
node scripts/install/install.mjs --client codex --mode none [--scope global]
```

`install.mjs` chains **seed copy → MCP config → behavior → uninstall manifest** and prints one summary.
Read its `summary` and relay it. Notes:
- The MCP write **merges** (preserves other servers); if a `penpot` server already exists it reports
  `skipped-exists` → re-run with `--force` to update.
- It writes the manifest to `~/.penpot-ai-kit/install-manifest.json`, **accumulating per client** and
  recording Codex's `scope` and `targetDir` — re-installing for another client never erases an earlier
  client's record. Update reuses that placement; uninstall removes the files recorded for that exact
  scope, the `penpot` MCP server entries, and finally the seed dir when no client remains.
- One Codex placement is tracked at a time. To switch between global/project scopes or between project
  directories, uninstall the recorded Codex placement first so its files cannot be orphaned.
- Native skill installs (Claude Code and project-scoped Codex) report stale `penpot-*` skills that are
  **not** part of this kit (`orphanSkills`). Relay the list, ask the user, and on their OK re-run with
  `--prune` to remove them. Never prune without asking.
- If it reports a guard error about writing inside the kit, you passed a `--target-dir` inside the repo —
  ask the user for their real project dir and retry.

> Running the steps individually (only if needed): `install-seed.mjs` → `write-mcp-config.mjs` →
> `install-behavior.mjs --kit-path ~/.penpot-ai-kit`. Same flags.

---

## Phase 3 — Verify (prove it; then stop)

The install is real only once the live bridge answers:
1. Restart / reload the client so it picks up the MCP server + rules (relay the `userAction`).
2. Open the Penpot **file**, launch the **MCP plugin**, and **leave that browser window open**.
3. Have the agent run the kit's canonical first move — `high_level_overview` (no args), then a read-only
   `execute_code`:
   ```js
   return penpotUtils.shapeStructure(penpot.currentPage.root, 1);
   ```
4. **Returns a structure → installed.** Stop. **Do not run a demo** (it wastes tokens).
   **"No plugin instance connected"** → plugin window closed / bad key / browser blocked the local call →
   send them to `docs/troubleshooting.md` (Firefox easiest; Chrome allow the popup; Brave Shields off).

Finish with a 4-line recap: client, MCP mode, seed location, and one example prompt to try next.

---

## Phase 4 — Staying up to date (the seed vs. the clone)

The installed seed (`~/.penpot-ai-kit`) is a **copy** taken at seed-time. After the user edits the clone
or `git pull`s, the seed is stale until re-seeded. `install-seed.mjs` stamps a content fingerprint into
`~/.penpot-ai-kit/.penpot-kit-seed.json`; **`check-updates.mjs` compares it cheaply** (the hash is
computed by Node — **zero model tokens**) and reports in one line whether the seed is behind:

```bash
node scripts/install/check-updates.mjs          # JSON; exit 0 = current, 10 = updates available
node scripts/install/check-updates.mjs --hook    # SILENT when current; one actionable line when stale
```

- **Updates available** → run the one-step updater: `node scripts/install/update.mjs`. It chains
  `install-seed.mjs` (refresh the seed) **and** `install-behavior.mjs` for every client recorded in the
  manifest — so e.g. Claude Code's vendored copies in `~/.claude/skills/` never lag behind the seed.
  Recorded Codex scope and target directory are forwarded, so a project install remains in that project.
  MCP configs are untouched (a content update never changes the key/server entry).
- Both `check-updates.mjs` and `update.mjs` run from the clone **or** from the seed (the clone is
  resolved via the stamped `sourcePath`).

**Elegant zero-touch option (Claude Code):** add a `SessionStart` hook that runs the `--hook` form. It
prints nothing when current (no noise, no tokens) and surfaces a single "updates available — re-seed"
line into context only when the clone has moved on. Offer to wire it; the command is:
`node ~/.penpot-ai-kit/scripts/install/check-updates.mjs --hook` — point it at the **seed**, not the
clone: the clone is disposable, and the seed copy resolves the clone via the stamped `sourcePath`
(if the clone is gone it reports `source-gone` quietly instead of breaking the hook).
(Other clients: run the check manually, or alias it.)

## Uninstall (on request only)

Manifest-driven and confirmed step by step. **Preferred path:** the script does the whole dance —
plan first, apply only after the user's OK:

```bash
node scripts/install/uninstall.mjs                 # prints the removal PLAN only (touches nothing)
node scripts/install/uninstall.mjs --yes           # applies it after the user confirms
node scripts/install/uninstall.mjs --client cursor --yes   # remove one client, keep the rest
```

It deletes kit artifacts, strips only the kit's marker blocks from shared files (CLAUDE.md,
.windsurfrules, …), removes only the `penpot` MCP entry, and removes the seed last. It does NOT
touch the SessionStart hook (user hooks share that file) — relay its reminder. Manual fallback
(no manifest / auditing what it would do):
1. Read `~/.penpot-ai-kit/install-manifest.json`. `installs` records, **per client**, the files that
   were wired, which MCP config holds the `penpot` entry, and any scope/target directory needed to
   reproduce that placement. (No manifest? Fall back to the per-client locations table in
   `docs/clients.md` and confirm each path with the user.)
2. For each client the user wants removed: delete every path under `installs[client].files`, then
   remove the **`penpot` server entry** from its `mcpConfig` — surgically; never touch other servers
   in that file.
3. If a SessionStart update hook was wired (Phase 4), remove that hook entry from
   `~/.claude/settings.json` — only the kit's entry, not the user's other hooks.
4. Last (and only if no client remains installed): delete the seed dir `~/.penpot-ai-kit`.
5. The cloned repo is never touched — it stays for a future reinstall; deleting it is the user's call.

## Safety rules (throughout)
- **Confirm before writing.** Dry-run → show → apply (mirrors the kit's own Suggest → Apply-with-review).
- **Never echo the MCP Key**; never put it in argv. It only ever lives in the client's user config.
- **The clone is read-only.** The guard refuses any write inside it; never bypass it.
- **Merge, don't overwrite. Idempotent.** Re-running is safe (behavior blocks are marker-bounded; the MCP
  write skips unless `--force`; re-seeding just refreshes the copy after a `git pull`).
- **Stay cheap:** run scripts and relay JSON; don't read skills/`shared/`/`AGENTS.md` during install.
- Unknown client → `--client generic`, then walk them through attaching `~/.penpot-ai-kit/AGENTS.md`
  (or the emitted `dist/penpot-kit.instructions.md`) as project instructions.
