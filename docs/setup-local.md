# Setup — Local (Self-Hosted / Development)

> Run the Penpot MCP server on your own machine, against either a self-hosted Penpot or a local
> development build. Choose this when you can't (or don't want to) route through `penpot.app`, or
> when you're developing the MCP / a plugin. For the hosted SaaS path use `docs/setup-remote.md`.

The local server exposes the same four core tools as remote (`high_level_overview`,
`penpot_api_info`, `execute_code`, `export_shape`) **plus `import_image`** (local-only — remote
has no filesystem access). See `shared/penpot-mcp-tool-reference.md`. Otherwise only the
transport and the ports change.

---

## 0. Prerequisites

| Requirement | Minimum | Notes |
|-------------|---------|-------|
| Node.js | **>= 22** | The MCP server and `mcp-remote` proxy both require it. Check with `node -v`. |
| A running Penpot | self-hosted or dev | The plugin must be loadable in that Penpot instance. |
| A browser that allows local connections | Firefox easiest | PNA blocks bite Chrome/Brave — see `docs/troubleshooting.md`. |
| An MCP-capable client | Claude Desktop / Cursor / JetBrains | Same clients as remote. |

---

## 1. Ports and endpoints (know these before you debug anything)

The local MCP stack uses a fixed set of ports. Memorize them; most "it won't connect" issues are a
port collision or the wrong URL.

| Port / path | Purpose |
|-------------|---------|
| `4400` (manifest) | Serves the plugin **manifest** Penpot loads to install the plugin. |
| `4401/mcp` | The MCP **streamable-HTTP** endpoint. Preferred for modern clients. |
| `4401/sse` | The MCP **SSE** endpoint. Used by clients that speak SSE (e.g. JetBrains / Junie — see below). |
| `4402` (plugin ws) | The **WebSocket** the plugin uses to talk back to the MCP server (the live bridge). |

So: the plugin is installed from `4400`, the agent connects to MCP on `4401` (`/mcp` or `/sse`),
and the running plugin keeps an open WebSocket on `4402`. If `4402` isn't connected, you'll see
**"No plugin instance connected."**

---

## 2. Start the local MCP server

From the MCP server project, with Node >= 22:

```bash
node -v          # must print v22 or higher
npm install      # first run only
npm start        # boots the server on 4400 / 4401 / 4402
```

Confirm in the log that it is listening on all three ports (`4400`, `4401`, `4402`). If a port is in
use, free it or reconfigure — colliding ports are the #1 local failure.

---

## 3. Install the plugin into your Penpot and keep its window open

1. In your Penpot, open the file you want to work in.
2. Add the plugin using the manifest served at `http://localhost:4400` (Plugins → install from URL,
   pointing at the manifest path the server prints).
3. Launch the plugin. It opens a WebSocket to `4402`.
4. **Keep the plugin window open** for the whole session. Closing it drops the `4402` bridge and the
   next tool call returns **"No plugin instance connected"** (`docs/troubleshooting.md`).

> Browser/PNA: localhost connections from a page are governed by Private Network Access. Firefox
> works out of the box; Chrome shows a popup you must allow; Brave needs Shields **off** for the tab.
> Details in `docs/troubleshooting.md`.

---

## 4a. Connect Claude Desktop (stdio client → local HTTP via proxy)

Claude Desktop is stdio-only, so bridge it to the local streamable-HTTP endpoint with `mcp-remote`:

```json
{
  "mcpServers": {
    "penpot": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "http://localhost:4401/mcp"
      ]
    }
  }
}
```

Config locations are the same as in `docs/setup-remote.md` (`claude_desktop_config.json`). Fully
quit and reopen Claude Desktop after editing.

---

## 4b. Connect Cursor

```json
{
  "mcpServers": {
    "penpot": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "http://localhost:4401/mcp"]
    }
  }
}
```

Then enable it under **Cursor Settings → MCP**.

---

## 4c. Connect JetBrains / Junie (use SSE directly)

JetBrains IDEs and the Junie agent speak **SSE** natively, so skip the proxy and point straight at
the SSE endpoint:

```
http://localhost:4401/sse
```

Add this as an SSE MCP server in the IDE's MCP settings. No `mcp-remote` wrapper is needed because
the client already speaks the SSE transport.

---

## 5. Verify

In your client, have the agent **call `high_level_overview`** first (mandatory per `AGENTS.md`), then
run a read-only structure check:

```js
// Discovery only — confirms the 4402 plugin bridge is live.
return penpotUtils.shapeStructure(penpot.currentPage.root, 1);
```

A returned structure means you're wired up end to end (client → `4401` → server → `4402` → plugin).
"No plugin instance connected" means the plugin window is closed or the WebSocket never came up.

---

## 6. Local model calibration (optional, if you front the MCP with a local LLM)

If you drive the MCP from a locally-hosted model (e.g. via **LM Studio**), the kit's discipline
(one step per `execute_code`, verify-then-continue) only holds with the right settings:

- **Temperature 0.1** — these are precise, API-call tasks; high temperature invents non-existent
  methods (`createFrame`, `createColor`) instead of the real surface.
- **Large context window** — `AGENTS.md` + a `SKILL.md` + tool reference + structure reads are big.
  Undersized context drops the instructions layer and the agent starts one-shotting.
- **Rolling window** — keep recent tool results in context so the agent can re-derive state after
  truncation per `shared/state-management.md`.

See `docs/troubleshooting.md` for symptoms when these are wrong.

---

## Quick reference

| Thing | Value |
|-------|-------|
| Node | >= 22 |
| MCP (HTTP) | `http://localhost:4401/mcp` |
| MCP (SSE) | `http://localhost:4401/sse` (JetBrains / Junie) |
| Plugin manifest | `http://localhost:4400` |
| Plugin WebSocket | `4402` (the live bridge; must be connected) |
| stdio bridge | `npx -y mcp-remote http://localhost:4401/mcp` |
| First tool call | `high_level_overview` (no args) |
| Common failure | "No plugin instance connected" → plugin window closed / `4402` down |
