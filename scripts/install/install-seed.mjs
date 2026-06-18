#!/usr/bin/env node
/**
 * install-seed.mjs — copy the kit ONCE to a stable user location (B2 "disposable seed").
 *
 * The clone is read-only; this copies the whole tree (so shared/ + policies/ relative links stay
 * intact) to kitHome (default ~/.penpot-ai-kit) in a SINGLE OS-level recursive copy. The installing
 * agent never reads file contents — it runs this and relays the short JSON summary. Token cost ≈ 0:
 * bytes move on disk, not through the model's context.
 *
 * Usage:   node scripts/install/install-seed.mjs [--dest <dir>] [--dry-run]
 * Output:  JSON { ok, src, dest, version, fileCount, touched:[dest] }.
 */
import { cp, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, relative, sep } from "node:path";
import { KIT_SOURCE, kitHome, isInside, arg, flag, kitDigest, seedProvenancePath, KIT_EXCLUDE } from "./lib.mjs";

const argv = process.argv.slice(2);
const dest = arg(argv, "dest", kitHome());
const dryRun = flag(argv, "dry-run");

const out = (o) => { process.stdout.write(JSON.stringify(o, null, 2) + "\n"); };
const fail = (m) => { out({ ok: false, error: m }); process.exit(1); };

// Guard both directions: never copy into ourselves or onto the source.
if (isInside(dest, KIT_SOURCE)) fail(`--dest must be OUTSIDE the kit source (got ${dest} inside ${KIT_SOURCE})`);
if (isInside(KIT_SOURCE, dest)) fail(`--dest must not contain the kit source (${dest} contains ${KIT_SOURCE})`);

// Exclude dev-only / heavy / generated paths from the runtime seed (shared with the digest in lib.mjs).
const filter = (srcPath) => {
  if (srcPath === KIT_SOURCE) return true;
  const segs = relative(KIT_SOURCE, srcPath).split(sep);
  return !segs.some((s) => KIT_EXCLUDE.has(s));
};

async function countFiles(dir) {
  let n = 0;
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) n += await countFiles(p);
    else n += 1;
  }
  return n;
}

let version = "unknown";
try { version = JSON.parse(await readFile(join(KIT_SOURCE, "skills.json"), "utf8")).version || version; } catch {}

if (dryRun) {
  out({ ok: true, dryRun: true, src: KIT_SOURCE, dest, version, note: "would recursively copy the kit (excluding .git/node_modules/evals/dist) to dest", touched: [] });
  process.exit(0);
}

await cp(KIT_SOURCE, dest, { recursive: true, force: true, filter });
const fileCount = existsSync(dest) ? await countFiles(dest) : 0;

// Stamp provenance so a later session can cheaply tell if the source clone moved on (digest = content
// fingerprint; commit = git HEAD if available). check-updates.mjs reads this back.
let sourceCommit = null;
try { sourceCommit = execFileSync("git", ["-C", KIT_SOURCE, "rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim(); } catch {}
const provenance = { sourcePath: KIT_SOURCE, sourceDigest: kitDigest(KIT_SOURCE), sourceCommit, version, seededAtVersion: version };
await writeFile(seedProvenancePath(dest), JSON.stringify(provenance, null, 2) + "\n", "utf8");

out({ ok: true, src: KIT_SOURCE, dest, version, fileCount, digest: provenance.sourceDigest, commit: sourceCommit, touched: [dest], note: "Seed installed. The original clone is now disposable. Re-run to update after a git pull." });
