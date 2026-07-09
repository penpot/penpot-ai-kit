/**
 * lib.mjs — shared helpers for the Penpot AI Kit installer (B2 "disposable seed" model).
 *
 * Model: the cloned repo is a READ-ONLY seed. `install-seed.mjs` copies it ONCE to a stable user
 * location (kitHome, default ~/.penpot-ai-kit). Everything else (MCP secret, behavior pointers) is
 * written to the client's USER/GLOBAL locations — never into the clone, never into a project unless
 * the client only supports project-scoped rules. assertOutsideKit() enforces that the original clone
 * is never written to.
 */
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { createHash } from "node:crypto";
import { cpSync, existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

export const HOME = homedir();
export const PLATFORM = process.platform; // "darwin" | "win32" | "linux"
export const APPDATA = process.env.APPDATA || join(HOME, "AppData", "Roaming");

// Repo root of the ORIGINAL clone — where these scripts physically live (robust, cwd-independent).
export const KIT_SOURCE = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

// Stable user-home destination for the installed seed (overridable).
export const kitHome = () => process.env.PENPOT_KIT_HOME || join(HOME, ".penpot-ai-kit");

export function isInside(child, parent) {
  const rel = relative(resolve(parent), resolve(child));
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

/** Throw if `target` would land inside the read-only clone. The whole point of B2. */
export function assertOutsideKit(target) {
  if (isInside(target, KIT_SOURCE)) {
    throw new Error(
      `refusing to write inside the kit source (read-only seed): ${target}\n` +
      `Kit source: ${KIT_SOURCE}\nWrite to a user/global location or a separate project dir instead.`
    );
  }
}

/** Config file FORMAT per client. JSON `mcpServers` is the common one; OpenCode and Codex differ. */
export function clientDialect(client) {
  switch (client) {
    case "opencode": return "opencode-json"; // top-level "mcp" key, {type,command|url,enabled}
    case "codex": return "codex-toml";        // [mcp_servers.NAME] TOML table
    default: return "mcpServers-json";        // claude-*, cursor, windsurf, generic
  }
}

/** Where the SECRET-bearing MCP config goes per client: USER/GLOBAL, never near a repo. */
export function mcpConfigPath(client) {
  switch (client) {
    case "claude-code": return join(HOME, ".claude.json");
    case "cursor": return join(HOME, ".cursor", "mcp.json");
    case "windsurf": return join(HOME, ".codeium", "windsurf", "mcp_config.json");
    case "opencode": return join(HOME, ".config", "opencode", "opencode.json");
    case "codex": return join(HOME, ".codex", "config.toml"); // shared by Codex CLI, desktop App, IDE, Web
    case "claude-desktop":
      return PLATFORM === "darwin" ? join(HOME, "Library", "Application Support", "Claude", "claude_desktop_config.json")
        : PLATFORM === "win32" ? join(APPDATA, "Claude", "claude_desktop_config.json")
        : join(HOME, ".config", "Claude", "claude_desktop_config.json");
    case "generic": return join(kitHome(), "mcp.generic.json");
    default: return null;
  }
}

/**
 * Where the (non-secret) behavior pointer goes per client. Global where the client has a global
 * mechanism; project-scoped (into `projectDir`, NOT the kit) where rules are only per-project.
 */
export function behaviorTarget(client, projectDir) {
  switch (client) {
    case "claude-code": // B3: native self-contained skills + a slim global memory pointer + commands
      return { kind: "claude-native", file: join(HOME, ".claude", "CLAUDE.md"),
               skillsDir: join(HOME, ".claude", "skills"), commandsDir: join(HOME, ".claude", "commands") };
    case "cursor":
      return { kind: "rules-mdc-project", file: join(projectDir, ".cursor", "rules", "penpot-kit.mdc") };
    case "windsurf":
      return { kind: "rules-file-project", file: join(projectDir, ".windsurfrules") };
    case "opencode": // add an `instructions` pointer in global opencode.json (combines, dodges the AGENTS shadow bug)
      return { kind: "opencode-instructions", file: join(HOME, ".config", "opencode", "opencode.json") };
    case "codex": // global personal instructions, read by CLI + desktop App + IDE + Web
      return { kind: "agents-global", file: join(HOME, ".codex", "AGENTS.md") };
    case "claude-desktop":
    case "generic":
      return { kind: "attach", file: join(kitHome(), "dist", "penpot-kit.instructions.md") };
    default: return null;
  }
}

/**
 * B3 — build SELF-CONTAINED skill bundles for native discovery (Claude Code).
 * Each skill references shared/ and policies/ by repo-relative paths, so we vendor a copy of those two
 * folders INTO each skill dir; the existing `shared/...`/`policies/...` references then resolve within
 * the skill. The router additionally gets `workflows/` vendored (it is the only skill that routes to
 * them, and native installs would otherwise have no way to reach the pipelines). Returns the skill
 * names + the dest dir (for the manifest). Synchronous (cpSync).
 */
export function buildSelfContainedSkills(seedPath, destSkillsDir, { dryRun = false } = {}) {
  assertOutsideKit(destSkillsDir);
  const srcSkills = join(seedPath, "skills");
  const sharedSrc = join(seedPath, "shared");
  const policiesSrc = join(seedPath, "policies");
  const workflowsSrc = join(seedPath, "workflows");
  const built = [];
  if (!existsSync(srcSkills)) return { skills: built, dest: destSkillsDir };
  for (const name of readdirSync(srcSkills)) {
    const skillDir = join(srcSkills, name);
    if (!statSync(skillDir).isDirectory()) continue;
    const dest = join(destSkillsDir, name);
    if (!dryRun) {
      cpSync(skillDir, dest, { recursive: true, force: true });            // SKILL.md + references/ + scripts/
      if (existsSync(sharedSrc)) cpSync(sharedSrc, join(dest, "shared"), { recursive: true, force: true });
      if (existsSync(policiesSrc)) cpSync(policiesSrc, join(dest, "policies"), { recursive: true, force: true });
      if (name === "penpot-router" && existsSync(workflowsSrc))
        cpSync(workflowsSrc, join(dest, "workflows"), { recursive: true, force: true });
    }
    built.push(name);
  }
  return { skills: built, dest: destSkillsDir };
}

/**
 * Stale penpot-* skill dirs in destSkillsDir that are NOT part of this kit (older kit generations or
 * predecessor skills). They shadow the kit's skills with overlapping trigger descriptions, so the
 * installer reports them and can remove them with --prune (after user confirmation).
 */
export function findOrphanSkills(seedPath, destSkillsDir) {
  const kitNames = new Set();
  const srcSkills = join(seedPath, "skills");
  try {
    for (const n of readdirSync(srcSkills)) if (statSync(join(srcSkills, n)).isDirectory()) kitNames.add(n);
  } catch { return []; }
  try {
    return readdirSync(destSkillsDir).filter((n) => {
      if (!n.startsWith("penpot-") || kitNames.has(n)) return false;
      try { return statSync(join(destSkillsDir, n)).isDirectory(); } catch { return false; }
    });
  } catch { return []; }
}

/** Parse JSON at `p`, returning null on missing/unreadable/invalid (never throws). */
export function readJSON(p) {
  try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; }
}

const versionOf = (root) => { const s = readJSON(join(root, "skills.json")); return s && s.version || null; };

/** Provenance file written INTO the seed at seed-time so a later session can tell if the source moved on. */
export const SEED_PROVENANCE_FILE = ".penpot-kit-seed.json";
export const seedProvenancePath = (seedHome = kitHome()) => join(seedHome, SEED_PROVENANCE_FILE);

// Dev-only / heavy / generated paths excluded from the runtime seed AND from the content digest, so the
// digest reflects only what actually ships and changes meaningfully. Keep in sync with install-seed.mjs.
// Assistant-local config dirs (.claude, .cursor, …) are excluded too: clients rewrite them on the fly
// (e.g. permission grants), which would make the digest flap "stale" with no real kit change.
export const KIT_EXCLUDE = new Set([
  ".git", "node_modules", "evals", "dist",
  ".claude", ".cursor", ".windsurf", ".qwen",
  ".penpot-kit-install.json", "install-manifest.json", SEED_PROVENANCE_FILE,
]);

// Files that SHIP with the seed but do not affect installed behavior — excluded from the content
// digest only (still copied). README: keeps the update nag from firing on e.g. an image swap.
// skills.lock: DERIVED from the content (scripts/dev/update-lock.mjs) — including it would make
// the lock's own integrity field self-referential.
export const DIGEST_ONLY_EXCLUDE = new Set(["README.md", "skills.lock"]);

/** Sorted list of kit-relative file paths under `root`, applying KIT_EXCLUDE (+ digest-only skips). Stable across machines. */
export function kitFileList(root) {
  const files = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (KIT_EXCLUDE.has(e.name)) continue;
      const p = join(dir, e.name);
      const rel = relative(root, p).split(sep).join("/");
      if (e.isDirectory()) walk(p);
      else if (!DIGEST_ONLY_EXCLUDE.has(rel)) files.push(rel);
    }
  };
  try { walk(root); } catch { /* root missing → empty list */ }
  return files.sort();
}

