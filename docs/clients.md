# Supported clients — install matrix

> Reference for the installer (`INSTALL.md`) and its helpers (`scripts/install/`). Adding a new client =
> adding a row here + a case in `lib.mjs` (`mcpConfigPath`, `behaviorTarget`).

## Model (B2 — disposable seed)

The cloned repo is a **read-only seed**. `install-seed.mjs` copies the whole tree ONCE to
`~/.penpot-ai-kit` (the "seed home"), so `shared/`/`policies/` relative links stay intact and the clone
becomes disposable. Then, **into user/global locations by default**, or into an explicit project when
the client requires or the user selects project scope:
- the **secret MCP config** → the client's user/global config file;
- a **behavior pointer** → the client's global rules, the user's project for Cursor/Windsurf, or either
  location for Codex according to `--scope global|project`;
- `prompts/` → native slash-commands where supported.

A read-only guard (`assertOutsideKit`) refuses any write that resolves inside the cloned repo.

## Matrix

| Client | MCP config (user/global) | Config dialect | Behavior pointer | Prompts |
|--------|--------------------------|----------------|------------------|---------|
| **Claude Code** | `~/.claude.json` | JSON `mcpServers` (stdio proxy) | **B3: native self-contained skills** in `~/.claude/skills/` + slim `~/.claude/CLAUDE.md` pointer | copied → `~/.claude/commands/penpot-*.md` |
| **Claude Desktop** | macOS `~/Library/Application Support/Claude/claude_desktop_config.json` · Win `%APPDATA%\Claude\claude_desktop_config.json` · Linux `~/.config/Claude/claude_desktop_config.json` | JSON `mcpServers` (stdio proxy) | `~/.penpot-ai-kit/dist/penpot-kit.instructions.md` → paste into a Project | inside that file |
| **Cursor** | `~/.cursor/mcp.json` | JSON `mcpServers` (**native HTTP** `url`) | per-project `<project>/.cursor/rules/penpot-kit.mdc` (`alwaysApply`) | `@~/.penpot-ai-kit/prompts/<name>.md` |
| **Windsurf** | `~/.codeium/windsurf/mcp_config.json` | JSON `mcpServers` (stdio proxy) | per-project `<project>/.windsurfrules` | referenced |
| **OpenCode** | `~/.config/opencode/opencode.json` | JSON **`mcp`** (`type:remote` url / `type:local` command) | `instructions[]` in the same `opencode.json` → seed `AGENTS.md` + router | `@<seed>/prompts/<name>.md` |
| **Codex** (CLI + desktop App + IDE + Web) | `~/.codex/config.toml` in both scopes | **TOML** `[mcp_servers.NAME]` (native HTTP `url`) | `--scope global` (default): `~/.codex/AGENTS.md`; `--scope project`: `<project>/AGENTS.md` + self-contained `<project>/.agents/skills/` | referenced |
| **generic** | `~/.penpot-ai-kit/mcp.generic.json` (import into your client) | JSON `mcpServers` | `~/.penpot-ai-kit/dist/penpot-kit.instructions.md` or `AGENTS.md` | inside that file |

- **Claude Code (B3):** skills are installed **natively and self-contained** — `install-behavior` copies
  each skill dir and vendors `shared/` + `policies/` into it (plus `workflows/` into `penpot-router`,
  so the pipelines the router targets are reachable natively), so the skills' repo-relative references
  resolve and Claude Code auto-discovers them by `description`. It also reports stale `penpot-*` skills
  in `~/.claude/skills` that aren't part of the kit (older generations shadow the kit's triggers) —
  remove them with `--prune` after the user confirms. Convention: a SKILL.md must only reference
  files inside its own bundle (`references/`, `scripts/`) or the vendored `shared/`/`policies/` —
  never another skill's files by path (those don't resolve cross-bundle; `scripts/dev/validate-kit.mjs`
  guards name-level references). Codex also supports native project skills: project scope installs the
  same self-contained bundles under `<project>/.agents/skills/`. Clients without native skill placement
  read the seed via their behavior pointer.
- **Cursor / Windsurf** only read rules **per project** → their behavior pointer goes into the user's
  project dir (`--target-dir`, validated outside the kit). The secret MCP config still goes user/global.
- **OpenCode** uses the `instructions` array (which *combines* with any `AGENTS.md`) instead of writing a
  global `AGENTS.md`, sidestepping a known bug where a project `AGENTS.md` shadows the global one.
- **Codex** accepts `--scope global|project`; global is the backward-compatible default. Project scope
  requires an explicit `--target-dir` outside the kit and writes `<project>/AGENTS.md` plus native,
  self-contained `<project>/.agents/skills/`. Its MCP config always remains global in
  `~/.codex/config.toml`, keeping the key out of the project. The manifest records `scope` and
  `targetDir`; update and uninstall reuse them instead of falling back to the current directory. The
  manifest tracks one Codex placement, so uninstall it before switching scope or project directory.
  Desktop App, CLI, IDE extension and Web share the config + AGENTS.md chain. Codex caps merged
  AGENTS.md at ~32 KiB — keep the pointer short.

## Server entry shapes

**Remote, native-HTTP (Cursor):**
```json
{ "mcpServers": { "penpot": { "url": "https://design.penpot.app/mcp/stream?userToken=YOUR_MCP_KEY" } } }
```
**Remote, stdio-only (Claude Code, Claude Desktop, Windsurf):**
```json
{ "mcpServers": { "penpot": { "command": "npx", "args": ["-y", "mcp-remote", "https://design.penpot.app/mcp/stream?userToken=YOUR_MCP_KEY"] } } }
```
**Local (self-hosted), `mcpServers`-dialect client:**
```json
{ "mcpServers": { "penpot": { "command": "npx", "args": ["-y", "mcp-remote", "http://localhost:4401/sse", "--allow-http"] } } }
```
**OpenCode (`opencode.json`) — remote / local:**
```json
{ "mcp": { "penpot": { "type": "remote", "url": "https://design.penpot.app/mcp/stream?userToken=YOUR_MCP_KEY", "enabled": true } } }
{ "mcp": { "penpot": { "type": "local", "command": ["npx", "-y", "mcp-remote", "http://localhost:4401/sse", "--allow-http"], "enabled": true } } }
```
**Codex (`~/.codex/config.toml`) — remote / local (marker-bounded block):**
```toml
[mcp_servers.penpot]
url = "https://design.penpot.app/mcp/stream?userToken=YOUR_MCP_KEY"
# — or local —
[mcp_servers.penpot]
command = "npx"
args = ["-y", "mcp-remote", "http://localhost:4401/sse", "--allow-http"]
```

## Notes & gotchas
- The remote URL **contains the secret key** → it now lives only in the client's user/global config,
  never in the repo or a project. Still, never paste it into shared chats/screenshots.
- The Penpot **plugin window must stay open** in the browser, or every tool call fails with *"No plugin
  instance connected."*
- Local-mode Private Network Access: Firefox works out of the box; Chrome needs the local-network popup;
  Brave needs Shields off for the Penpot tab. See `docs/troubleshooting.md`.
- Behavior files are **marker-bounded** (`<!-- penpot-ai-kit:begin/end -->`) → re-running updates in place.
- `detect-client.mjs` is a hint only — always confirm the host client with the user.
- Override the seed location with `PENPOT_KIT_HOME` if `~/.penpot-ai-kit` doesn't suit.
