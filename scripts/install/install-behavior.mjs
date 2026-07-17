#!/usr/bin/env node
/**
 * install-behavior.mjs — wire a client to USE the installed seed (AGENTS.md + skills + workflows + prompts).
 *
 * B2 model: points at the SEED (kitHome, default ~/.penpot-ai-kit), not the disposable clone. Writes the
 * behavior pointer to the client's GLOBAL location where one exists (Claude Code → ~/.claude/CLAUDE.md +
 * ~/.claude/commands); otherwise to a project dir (Cursor/Windsurf rules are per-project) — never into the
 * kit source. Marker-bounded → idempotent. The agent runs this and relays the JSON; it does not read kit
 * content.
 *
 * Usage:
 *   node scripts/install/install-behavior.mjs --client cursor --target-dir /abs/my-project
 *   node scripts/install/install-behavior.mjs --client codex --scope project --target-dir /abs/my-project
 * Flags:
 *   --client claude-code|claude-desktop|cursor|windsurf|generic   (required)
 *   --kit-path <abs>    seed location (default: kitHome / ~/.penpot-ai-kit) · --target-dir <abs> (default cwd)
 *   --scope global|project  Codex behavior scope (default global; project requires --target-dir)
 *   --prune             native skill installs only: remove stale penpot-* skills from the target
 *                       skills dir. Without it they are only reported. Ask the user before passing it.
 *   --dry-run
 * Output: JSON { ok, client, kitPath, touched:[...], prompts:[...], orphanSkills:[...], prunedSkills:[...], userAction }.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { KIT_SOURCE, kitHome, behaviorTarget, assertOutsideKit, buildSelfContainedSkills, findOrphanSkills, arg, flag } from "./lib.mjs";

const argv = process.argv.slice(2);
const client = arg(argv, "client");
const dryRun = flag(argv, "dry-run");
const prune = flag(argv, "prune"); // remove stale penpot-* skills from native skill targets
const requestedTargetDir = arg(argv, "target-dir", null);
const scope = arg(argv, "scope", "global");
const kitPath = arg(argv, "kit-path", kitHome());

const out = (o) => { process.stdout.write(JSON.stringify(o, null, 2) + "\n"); };
const fail = (m) => { out({ ok: false, error: m }); process.exit(1); };
if (!client) fail("--client is required");
if (!["global", "project"].includes(scope)) fail(`--scope must be global|project (got ${scope})`);
if (client !== "codex" && scope !== "global") fail(`--scope project is only supported for codex (got ${client})`);
if (client === "codex" && scope === "project" && !requestedTargetDir) {
  fail("--target-dir is required for --client codex --scope project (got missing; expected a project path outside the kit)");
}
if (requestedTargetDir === true) fail("--target-dir requires a path value (got flag without value; expected a project path)");
const targetDir = resolve(requestedTargetDir || process.cwd());
const seedReady = existsSync(join(kitPath, "AGENTS.md"));
// In a real run the seed must exist; in --dry-run we preview even before install-seed has run.
if (!seedReady && !dryRun) fail(`--kit-path must be the installed seed (folder with AGENTS.md). Run install-seed.mjs first. Got: ${kitPath}`);

const MARK_BEGIN = "<!-- penpot-ai-kit:begin -->";
const MARK_END = "<!-- penpot-ai-kit:end -->";

function rulesBody(kp) {
  return `${MARK_BEGIN}
# Penpot AI Kit — operating rules
This client uses the Penpot AI Kit installed at: ${kp}

Before ANY Penpot design work:
1. Read ${kp}/AGENTS.md and follow it (tokens-first; never one-shot; Suggest → Apply-with-review; ask before meaningful changes; keep the fill policy in ${kp}/shared/modes-and-policies.md).
2. Your FIRST Penpot tool call each session is \`high_level_overview\` (no arguments).
3. Route the request via ${kp}/skills/penpot-router/SKILL.md — choose exactly ONE skill or workflow, then open and follow that skill's SKILL.md.

- Skills:    ${kp}/skills/<name>/SKILL.md
- Workflows: ${kp}/workflows/<name>/
- Doctrine the skills rely on: ${kp}/shared/ and ${kp}/policies/ — consult it; never invent Penpot API calls (verify with \`penpot_api_info\`).

When the user's request is underspecified, open the matching brief template in ${kp}/prompts/ (design-brief, component-spec, migration-brief, audit-request) and fill it WITH the user before acting. To resume an interrupted multi-phase run, use ${kp}/prompts/resume-continuation.md.
${MARK_END}`;
}

// B3 — slimmer pointer for Claude Code: skills are installed natively, so just load house-rules + first action.
function claudeNativeBody(kp) {
  return `${MARK_BEGIN}
# Penpot AI Kit — operating rules (penpot-* skills installed natively in ~/.claude/skills)
The Penpot skills are installed as native, self-contained Claude Code skills and auto-discovered by description.

Before ANY Penpot design work:
1. Read ${kp}/AGENTS.md and follow it (tokens-first; never one-shot; Suggest → Apply-with-review; ask before meaningful changes; the fill policy lives in each skill's bundled shared/modes-and-policies.md).
2. Your FIRST Penpot tool call each session is \`high_level_overview\` (no arguments).
3. Let the request trigger the matching penpot-* skill; if it spans several, use the penpot-router skill to pick exactly ONE. Use the /penpot-* slash-commands for structured briefs.
4. Multi-skill workflows (brief-to-screen, design-system-bootstrap, figma-migration, …) live in the penpot-router skill bundle under workflows/ (also at ${kp}/workflows/) — follow their pipeline.json when the router targets one.
${MARK_END}`;
}

function codexProjectBody(kp) {
  return `${MARK_BEGIN}
# Penpot AI Kit — project operating rules
Penpot skills are installed as native, self-contained Codex skills in this project's .agents/skills directory.

Before ANY Penpot design work:
1. Read ${kp}/AGENTS.md and follow it.
2. Your FIRST Penpot tool call each session is \`high_level_overview\` (no arguments).
3. Let the request trigger the matching penpot-* skill; use penpot-router when it spans several skills.

The MCP configuration remains in the user's global Codex config so secrets never land in this project.
${MARK_END}`;
}

function upsertBlock(file, block) {
  assertOutsideKit(file);
  let content = existsSync(file) ? readFileSync(file, "utf8") : "";
  const re = new RegExp(`${MARK_BEGIN}[\\s\\S]*?${MARK_END}`);
  content = re.test(content) ? content.replace(re, block) : (content.trim() ? content.trimEnd() + "\n\n" : "") + block + "\n";
  if (!dryRun) { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, content, "utf8"); }
  return file;
}
function writeFresh(file, content) {
  assertOutsideKit(file);
  if (!dryRun) { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, content, "utf8"); }
  return file;
}

const target = behaviorTarget(client, targetDir, scope);
if (!target) fail(`unknown client "${client}"`);
// For project-scoped clients (Cursor/Windsurf), the rules file lands in --target-dir. Fail cleanly and
// early if that resolves inside the kit (the agent should ask the user for their project dir instead).
try { assertOutsideKit(target.file); } catch (e) {
  fail(`${e.message}\nFor ${client}, pass --target-dir <your project dir, outside the kit>.`);
}

const touched = [];
const promptsCopied = [];
const nativeSkillSource = seedReady ? kitPath : KIT_SOURCE;
let userAction = null;
let orphanSkills = [];   // stale penpot-* skills detected but NOT removed (need --prune + user OK)
let prunedSkills = [];   // stale penpot-* skills removed because --prune was passed

function applyOrphanSkillPolicy(skillsDir) {
  const orphans = findOrphanSkills(nativeSkillSource, skillsDir);
  if (!orphans.length) return "";
  if (!prune) {
    orphanSkills = orphans;
    return ` WARNING: ${orphans.length} stale penpot-* skill(s) in ${skillsDir} are NOT part of this kit (${orphans.join(", ")}) — confirm with the user, then re-run with --prune to remove them.`;
  }
  if (!dryRun) for (const orphan of orphans) rmSync(join(skillsDir, orphan), { recursive: true, force: true });
  prunedSkills = orphans;
  return ` Pruned ${orphans.length} stale penpot-* skill(s): ${orphans.join(", ")}.`;
}

function copyPromptsAsCommands(cmdDir) {
  assertOutsideKit(cmdDir);
  const promptsDir = join(kitPath, "prompts");
  if (!existsSync(promptsDir)) return;
  if (!dryRun) mkdirSync(cmdDir, { recursive: true });
  for (const f of readdirSync(promptsDir).filter((n) => n.endsWith(".md") && n !== "README.md")) {
    const dest = join(cmdDir, `penpot-${basename(f)}`);
    if (!dryRun) copyFileSync(join(promptsDir, f), dest);
    promptsCopied.push(dest); touched.push(dest);
  }
}

switch (target.kind) {
  case "claude-native": { // B3: native self-contained skills + slim global memory pointer + commands
    const r = buildSelfContainedSkills(nativeSkillSource, target.skillsDir, { dryRun });
    for (const s of r.skills) touched.push(join(target.skillsDir, s));
    touched.push(upsertBlock(target.file, claudeNativeBody(kitPath)));
    copyPromptsAsCommands(target.commandsDir);
    userAction = `Restart Claude Code. ${r.skills.length} penpot-* skills installed NATIVELY in ~/.claude/skills (self-contained — shared/ + policies/ vendored into each; workflows/ vendored into penpot-router), plus /penpot-* commands and a slim global ~/.claude/CLAUDE.md pointer. Skills are auto-discovered by description.`;
    // Stale penpot-* skills from older kit generations shadow these (overlapping trigger descriptions).
    // Report them always; delete only with --prune (the agent must confirm with the user first).
    userAction += applyOrphanSkillPolicy(target.skillsDir);
    break;
  }
  case "codex-native-project": {
    const r = buildSelfContainedSkills(nativeSkillSource, target.skillsDir, { dryRun });
    for (const skill of r.skills) touched.push(join(target.skillsDir, skill));
    touched.push(upsertBlock(target.file, codexProjectBody(kitPath)));
    userAction = `Restart Codex in ${targetDir}. ${r.skills.length} penpot-* skills are installed natively in .agents/skills and the project rules are in AGENTS.md. Other projects are unaffected.`;
    userAction += applyOrphanSkillPolicy(target.skillsDir);
    break;
  }
  case "opencode-instructions": { // OpenCode: add an `instructions` pointer in global opencode.json
    assertOutsideKit(target.file);
    let cfg = {};
    if (existsSync(target.file)) { try { cfg = JSON.parse(readFileSync(target.file, "utf8")); } catch (e) { fail(`opencode.json is not valid JSON: ${e.message}`); } }
    cfg["$schema"] = cfg["$schema"] || "https://opencode.ai/config.json";
    cfg.instructions = Array.isArray(cfg.instructions) ? cfg.instructions : [];
    for (const w of [join(kitPath, "AGENTS.md"), join(kitPath, "skills", "penpot-router", "SKILL.md")]) {
      if (!cfg.instructions.includes(w)) cfg.instructions.push(w);
    }
    if (!dryRun) { mkdirSync(dirname(target.file), { recursive: true }); writeFileSync(target.file, JSON.stringify(cfg, null, 2) + "\n", "utf8"); }
    touched.push(target.file);
    userAction = "Restart OpenCode. The kit's AGENTS.md + penpot-router are added to `instructions` in your global opencode.json (combined with any AGENTS.md — sidesteps the project-AGENTS shadow bug). Reference briefs with @<seed>/prompts/<name>.md.";
    break;
  }
  case "agents-global": { // Codex (CLI + desktop App + IDE + Web share ~/.codex): global personal instructions
    touched.push(upsertBlock(target.file, rulesBody(kitPath)));
    userAction = "Restart Codex (the CLI and the desktop App share ~/.codex). The pointer is in your global ~/.codex/AGENTS.md, read in every project. Keep it short — Codex caps merged AGENTS.md at ~32 KiB.";
    break;
  }
  case "rules-mdc-project": { // Cursor: rules are per-project
    const mdc = `---\ndescription: Penpot AI Kit — design work inside Penpot via MCP\nalwaysApply: true\n---\n${rulesBody(kitPath)}\n`;
    touched.push(writeFresh(target.file, mdc));
    userAction = "Reload Cursor. This rule lives in your PROJECT (.cursor/rules), not the kit. Reference a brief with @<seed>/prompts/<name>.md.";
    break;
  }
  case "rules-file-project": { // Windsurf: per-project rules file
    touched.push(upsertBlock(target.file, rulesBody(kitPath)));
    userAction = "Reload Windsurf so it re-reads .windsurfrules (in your project, not the kit).";
    break;
  }
  case "attach": { // Claude Desktop / generic: emit a file to attach as Project instructions
    const inst = `# Penpot AI Kit — attach me as project instructions\n\n${rulesBody(kitPath)}\n`;
    touched.push(writeFresh(target.file, inst));
    userAction = client === "claude-desktop"
      ? `In Claude Desktop, create/open a Project and paste ${target.file} into its custom instructions. Desktop has no filesystem skill loader.`
      : `Attach ${target.file} as your client's system/project instructions, or paste ${kitPath}/AGENTS.md directly.`;
    break;
  }
  default: fail(`unhandled behavior kind "${target.kind}"`);
}

const projectScoped = ["codex-native-project", "rules-mdc-project", "rules-file-project"].includes(target.kind);
out({ ok: true, client, scope, kitPath, targetDir: projectScoped ? targetDir : null, dryRun: !!dryRun, touched, prompts: promptsCopied, orphanSkills, prunedSkills, userAction });
