#!/usr/bin/env node
/**
 * update.mjs — ONE-STEP update: re-seed the installed kit AND re-wire every installed client.
 *
 * Before this script existed, updating was two manual steps (install-seed.mjs, then
 * install-behavior.mjs per client) and forgetting the second left e.g. Claude Code's vendored
 * skill copies in ~/.claude/skills stale. This chains both, driven by the install manifest:
 *   1. install-seed.mjs → refresh ~/.penpot-ai-kit from the clone.
 *   2. install-behavior.mjs --client <c> for each client recorded in install-manifest.json
 *      (project dir for project-scoped clients is recovered from the manifest).
 * It never touches MCP configs (the key/server entry doesn't change on a content update).
 *
 * Usage:   node scripts/install/update.mjs [--dry-run]
 * Output:  one JSON summary { ok, seed, behaviors:[{client, ok, userAction|error}] }.
 * Safe to re-run (both children are idempotent). Exit 1 if any step failed.
 */
import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { kitHome, normalizeManifest, readJSON, flag } from "./lib.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const dryRun = flag(argv, "dry-run");

const out = (o) => { process.stdout.write(JSON.stringify(o, null, 2) + "\n"); };
const run = (script, args) => {
  const stdout = execFileSync(process.execPath, [join(HERE, script), ...args], { encoding: "utf8" });
  try { return JSON.parse(stdout); } catch { return { ok: false, error: `unparseable output from ${script}: ${stdout.slice(0, 200)}` }; }
};

const seedHome = kitHome();
const manifestPath = join(seedHome, "install-manifest.json");
const manifest = normalizeManifest(readJSON(manifestPath));
if (!existsSync(join(seedHome, "AGENTS.md"))) {
  out({ ok: false, error: `No installed seed at ${seedHome}. Run the installer first (INSTALL.md).` });
  process.exit(1);
}

// 1. Re-seed.
let seed;
try { seed = run("install-seed.mjs", dryRun ? ["--dry-run"] : []); }
catch (e) { out({ ok: false, error: `install-seed failed: ${e.message}` }); process.exit(1); }

// 2. Re-wire each recorded client. New manifests record project scope directly; legacy
// Cursor/Windsurf records recover it from the behavior file path.
const projectDirFor = (client, rec) => {
  if (rec.scope === "project" && rec.targetDir) return resolve(rec.targetDir);
  if (["cursor", "windsurf"].includes(client) && rec.targetDir) return resolve(rec.targetDir);
  const files = rec.files || [];
  if (client === "cursor") {
    const f = files.find((p) => p.endsWith(join(".cursor", "rules", "penpot-kit.mdc")));
    return f ? resolve(f, "..", "..", "..") : null;
  }
  if (client === "windsurf") {
    const f = files.find((p) => p.endsWith(".windsurfrules"));
    return f ? dirname(f) : null;
  }
  return null; // global clients need no target dir
};

const behaviors = [];
for (const [client, rec] of Object.entries(manifest && manifest.installs || {})) {
  const args = ["--client", client, "--kit-path", seedHome];
  const scope = rec.scope || "global";
  const projectDir = projectDirFor(client, rec);
  if (client === "codex") args.push("--scope", scope);
  if (projectDir) args.push("--target-dir", projectDir);
  if (dryRun) args.push("--dry-run");
  try {
    const r = run("install-behavior.mjs", args);
    if (!dryRun && r.ok) rec.files = [...new Set([...(rec.files || []), ...(r.touched || [])])];
    behaviors.push({ client, ok: !!r.ok, userAction: r.userAction || null, error: r.ok ? null : r.error || "unknown error" });
  } catch (e) {
    behaviors.push({ client, ok: false, userAction: null, error: e.message });
  }
}

if (!dryRun && manifest) {
  const storedManifest = { kitSeed: seedHome, lastClient: manifest.lastClient, installs: manifest.installs };
  writeFileSync(manifestPath, JSON.stringify(storedManifest, null, 2) + "\n", "utf8");
}

const ok = !!seed.ok && behaviors.every((b) => b.ok);
out({ ok, dryRun: !!dryRun, seed: { dest: seed.dest || seedHome, version: seed.version || null, digest: seed.digest || null }, behaviors,
  note: behaviors.length ? "Seed refreshed and every installed client re-wired. Restart the client(s) to pick up changes." :
    "Seed refreshed. No clients recorded in the manifest — run install-behavior.mjs manually if a client should be wired." });
process.exit(ok ? 0 : 1);