/**
 * Content fingerprint of the kit tree at `root`: a sha256 over each shipping file's path + bytes.
 * Computed by Node (zero model tokens). Two trees with identical content yield the same short hex —
 * the cheap, reliable "did anything change?" signal (catches edits that don't bump skills.json version).
 */
export function kitDigest(root) {
  const h = createHash("sha256");
  for (const rel of kitFileList(root)) {
    h.update(rel); h.update("\0");
    try { h.update(readFileSync(join(root, rel))); } catch { h.update("\0MISSING"); }
    h.update("\n");
  }
  return h.digest("hex").slice(0, 16);
}

/**
 * READ-ONLY "is the kit already installed?" probe. Touches nothing. The agent (INSTALL.md Phase 0) uses
 * this to greet a returning user with what's installed and offer update/repair/skip instead of a blind
 * reinstall. Signals: seed home present (AGENTS.md), the install manifest (records client+mode+MCP), and
 * installed-vs-source version. `behaviorTarget` existence per the manifest's client is a wiring hint.
 */
/**
 * Normalize the uninstall manifest. Old shape (single install, overwritten per run):
 * { client, mode, files, mcpServer, mcpConfig }. New shape (accumulates per client):
 * { lastClient, installs: { [client]: { mode, files, mcpServer, mcpConfig } } }.
 */
