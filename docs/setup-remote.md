# Setup — Remote (Penpot SaaS)

> Connect an MCP client (Claude Desktop, Cursor, and similar) to the **hosted** Penpot at
> `penpot.app` through the Penpot remote MCP endpoint. This is the fastest path: no Node, no local
> server, no checkout. If you self-host Penpot, use `docs/setup-local.md` instead.

The remote MCP exposes the four core tools (`high_level_overview`, `penpot_api_info`,
`execute_code`, `export_shape`) — local mode additionally exposes `import_image`; `export_shape`
is more limited on remote. See `shared/penpot-mcp-tool-reference.md`. Setup only changes *how
the client reaches the server*, never what the core tools do.

---

## 0. What you need first

| Requirement | Where it comes from | Why |
|-------------|---------------------|-----|
| A Penpot account on `penpot.app` | Sign up at penpot.app | The MCP acts as you. |
| An **MCP Key** | Account → **Integrations** → **MCP Key** (generate/copy) | Authenticates the remote endpoint. Treat it like a password. |
| The **Penpot plugin window open** in the browser | The MCP plugin runs inside an open Penpot tab | The MCP bridges to a live plugin instance; if no plugin is open, every call fails with **"No plugin instance connected."** |
| An MCP-capable client | Claude Desktop, Cursor, etc. | Talks the MCP protocol to the remote endpoint. |

The remote endpoint URL is:

```
https://design.penpot.app/mcp/stream?userToken=YOUR_MCP_KEY
```

Replace `YOUR_MCP_KEY` with the key from **Integrations → MCP Key**. The key travels in the query
string, so the URL is a secret. Do not paste it into shared chats, screenshots, or commits.

> **Why this matters more than a password field:** query strings routinely end up in places
> passwords don't — client config files (that's where the installer writes it, user/global only),
> MCP panel screenshots, HTTP/proxy logs, and shell history if you ever `curl` it. Mitigations:
> the installer never prints or argv-passes the key and redacts it in output; you should revoke +
> regenerate the key on any suspicion of exposure (Account → Integrations), and prefer
> header-based auth if/when the Penpot MCP endpoint offers it.

---

## 1. Generate your MCP Key

1. Log in to `penpot.app`.
2. Open your **Account** menu → **Integrations**.
3. Under **MCP Key**, generate a key (or copy the existing one).
4. Keep it on the clipboard for the next step. If you ever leak it, revoke and regenerate here.

---

## 2. Open the Penpot plugin and keep its window open

The remote MCP does not talk to Penpot's backend directly — it talks to a **plugin instance running
in your browser**. That instance only exists while a Penpot tab with the plugin is open.

1. Open the Penpot file you want the agent to work in.
2. Launch the Penpot MCP plugin (Plugins panel → the MCP / agent plugin).
3. **Leave that browser window/tab open** for the entire session. If you close it, navigate away, or
   the tab is discarded, the bridge drops and you get **"No plugin instance connected"** on the next
   tool call. See `docs/troubleshooting.md`.

> Browser note (PNA / Private Network Access): some browsers block the plugin's local connection.
> Firefox is the easiest (works out of the box). Chrome needs the connection popup allowed; Brave
> needs Shields turned off for the Penpot tab. Full matrix in `docs/troubleshooting.md`.

---

## 3a. Configure Claude Desktop

Claude Desktop reads MCP servers from its `claude_desktop_config.json`:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

Claude Desktop speaks MCP over stdio, so a streamable-HTTP/SSE remote endpoint is reached through the
`mcp-remote` proxy (run via `npx`, no install needed):

```json
{
  "mcpServers": {
    "penpot": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://design.penpot.app/mcp/stream?userToken=YOUR_MCP_KEY"
      ]
    }
  }
}
```

1. Paste the block, replacing `YOUR_MCP_KEY`.
2. Fully quit and reopen Claude Desktop (config is read on launch).
3. Confirm the `penpot` server shows connected and the four core tools are listed.

> If your client natively supports streamable-HTTP / SSE MCP servers, you can point it straight at
> the URL with no proxy. `mcp-remote` is only the bridge for stdio-only clients.

---

## 3b. Configure Cursor

Cursor reads MCP servers from `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (per project):

```json
{
  "mcpServers": {
    "penpot": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://design.penpot.app/mcp/stream?userToken=YOUR_MCP_KEY"
      ]
    }
  }
}
```

1. Save the file with your key substituted.
2. Open **Cursor Settings → MCP** and confirm `penpot` is enabled and green.
3. Reload the MCP server from that panel if it doesn't appear immediately.

---

## 4. Verify the connection (the only correct first move)

In the client, ask the agent to **call `high_level_overview`** (no arguments). Per `AGENTS.md` this
is mandatory before any other Penpot action — it loads the MCP's own guidance.

Then do a read-only sanity check through `execute_code`:

```js
// Discovery only — no mutation. Confirms the plugin bridge is live and a page is open.
return penpotUtils.shapeStructure(penpot.currentPage.root, 1);
```

If this returns a structure, you are connected. If it returns **"No plugin instance connected"**,
go back to step 2 (plugin window must stay open) and `docs/troubleshooting.md`.

---

## 5. Load the kit's instructions

The remote MCP gives the agent *tools*; this kit gives it *behavior*. Point your client at:

- `AGENTS.md` — the instructions layer (load first; never one-shot, tokens before everything,
  Suggest → Apply-with-review default).
- `skills/penpot-router` — to route a request to the right skill/workflow before acting.

How you attach these depends on the client (project instructions, a referenced file, or a system
prompt). The architecture of how they fit together is in `docs/architecture.md`.

---

## 6. Security & hygiene

- The MCP Key is a credential. Never commit a config file containing the live URL. Use a local,
  git-ignored config or an environment substitution.
- The agent acts **as you** in real files. Keep the global mode at **Suggest → Apply-with-review**
  (`shared/modes-and-policies.md`) — never let it auto-apply geometry, variant/component
  restructuring, `detach()`, new tokens, or shared-library edits.
- One plugin window per working file. Switching files mid-run means re-opening the plugin in the new
  file and re-verifying with `high_level_overview`.

---

## Quick reference

| Thing | Value |
|-------|-------|
| Remote endpoint | `https://design.penpot.app/mcp/stream?userToken=YOUR_MCP_KEY` |
| Key location | Penpot → Account → Integrations → MCP Key |
| stdio bridge | `npx -y mcp-remote <url>` |
| Must stay open | The Penpot plugin browser window |
| First tool call | `high_level_overview` (no args) |
| Easiest browser | Firefox (Chrome: allow popup; Brave: Shields off) |
| Common failure | "No plugin instance connected" → plugin window closed / bad key / dropped bridge |
