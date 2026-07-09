#!/usr/bin/env node
/**
 * validate-kit.mjs — repo-dev lint for the kit's content. Dependency-free, read-only.
 *
 * Catches the classes of drift that have actually bitten this repo:
 *   - skill sets out of sync across skills/, skills.json, skills.lock, .well-known index
 *   - version drift between SKILL.md frontmatter and the manifests
 *   - `requires:` pointing at shared/ files that don't exist
 *   - mode drift between SKILL.md `mode-default`, skills.json `mode`, and policies/modes.json
 *   - pipeline.json files that don't match shared/pipeline.schema.json's shape
 *     (step ids unique, next/branch targets resolve, referenced skills exist)
 *   - eval JSONs with unknown keys or references to nonexistent skills/workflows
 *   - dangling `penpot-*` name mentions in any shipped .md (skills that don't exist)
 *
 * Usage:  node scripts/dev/validate-kit.mjs        exit 0 = clean, 1 = problems (listed)
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const problems = [];
const bad = (file, msg) => problems.push(`${file}: ${msg}`);
const readJSON = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
const listDirs = (p) => existsSync(join(ROOT, p))
  ? readdirSync(join(ROOT, p)).filter((n) => statSync(join(ROOT, p, n)).isDirectory())
  : [];

// ---------- collect the ground truth sets ----------
const skillDirs = listDirs("skills");
const workflowDirs = listDirs("workflows");
const promptCommands = existsSync(join(ROOT, "prompts"))
  ? readdirSync(join(ROOT, "prompts")).filter((n) => n.endsWith(".md") && n !== "README.md")
      .map((n) => `penpot-${n.replace(/\.md$/, "")}`)
  : [];

// ---------- frontmatter parsing (minimal YAML subset used by SKILL.md) ----------
function frontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const fm = { requires: [] };
  let inReq = false;
  for (const line of m[1].split("\n")) {
    if (/^requires:/.test(line)) { inReq = true; continue; }
    if (inReq && /^\s+-\s+/.test(line)) { fm.requires.push(line.replace(/^\s+-\s+/, "").trim()); continue; }
    inReq = false;
    const kv = line.match(/^([a-z-]+):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].trim().replace(/^"|"$/g, "");
  }
  return fm;
}

// ---------- 1. skills/ ↔ manifests ----------
let manifest = null, lock = null, index = null;
try { manifest = readJSON("skills.json"); } catch (e) { bad("skills.json", `unparseable: ${e.message}`); }
try { lock = readJSON("skills.lock"); } catch (e) { bad("skills.lock", `unparseable: ${e.message}`); }
try { index = readJSON(".well-known/agent-skills/index.json"); } catch (e) { bad(".well-known/agent-skills/index.json", `unparseable: ${e.message}`); }

const manifestSkills = new Map((manifest?.skills || []).map((s) => [s.id, s]));
const lockSkills = new Map(Object.entries(lock?.skills || {}).map(([k, v]) => [k, typeof v === "string" ? { version: v } : v]));
const indexSkills = new Map((index?.skills || []).map((s) => [s.name, s]));

for (const name of skillDirs) {
  if (!manifestSkills.has(name)) bad("skills.json", `missing entry for skills/${name}`);
  if (!lockSkills.has(name)) bad("skills.lock", `missing entry for ${name}`);
  if (!indexSkills.has(name)) bad(".well-known/agent-skills/index.json", `missing entry for ${name}`);
}
for (const id of manifestSkills.keys()) if (!skillDirs.includes(id)) bad("skills.json", `entry '${id}' has no skills/${id}/ dir`);
for (const id of lockSkills.keys()) if (!skillDirs.includes(id)) bad("skills.lock", `entry '${id}' has no skills/${id}/ dir`);
for (const id of indexSkills.keys()) if (!skillDirs.includes(id)) bad(".well-known/agent-skills/index.json", `entry '${id}' has no skills/${id}/ dir`);

// ---------- 2. per-skill frontmatter ----------
let modes = null;
try { modes = readJSON("policies/modes.json"); } catch (e) { bad("policies/modes.json", `unparseable: ${e.message}`); }
const MODES = new Set(["suggest", "review", "autofix"]);
const modeAlias = (m) => (m === "suggest-then-review" ? "review" : m); // modes.json uses the long name for the global default only

for (const name of skillDirs) {
  const rel = `skills/${name}/SKILL.md`;
  if (!existsSync(join(ROOT, rel))) { bad(rel, "missing SKILL.md"); continue; }
  const fm = frontmatter(readFileSync(join(ROOT, rel), "utf8"));
  if (!fm) { bad(rel, "no YAML frontmatter"); continue; }
  if (fm.name !== name) bad(rel, `frontmatter name '${fm.name}' != dir '${name}'`);
  if (!MODES.has(fm["mode-default"])) bad(rel, `mode-default '${fm["mode-default"]}' not in ${[...MODES]}`);
  for (const req of fm.requires) {
    if (!existsSync(join(ROOT, req))) bad(rel, `requires '${req}' does not exist`);
  }
  const entry = manifestSkills.get(name);
  if (entry) {
    if (entry.version !== fm.version) bad(rel, `version ${fm.version} != skills.json ${entry.version}`);
    if (entry.mode !== fm["mode-default"]) bad(rel, `mode-default ${fm["mode-default"]} != skills.json mode ${entry.mode}`);
    if (!existsSync(join(ROOT, entry.path))) bad("skills.json", `path '${entry.path}' does not exist`);
  }
  const locked = lockSkills.get(name);
  if (locked && locked.version && locked.version !== fm.version) bad("skills.lock", `${name} version ${locked.version} != SKILL.md ${fm.version}`);
  const idx = indexSkills.get(name);
  if (idx && idx.version !== fm.version) bad(".well-known/agent-skills/index.json", `${name} version ${idx.version} != SKILL.md ${fm.version}`);
  const skillMode = modes?.skillModes?.[name];
  if (skillMode != null && modeAlias(skillMode) !== fm["mode-default"] && skillMode !== fm["mode-default"])
    bad("policies/modes.json", `${name} mode '${skillMode}' != SKILL.md mode-default '${fm["mode-default"]}'`);
}
if (modes?.skillModes) for (const k of Object.keys(modes.skillModes)) if (!skillDirs.includes(k)) bad("policies/modes.json", `skillModes entry '${k}' has no skills/${k}/ dir`);

// ---------- 3. pipelines ----------
const STEP_TYPES = new Set(["branch", "parallel", "aggregate", "action"]);
for (const wf of workflowDirs) {
  const rel = `workflows/${wf}/pipeline.json`;
  if (!existsSync(join(ROOT, rel))) { bad(rel, "missing pipeline.json"); continue; }
  let p;
  try { p = readJSON(rel); } catch (e) { bad(rel, `unparseable: ${e.message}`); continue; }
  if (p.id !== wf) bad(rel, `id '${p.id}' != dir '${wf}'`);
  if (!p.description) bad(rel, "missing description");

  if (Array.isArray(p.routes)) { // routing table document
    for (const r of p.routes) {
      const m = String(r.target || "").match(/^(skill|workflow):(.+)$/);
      if (!m) { bad(rel, `route target '${r.target}' must be skill:<id> or workflow:<id>`); continue; }
      const [, kind, id] = m;
      if (kind === "skill" && !skillDirs.includes(id)) bad(rel, `route targets nonexistent skill '${id}'`);
      if (kind === "workflow" && !workflowDirs.includes(id)) bad(rel, `route targets nonexistent workflow '${id}'`);
    }
    // every skill (except the router itself) should be reachable from the routing table
    const routed = new Set(p.routes.map((r) => String(r.target).split(":")[1]));
    for (const s of skillDirs) if (s !== "penpot-router" && !routed.has(s)) bad(rel, `skill '${s}' has no route`);
    continue;
  }

  if (!Array.isArray(p.steps) || !p.steps.length) { bad(rel, "missing steps[]"); continue; }
  const ids = new Set();
  const targets = [];
  for (const s of p.steps) {
    if (!s.id) { bad(rel, "step without id"); continue; }
    if (ids.has(s.id)) bad(rel, `duplicate step id '${s.id}'`);
    ids.add(s.id);
    const type = s.type || "skill";
    if (type !== "skill" && !STEP_TYPES.has(type)) bad(rel, `step '${s.id}' has unknown type '${type}'`);
    if (type === "skill") {
      if (!skillDirs.includes(s.skill)) bad(rel, `step '${s.id}' references nonexistent skill '${s.skill}'`);
      if (!["halt", "report"].includes(s.on_fail)) bad(rel, `step '${s.id}' on_fail must be halt|report`);
      targets.push([s.id, s.next]);
    } else if (type === "branch") {
      targets.push([s.id, s.thenNext], [s.id, s.elseNext]);
    } else if (type === "parallel") {
      for (const b of s.branches || []) {
        ids.add(b.id);
        if (!skillDirs.includes(b.skill)) bad(rel, `parallel branch '${b.id}' references nonexistent skill '${b.skill}'`);
      }
      targets.push([s.id, s.next]);
    } else {
      targets.push([s.id, s.next]);
    }
  }
  for (const [from, to] of targets) {
    if (!to) { bad(rel, `step '${from}' missing next/thenNext/elseNext`); continue; }
    if (to !== "done" && !ids.has(to)) bad(rel, `step '${from}' points at unknown step '${to}'`);
  }
}

// ---------- 4. evals ----------
const EVAL_KEYS = new Set(["id", "skill", "workflow", "fixture", "expected", "pass_criteria"]);
const EXPECTED_KEYS = new Set(["must_detect", "must_create", "must_do", "must_not"]);
if (existsSync(join(ROOT, "evals/golden"))) {
  for (const f of readdirSync(join(ROOT, "evals/golden")).filter((n) => n.endsWith(".eval.json"))) {
    const rel = `evals/golden/${f}`;
    let e;
    try { e = readJSON(rel); } catch (err) { bad(rel, `unparseable: ${err.message}`); continue; }
    for (const k of Object.keys(e)) if (!EVAL_KEYS.has(k)) bad(rel, `unknown key '${k}'`);
    for (const k of Object.keys(e.expected || {})) if (!EXPECTED_KEYS.has(k)) bad(rel, `unknown expected key '${k}'`);
    if (e.skill && !skillDirs.includes(e.skill)) bad(rel, `references nonexistent skill '${e.skill}'`);
    if (e.workflow && !workflowDirs.includes(e.workflow)) bad(rel, `references nonexistent workflow '${e.workflow}'`);
    if (!e.skill && !e.workflow) bad(rel, "needs a skill or workflow target");
  }
}

// ---------- 5. dangling penpot-* mentions in shipped .md ----------
const KNOWN = new Set([
  ...skillDirs, ...workflowDirs, ...promptCommands,
  "penpot-ai-kit", "penpot-kit", "penpot-core-skills", // repo/package/self names
  "penpot-ai", // the setSharedPluginData ledger namespace (shared/state-management.md)
]);
const SCAN_DIRS = ["skills", "workflows", "shared", "prompts", "policies", "docs"];
const mdFiles = [];
const collectMd = (dir) => {
  for (const e of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    const rel = join(dir, e.name);
    if (e.isDirectory()) collectMd(rel);
    else if (e.name.endsWith(".md")) mdFiles.push(rel);
  }
};
for (const d of SCAN_DIRS) if (existsSync(join(ROOT, d))) collectMd(d);
mdFiles.push("AGENTS.md", "README.md", "INSTALL.md");
for (const rel of mdFiles) {
  const text = readFileSync(join(ROOT, rel), "utf8");
  const seen = new Set();
  for (const m of text.matchAll(/`\/?(penpot-[a-z][a-z0-9-]*)`/g)) {
    const name = m[1].replace(/-(skill|workflow)s?$/, "$&"); // keep as-is; suffix stripping not needed
    if (!KNOWN.has(m[1]) && !seen.has(m[1])) {
      seen.add(m[1]);
      bad(rel, `mentions \`${m[1]}\` which is not a known skill/workflow/command`);
    }
  }
}

// ---------- report ----------
if (problems.length) {
  process.stdout.write(`✗ ${problems.length} problem(s):\n` + problems.map((p) => `  - ${p}`).join("\n") + "\n");
  process.exit(1);
}
process.stdout.write(`✓ kit content consistent: ${skillDirs.length} skills, ${workflowDirs.length} workflows, ${promptCommands.length} brief commands validated.\n`);
