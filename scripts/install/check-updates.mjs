#!/usr/bin/env node
/**
 * check-updates.mjs — READ-ONLY "is my installed kit behind the local clone?" probe. Touches nothing.
 *
 * The seed at kitHome (~/.penpot-ai-kit) is a COPY of this clone. After you edit the clone or `git pull`,
 * the seed is stale until re-seeded. This compares the clone's CURRENT content fingerprint against the
 * digest stamped into the seed at last seed-time (see install-seed.mjs). The hash is computed by Node —
 * zero model tokens — so a session can call this once and learn, in one line, whether to re-seed.
 *
 * Usage:
 *   node scripts/install/check-updates.mjs           # full JSON report
 *   node scripts/install/check-updates.mjs --hook     # SILENT when up to date; one actionable line when stale
 *                                                     # (ideal for a SessionStart hook — see INSTALL.md)
 * Exit code: 0 = up to date / not installed (nothing to do); 10 = updates available (stale seed).
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { KIT_SOURCE, kitHome, kitDigest, seedProvenancePath, readJSON, flag } from "./lib.mjs";

const hook = flag(process.argv.slice(2), "hook");
const out = (o) => { if (!hook) process.stdout.write(JSON.stringify(o, null, 2) + "\n"); };

const seedHome = kitHome();
const installed = existsSync(`${seedHome}/AGENTS.md`);
const provenance = installed ? readJSON(seedProvenancePath(seedHome)) : null;

// Not installed → nothing to update. Don't nag.
if (!installed) {
  out({ ok: true, installed: false, status: "not-installed", hint: "Run the installer (INSTALL.md) to set up the kit." });
  process.exit(0);
}

// Installed but no digest stamp (seed predates provenance) → recommend one re-seed to enable cheap checks.
if (!provenance || !provenance.sourceDigest) {
  const msg = "Penpot AI Kit: installed seed has no version stamp — re-seed once to enable update checks (node scripts/install/install-seed.mjs).";
  if (hook) process.stdout.write(msg + "\n");
  out({ ok: true, installed: true, status: "no-provenance", hint: msg });
  process.exit(10);
}

// Locate the clone to compare against. Normally this script runs FROM the clone (KIT_SOURCE = clone).
// If it's invoked from inside the installed seed (e.g. a hook pointing at the stable seed path), the
// thing that may have moved on is the original clone recorded in provenance.sourcePath.
let cloneRoot = KIT_SOURCE;
if (resolve(KIT_SOURCE) === resolve(seedHome)) cloneRoot = provenance.sourcePath || null;

// Clone gone (deleted / moved) → can't compare; the seed still works, so don't nag.
if (!cloneRoot || !existsSync(cloneRoot)) {
  out({ ok: true, installed: true, status: "source-gone", seedHome, sourcePath: provenance.sourcePath || null,
    hint: "Original clone not found — the installed seed is self-contained; re-clone only to pull upstream updates." });
  process.exit(0);
}

const sourceDigest = kitDigest(cloneRoot);
const upToDate = sourceDigest === provenance.sourceDigest;

if (upToDate) {
  out({ ok: true, installed: true, status: "up-to-date", seedHome, digest: sourceDigest, commit: provenance.sourceCommit || null });
  process.exit(0); // --hook prints nothing → zero noise, zero tokens on the happy path
}

// Stale: source moved on. Optionally count changed files via git (cheap; falls back to "content differs").
let changed = null, currentCommit = null;
try { currentCommit = execFileSync("git", ["-C", cloneRoot, "rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim(); } catch {}
try {
  const base = provenance.sourceCommit;
  if (base) {
    const names = execFileSync("git", ["-C", cloneRoot, "diff", "--name-only", `${base}`, "--"], { encoding: "utf8" }).trim();
    changed = names ? names.split("\n").length : null;
  }
} catch { /* not a git checkout or base commit gone — digest mismatch already proves staleness */ }

const updateCmd = cloneRoot === KIT_SOURCE ? "node scripts/install/install-seed.mjs" : `node ${cloneRoot}/scripts/install/install-seed.mjs`;
const line = `Penpot AI Kit: local changes not yet applied${changed ? ` (~${changed} file(s))` : ""} — run \`${updateCmd}\` to update the installed kit.`;
if (hook) process.stdout.write(line + "\n");
out({
  ok: true, installed: true, status: "updates-available", seedHome, cloneRoot,
  sourceDigest, seededDigest: provenance.sourceDigest,
  sourceCommit: currentCommit,
  seededCommit: provenance.sourceCommit || null,
  changedFiles: changed,
  hint: line,
});
process.exit(10);
