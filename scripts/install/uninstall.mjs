#!/usr/bin/env node
/**
 * uninstall.mjs — manifest-driven removal of everything the installer wired.
 *
 * SAFE BY DEFAULT: without --yes it only PRINTS the removal plan (what would be deleted, which
 * marker blocks stripped, which MCP entries removed) and exits 0. The agent shows that plan to the
 * user and re-runs with --yes after explicit confirmation (INSTALL.md's confirm-before-writing rule).
 *
 * What it does per client recorded in ~/.penpot-ai-kit/install-manifest.json (or --client <id> only):
 *   - files that ARE kit artifacts (skill dirs, /penpot-* commands, dist files) → deleted
 *   - files the installer only UPSERTED a marker block into (CLAUDE.md, .windsurfrules, AGENTS.md,
 *     .cursor rules) → the penpot-ai-kit marker block is stripped; the file itself is kept
 *     (deleted only if stripping leaves it empty AND it's a kit-named file like penpot-kit.mdc)
 *   - opencode.json → the kit's entries are removed from `instructions`
 *   - the client's MCP config → ONLY the `penpot` server entry is removed (JSON) / the kit's
 *     marker-bounded TOML block is stripped (codex) — other servers are never touched
 * Then, if no client remains installed (or --all), the seed dir itself is removed.
 *
 * NOT touched: the original clone, the user's Penpot MCP Key inside Penpot, any SessionStart hook
 * (report it — hooks live in ~/.claude/settings.json and the user may have personal entries there).
 *
 * Usage: node scripts/install/uninstall.mjs [--client <id>] [--yes] [--keep-seed]
 */
import { existsSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { kitHome, normalizeManifest, readJSON, clientDialect, arg, flag } from "./lib.mjs";

const argv = process.argv.slice(2);
const onlyClient = arg(argv, "client", null);
const yes = flag(argv, "yes");
const keepSeed = flag(argv, "keep-seed");

const out = (o) => { process.stdout.write(JSON.stringify(o, null, 2) + "\n"); };
const seedHome = kitHome();
const manifest = normalizeManifest(readJSON(join(seedHome, "install-manifest.json")));
if (!manifest || !Object.keys(manifest.installs).length) {
  out({ ok: false, error: `No install manifest at ${seedHome}/install-manifest.json — fall back to the manual uninstall steps in INSTALL.md / docs/clients.md.` });
  process.exit(1);
}

const MD_BEGIN = "<!-- penpot-ai-kit:begin -->", MD_END = "<!-- penpot-ai-kit:end -->";
const TOML_BEGIN = "# penpot-ai-kit:begin", TOML_END = "# penpot-ai-kit:end";

const plan = [];   // { action: "delete"|"strip-block"|"remove-mcp-entry"|"edit-json", path, detail }
const note = (action, path, detail) => plan.push({ action, path, detail });

const isInsideSeed = (p) => p.startsWith(seedHome + "/") || p === seedHome;

function planFiles(client, rec) {
  for (const f of rec.files || []) {
    if (!existsSync(f)) continue;
    if (isInsideSeed(f)) continue; // seed handled at the end
    if (f === rec.mcpConfig) continue; // MCP entries are edited surgically below; never delete the config file
    const stat = statSync(f);
    if (stat.isDirectory()) { note("delete", f, "kit artifact (directory)"); continue; }
    const text = readFileSync(f, "utf8");
    if (text.includes(MD_BEGIN)) {
      note("strip-block", f, "remove the penpot-ai-kit marker block, keep the rest of the file");
    } else if (client === "opencode" && f.endsWith("opencode.json")) {
      note("edit-json", f, "remove the kit's entries from `instructions`");
    } else {
      note("delete", f, "kit artifact (file)");
    }
  }
  // the MCP entry
  if (rec.mcpConfig && rec.mcpServer && existsSync(rec.mcpConfig)) {
    note("remove-mcp-entry", rec.mcpConfig, `remove ONLY the "${rec.mcpServer}" server entry (${clientDialect(client)})`);
  }
}

const clients = onlyClient ? [onlyClient] : Object.keys(manifest.installs);
for (const c of clients) {
  const rec = manifest.installs[c];
  if (!rec) { out({ ok: false, error: `client "${c}" not in the manifest (${Object.keys(manifest.installs).join(", ")})` }); process.exit(1); }
  planFiles(c, rec);
}
const removingAll = !onlyClient || clients.length === Object.keys(manifest.installs).length;
if (removingAll && !keepSeed) note("delete", seedHome, "the installed seed (last step; the clone is never touched)");
else note("edit-json", join(seedHome, "install-manifest.json"), `drop ${clients.join(", ")} from the manifest`);

if (!yes) {
  out({ ok: true, dryRun: true, clients, plan,
    confirm: "This is the removal plan — nothing was changed. Show it to the user; on their explicit OK re-run with --yes.",
    alsoCheck: "If a SessionStart update hook was wired, remove the kit's entry from ~/.claude/settings.json manually (user hooks live there too)." });
  process.exit(0);
}

// ---------- apply ----------
const done = [], errors = [];
for (const step of plan) {
  try {
    if (step.action === "delete") {
      rmSync(step.path, { recursive: true, force: true });
    } else if (step.action === "strip-block") {
      const text = readFileSync(step.path, "utf8");
      const stripped = text.replace(new RegExp(`\\n?${MD_BEGIN}[\\s\\S]*?${MD_END}\\n?`), "\n").replace(/\n{3,}/g, "\n\n");
      if (!stripped.trim() && /penpot-kit/.test(step.path)) rmSync(step.path, { force: true });
      else writeFileSync(step.path, stripped, "utf8");
    } else if (step.action === "remove-mcp-entry") {
      if (step.path.endsWith(".toml")) {
        const text = readFileSync(step.path, "utf8");
        writeFileSync(step.path, text.replace(new RegExp(`\\n?${TOML_BEGIN}[\\s\\S]*?${TOML_END}\\n?`), "\n").replace(/\n{3,}/g, "\n\n"), "utf8");
      } else {
        const cfg = JSON.parse(readFileSync(step.path, "utf8"));
        const rootKey = cfg.mcpServers ? "mcpServers" : (cfg.mcp ? "mcp" : null);
        const serverName = step.detail.match(/"([^"]+)"/)?.[1] || "penpot";
        if (rootKey && cfg[rootKey] && cfg[rootKey][serverName]) delete cfg[rootKey][serverName];
        writeFileSync(step.path, JSON.stringify(cfg, null, 2) + "\n", "utf8");
      }
    } else if (step.action === "edit-json") {
      if (step.path.endsWith("opencode.json")) {
        const cfg = JSON.parse(readFileSync(step.path, "utf8"));
        if (Array.isArray(cfg.instructions)) cfg.instructions = cfg.instructions.filter((i) => !String(i).includes(seedHome));
        writeFileSync(step.path, JSON.stringify(cfg, null, 2) + "\n", "utf8");
      } else if (step.path.endsWith("install-manifest.json")) {
        const m = readJSON(step.path) || {};
        const installs = m.installs || {};
        for (const c of clients) delete installs[c];
        m.installs = installs;
        m.lastClient = Object.keys(installs)[0] || null;
        writeFileSync(step.path, JSON.stringify(m, null, 2) + "\n", "utf8");
      }
    }
    done.push(step);
  } catch (e) {
    errors.push({ ...step, error: e.message });
  }
}

out({ ok: errors.length === 0, applied: done.length, errors,
  reminder: "Restart the affected client(s). If a SessionStart update hook was wired, remove the kit's entry from ~/.claude/settings.json (not automated — user hooks live in the same file)." });
process.exit(errors.length ? 1 : 0);
