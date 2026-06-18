#!/usr/bin/env node
/**
 * write-mcp-config.mjs — idempotently add a Penpot MCP server to a client's USER/GLOBAL config.
 *
 * Handles three config DIALECTS:
 *   - mcpServers-json : Claude Code/Desktop, Cursor, Windsurf, generic  → JSON {"mcpServers":{...}}
 *   - opencode-json   : OpenCode                                        → JSON {"mcp":{...}} (type/url|command)
 *   - codex-toml      : OpenAI Codex (CLI + desktop App + IDE + Web)    → TOML [mcp_servers.NAME]
 * MERGES (preserves everything else). The MCP Key comes from env PENPOT_MCP_KEY or stdin — NEVER argv —
 * and is NEVER echoed (output redacts it). Local mode needs no key.
 *
 * Flags: --client <id> (required) · --mode remote|local · --config-path <override> · --server <name>
 *        · --force · --dry-run
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { mcpConfigPath, clientDialect, assertOutsideKit, arg, flag } from "./lib.mjs";

const argv = process.argv.slice(2);
const client = arg(argv, "client");
const mode = arg(argv, "mode", "remote");
const serverName = arg(argv, "server", "penpot");
const force = flag(argv, "force");
const dryRun = flag(argv, "dry-run");

const out = (o) => { process.stdout.write(JSON.stringify(o, null, 2) + "\n"); };
const fail = (m) => { out({ ok: false, error: m }); process.exit(1); };
if (!client) fail("--client is required");
if (!["remote", "local"].includes(mode)) fail(`--mode must be remote|local (got ${mode})`);

const dialect = clientDialect(client);
const configPath = arg(argv, "config-path") || mcpConfigPath(client);
if (!configPath) fail(`unknown client "${client}"`);
try { assertOutsideKit(configPath); } catch (e) { fail(e.message); }

async function readKey() {
  if (mode === "local") return null;
  if (process.env.PENPOT_MCP_KEY) return process.env.PENPOT_MCP_KEY.trim();
  if (process.stdin.isTTY) fail("remote mode needs the MCP Key on env PENPOT_MCP_KEY or piped via stdin (never as an argument)");
  const chunks = []; for await (const c of process.stdin) chunks.push(c);
  const k = Buffer.concat(chunks).toString("utf8").trim();
  if (!k) fail("empty MCP Key");
  return k;
}
const REMOTE_URL = (key) => `https://design.penpot.app/mcp/stream?userToken=${key}`;
const LOCAL_SSE = "http://localhost:4401/sse";
const redact = (s) => s.replace(/userToken=[^"&\s]+/g, "userToken=****");

const MB = "# penpot-ai-kit:begin", ME = "# penpot-ai-kit:end";

const key = await readKey();
const ANY_WRITE = (path, content) => { if (!dryRun) { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, content, "utf8"); } };

let result;

if (dialect === "mcpServers-json" || dialect === "opencode-json") {
  const rootKey = dialect === "opencode-json" ? "mcp" : "mcpServers";
  let config = {};
  let existed = false;
  if (existsSync(configPath)) {
    existed = true;
    try { config = JSON.parse(readFileSync(configPath, "utf8")); }
    catch (e) { fail(`existing config is not valid JSON: ${configPath} (${e.message})`); }
  }
  if (typeof config !== "object" || config === null || Array.isArray(config)) fail("config root must be a JSON object");
  config[rootKey] = config[rootKey] || {};

  // build the per-dialect server entry
  let server;
  if (dialect === "opencode-json") {
    server = mode === "local"
      ? { type: "local", command: ["npx", "-y", "mcp-remote", LOCAL_SSE, "--allow-http"], enabled: true }
      : { type: "remote", url: REMOTE_URL(key), enabled: true };
  } else { // mcpServers-json
    server = mode === "local"
      ? { command: "npx", args: ["-y", "mcp-remote", LOCAL_SSE, "--allow-http"] }
      : (client === "cursor" ? { url: REMOTE_URL(key) } : { command: "npx", args: ["-y", "mcp-remote", REMOTE_URL(key)] });
  }

  const already = Object.prototype.hasOwnProperty.call(config[rootKey], serverName);
  if (already && !force) {
    out({ ok: false, action: "skipped-exists", client, mode, configPath, server: serverName,
      message: `A server "${serverName}" already exists in ${configPath}. Re-run with --force, or --server <name> to add alongside.` });
    process.exit(2);
  }
  config[rootKey][serverName] = server;
  const action = already ? "updated" : (existed ? "merged" : "created");
  ANY_WRITE(configPath, JSON.stringify(config, null, 2) + "\n");
  result = { action, redactedUrl: redact(JSON.stringify(server)) };

} else if (dialect === "codex-toml") {
  const text = existsSync(configPath) ? readFileSync(configPath, "utf8") : "";
  const block = mode === "local"
    ? `${MB}\n[mcp_servers.${serverName}]\ncommand = "npx"\nargs = ["-y", "mcp-remote", "${LOCAL_SSE}", "--allow-http"]\n${ME}`
    : `${MB}\n[mcp_servers.${serverName}]\nurl = "${REMOTE_URL(key)}"\n${ME}`;
  const markerRe = new RegExp(`${MB}[\\s\\S]*?${ME}`);
  const externalRe = new RegExp(`(^|\\n)\\s*\\[mcp_servers\\.${serverName}\\]`);
  let next, action;
  if (markerRe.test(text)) { next = text.replace(markerRe, block); action = "updated"; }
  else if (externalRe.test(text) && !force) {
    out({ ok: false, action: "skipped-exists", client, mode, configPath, server: serverName,
      message: `A manual [mcp_servers.${serverName}] already exists in ${configPath}. Remove it (or use --server <name>), then re-run.` });
    process.exit(2);
  } else { next = (text.trim() ? text.trimEnd() + "\n\n" : "") + block + "\n"; action = text ? "merged" : "created"; }
  ANY_WRITE(configPath, next);
  result = { action, redactedUrl: redact(block.replace(/\n/g, " ")) };

} else {
  fail(`unsupported dialect "${dialect}"`);
}

out({ ok: true, action: result.action, client, mode, dialect, configPath, server: serverName,
  redactedUrl: result.redactedUrl, dryRun: !!dryRun, touched: dryRun ? [] : [configPath],
  reminder: "Restart the client (or reload its MCP panel). Keep the Penpot plugin window open during a session." });
