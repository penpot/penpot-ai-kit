# Templates — MCP client configs

Drop-in configs to connect an AI client to the **Penpot MCP**. Two deployment modes.

## Remote (SaaS) — fastest
1. In Penpot: **Your Account → Integrations**, enable the MCP server.
2. Under **MCP Key**, generate a personal key and store it in a password manager.
3. The server URL is `https://design.penpot.app/mcp/stream?userToken=YOUR_SECRET_MCP_KEY`.
4. Use `claude-desktop-config.remote.json` / `cursor-mcp-config.json`. Name the server **`penpot`**
   (the installer manages an entry with that name and skips/updates it on re-runs).
5. **Keep the Penpot plugin window open** in the browser during a session, or you'll hit
   "No plugin instance connected".

## Local (self-hosted) — data sovereignty
- Node ≥ 22. Endpoints: HTTP/SSE `http://localhost:4401/mcp`, classic SSE `http://localhost:4401/sse`,
  plugin WebSocket `4402`, plugin manifest `http://localhost:4400/manifest.json`.
- Many stdio-only clients need the `mcp-remote` proxy:
  `npx -y mcp-remote http://localhost:4401/sse --allow-http`.
- Use `claude-desktop-config.local.json`.

## Browser Private Network Access (PNA) caveat
Chromium 142+ blocks HTTPS origins (like `https://design.penpot.app`) from reaching `localhost`:
- **Chrome / Vivaldi:** allow the local-network permission popup.
- **Brave:** disable Brave Shield on the Penpot tab.
- **Firefox:** easiest — its network policy doesn't block these cross-calls.

## Local models
See `local-model-calibration.md` (temperature ~0.1, large context window, rolling/overflow window).