export function normalizeManifest(manifest) {
  if (!manifest) return null;
  const installs = manifest.installs
    || (manifest.client ? { [manifest.client]: { mode: manifest.mode, files: manifest.files, mcpServer: manifest.mcpServer, mcpConfig: manifest.mcpConfig } } : {});
  return { lastClient: manifest.lastClient || manifest.client || null, clients: Object.keys(installs), installs };
}

export function kitInstallStatus() {
  const seedHome = kitHome();
  const seedReady = existsSync(join(seedHome, "AGENTS.md"));
  const manifest = normalizeManifest(readJSON(join(seedHome, "install-manifest.json")));
  const provenance = readJSON(seedProvenancePath(seedHome));
  const installedVersion = seedReady ? versionOf(seedHome) : null;
  const sourceVersion = versionOf(KIT_SOURCE);
  // Prefer the content digest (catches edits that don't bump the version); fall back to version if the
  // seed predates provenance. Digest is computed by Node — zero model tokens.
  const sourceDigest = kitDigest(KIT_SOURCE);
  const seededDigest = provenance && provenance.sourceDigest || null;
  const contentMatch = seededDigest != null ? seededDigest === sourceDigest : null;
  const upToDate = seedReady && (contentMatch != null ? contentMatch : installedVersion != null && installedVersion === sourceVersion);
  return {
    installed: seedReady,
    seedHome,
    hasManifest: !!manifest,
    manifest,   // { lastClient, clients, installs: { [client]: { mode, files, mcpServer, mcpConfig } } }
    installedVersion,
    sourceVersion,
    seededDigest,
    sourceDigest,
    contentMatch,   // null = seed has no provenance (re-seed once to enable digest checks)
    upToDate,
  };
}

export const arg = (argv, name, def) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : true) : def;
};
export const flag = (argv, name) => argv.includes(`--${name}`);
