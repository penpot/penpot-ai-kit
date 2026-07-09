#!/usr/bin/env node
/**
 * update-lock.mjs — compute real content hashes into skills.lock.
 *
 * Fills what the original lockfile deferred ("integrity: pending"): a sha256 (16-hex, same shape
 * as the installer's kitDigest) per skill — over every file in the skill's directory — plus the
 * shared/ + policies/ doctrine hash (vendored into every native bundle, so it's part of what a
 * skill "is"), and a whole-kit integrity digest.
 *
 * Run it before tagging a release (and after any content change you intend to ship):
 *   node scripts/dev/update-lock.mjs           # rewrites skills.lock
 *   node scripts/dev/update-lock.mjs --check   # verifies, exit 1 on mismatch (CI)
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { kitDigest } from "../install/lib.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const check = process.argv.includes("--check");

function dirDigest(root) {
  const files = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else files.push(relative(root, p).split(sep).join("/"));
    }
  };
  walk(root);
  const h = createHash("sha256");
  for (const rel of files.sort()) {
    h.update(rel); h.update("\0"); h.update(readFileSync(join(root, rel))); h.update("\n");
  }
  return h.digest("hex").slice(0, 16);
}

const manifest = JSON.parse(readFileSync(join(ROOT, "skills.json"), "utf8"));
const lock = {
  lockfileVersion: 2,
  integrity: `sha256-16:${kitDigest(ROOT)}`,
  note: "Per-skill hash = sha256 (16 hex) over every file in the skill dir; doctrine = shared/ + policies/ (vendored into native bundles). Regenerate with scripts/dev/update-lock.mjs; verify with --check.",
  doctrine: {
    shared: `sha256-16:${dirDigest(join(ROOT, "shared"))}`,
    policies: `sha256-16:${dirDigest(join(ROOT, "policies"))}`,
  },
  skills: {},
};
for (const s of manifest.skills) {
  const dir = join(ROOT, "skills", s.id);
  statSync(dir); // throws if the manifest lists a skill with no dir
  lock.skills[s.id] = { version: s.version, hash: `sha256-16:${dirDigest(dir)}` };
}

const lockPath = join(ROOT, "skills.lock");
const next = JSON.stringify(lock, null, 2) + "\n";
if (check) {
  const current = readFileSync(lockPath, "utf8");
  if (current === next) { process.stdout.write("✓ skills.lock matches content\n"); process.exit(0); }
  process.stdout.write("✗ skills.lock is stale — run scripts/dev/update-lock.mjs\n");
  process.exit(1);
}
writeFileSync(lockPath, next, "utf8");
process.stdout.write(`✓ skills.lock updated: ${manifest.skills.length} skills, integrity ${lock.integrity}\n`);
