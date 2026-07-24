#!/usr/bin/env node
/**
 * install.mjs — one-shot orchestrator for the happy path (token-frugal).
 *
 * Chains: install-seed → write-mcp-config → install-behavior, then writes an uninstall manifest. Each
 * step is a child process returning short JSON; the installing agent runs THIS once and reads ONE
 * summary instead of orchestrating 3 round-trips (fewer turns = fewer context reloads = fewer tokens).
 * The MCP Key is passed to the child via env, never argv, never printed.
 *
 * Usage:
 *   PENPOT_MCP_KEY=... node scripts/install/install.mjs --client cursor --mode remote --target-dir /abs/project
 *   node scripts/install/install.mjs --client windsurf --mode local --dry-run
 *   node scripts/install/install.mjs --client claude-code --mode none   # user already has the Penpot MCP
 *   node scripts/install/install.mjs --client codex --mode none --scope project --target-dir /abs/project
 * Flags: --client (required) · --mode remote|local|none · --scope global|project · --target-dir <abs> · --force · --prune · --dry-run
 *        (--mode none skips the MCP config step entirely; the kit still seeds + wires behavior)
 *        (--prune: native skill installs only — remove stale penpot-* skills not shipped by this kit; ask first)
 * Output: JSON { ok, steps:{seed,mcp,behavior}, manifest, summary }.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assertOutsideKit, behaviorTarget, kitHome, normalizeManifest, readJSON, arg, flag } from "./lib.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const client = arg(argv, "client");
const mode = arg(argv, "mode", "remote");
const requestedTargetDir = arg(argv, "target-dir", null);
const scope = arg(argv, "scope", "global");
const force = flag(argv, "force");
const dryRun = flag(argv, "dry-run");
const prune = flag(argv, "prune"); // forwarded to install-behavior for native skill targets

const out = (o) => { process.stdout.write(JSON.stringify(o, null, 2) + "\n"); };
const fail = (m) => { out({ ok: false, error: m }); process.exit(1); };
if (!client) fail("--client is required");
if (!["remote", "local", "none"].includes(mode)) fail(`--mode must be remote|local|none (got ${mode})`);
if (!["global", "project"].includes(scope)) fail(`--scope must be global|project (got ${scope})`);
if (client !== "codex" && scope !== "global") fail(`--scope project is only supported for codex (got ${client})`);
if (client === "codex" && scope === "project" && !requestedTargetDir) {
  fail("--target-dir is required for --client codex --scope project (got missing; expected a project path outside the kit)");
}
if (requestedTargetDir === true) fail("--target-dir requires a path value (got flag without value; expected a project path)");
const targetDir = resolve(requestedTargetDir || process.cwd());

function assertSafeBehaviorTarget() {
  const target = behaviorTarget(client, targetDir, scope);
  if (!target) return;
  try { assertOutsideKit(target.file); }
  catch (error) { fail(`${error.message}\nExpected --target-dir outside the kit source.`); }
}

function assertCompatibleCodexInstall() {
  if (client !== "codex") return;
  const manifest = normalizeManifest(readJSON(join(kitHome(), "install-manifest.json")));
  const installed = manifest && manifest.installs.codex;
  if (!installed) return;
  const installedScope = installed.scope || "global";
  const sameTarget = scope !== "project" || resolve(installed.targetDir || "") === targetDir;
  if (installedScope === scope && sameTarget) return;
  fail(`codex is already installed with scope=${installedScope} targetDir=${installed.targetDir || "none"}; uninstall codex before installing scope=${scope} targetDir=${scope === "project" ? targetDir : "none"}`);
}

assertSafeBehaviorTarget();
assertCompatibleCodexInstall();

function run(script, args, { passKey = false } = {}) {
  const env = { ...process.env };
  if (!passKey) delete env.PENPOT_MCP_KEY; // only write-mcp-config sees the key
  try {
    const stdout = execFileSync("node", [join(HERE, script), ...args], { env, encoding: "utf8", stdio: ["inherit", "pipe", "pipe"] });
    return JSON.parse(stdout);
  } catch (e) {
    // child exits non-zero (e.g. mcp "skipped-exists") still prints JSON on stdout
    const so = e.stdout?.toString?.() || "";
    try { return JSON.parse(so); } catch { return { ok: false, error: e.message, stderr: e.stderr?.toString?.() }; }
  }
}

const common = dryRun ? ["--dry-run"] : [];

// 1) seed
const seed = run("install-seed.mjs", [...common]);
if (!seed.ok) fail(`seed step failed: ${seed.error}`);
const kit = seed.dest || kitHome();

// 2) MCP config (key via env → only this child).
// mode=none → user already has the Penpot MCP configured; skip this step cleanly instead of stalling.
let mcp;
if (mode === "none") {
  mcp = { ok: true, action: "skipped", message: "MCP config skipped (--mode none): user already has the Penpot MCP installed." };
} else {
  const mcpArgs = ["--client", client, "--mode", mode, ...common, ...(force ? ["--force"] : [])];
  mcp = run("write-mcp-config.mjs", mcpArgs, { passKey: true });
}
const mcpOk = !!(mcp.ok || mcp.action === "skipped" || mcp.action === "skipped-exists");
if (!mcpOk) fail(`mcp step failed: ${mcp.error || mcp.message || "unknown error"}`);

// 3) behavior (points at the seed)
const behaviorArgs = ["--client", client, "--kit-path", kit, "--scope", scope, "--target-dir", targetDir];
const behavior = run("install-behavior.mjs", [...behaviorArgs, ...common, ...(prune ? ["--prune"] : [])]);
if (!behavior.ok) fail(`behavior step failed: ${behavior.error || "unknown error"}`);

// manifest for uninstall — MERGES per client (a re-run for another client must not erase the record
// of what an earlier install wrote). Old single-install manifests are upgraded in place.
const files = behavior.touched || [];
const manifestPath = join(kit, "install-manifest.json");
const prev = readJSON(manifestPath);
const installs = (prev && prev.installs)
  || (prev && prev.client ? { [prev.client]: { mode: prev.mode, files: prev.files, mcpServer: prev.mcpServer, mcpConfig: prev.mcpConfig } } : {});
const previousInstall = installs[client] || {};
const mcpWasWritten = !["skipped", "skipped-exists"].includes(mcp.action);
const ownedMcpServer = mcpWasWritten ? (mcp.server || "penpot") : (previousInstall.mcpServer || null);
const ownedMcpConfig = mcpWasWritten ? (mcp.configPath || null) : (previousInstall.mcpConfig || null);
installs[client] = {
  mode, files, scope: client === "codex" ? scope : undefined, targetDir: behavior.targetDir,
  mcpServer: ownedMcpServer, mcpConfig: ownedMcpConfig,
};
const manifest = { kitSeed: kit, lastClient: client, installs };
if (!dryRun) { mkdirSync(dirname(manifestPath), { recursive: true }); writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8"); }

out({
  ok: !!(seed.ok && behavior.ok && mcpOk),
  dryRun: !!dryRun,
  steps: { seed, mcp, behavior },
  manifest: dryRun ? manifest : manifestPath,
  summary: {
    client, mode, scope: client === "codex" ? scope : null, targetDir: behavior.targetDir, seed: kit,
    mcp: mcp.action === "skipped" ? mcp.message : (mcp.ok ? `${mcp.action} → ${mcp.configPath}` : mcp.message || mcp.error),
    behavior: behavior.userAction,
    nextStep: "Open your Penpot file + the MCP plugin (keep it open), restart the client, then call high_level_overview to verify.",
  },
});
