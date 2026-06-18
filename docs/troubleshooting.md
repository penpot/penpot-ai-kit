# Troubleshooting

## "No plugin instance connected…"
The client reached the MCP server but the Penpot plugin isn't active.
- Keep the **Penpot plugin window open** in the browser for the whole session.
- Confirm your **MCP Key** is valid (Your Account → Integrations).
- Do a manual disconnect/reconnect from Penpot's **File → MCP Server → Connect**.

## Browser Private Network Access (PNA) blocks (Chromium 142+)
HTTPS origins (e.g. `https://design.penpot.app`) are blocked from reaching `localhost`.
- **Chrome / Vivaldi:** approve the local-network permission popup.
- **Brave:** disable **Brave Shield** on the Penpot tab.
- **Firefox:** easiest — no block on these cross-calls. Use it if the others fight you.

## IDE quirks (JetBrains / Junie)
Recurrent disconnects / latency on the `/mcp` HTTP API → switch the connection to the SSE endpoint
directly: `http://localhost:4401/sse`.

## stdio-only clients can't reach the local server
Bridge with the proxy: `npx -y mcp-remote http://localhost:4401/sse --allow-http`.

## Local model hallucinates tool calls
See `../templates/local-model-calibration.md`: temperature ≈ 0.1, context window ≈ 30k, rolling window
ON. Sub-7B models often can't hold the four-tool protocol.

## `execute_code` "did nothing"
- Style arrays are immutable item-by-item — **replace the whole array** (`shape.fills = [...]`).
- Token application is **async (~100 ms)** — verify in a *later* call.
- New shapes aren't on canvas until **appended** to a container.
- `resize()` forces text `growType: "fixed"` — reset to `auto-*` if you need auto-sizing.

## Method not found / wrong args
Penpot's API differs from other tools (`createBoard`, not `createFrame`). **Verify with
`penpot_api_info(type, member)`** before using anything unfamiliar.
