#!/usr/bin/env node
/**
 * trigger-eval.mjs — does each skill's `description` actually win the requests it should?
 *
 * Skills are activated by their frontmatter `description`, so a description that is vague, or that
 * overlaps a sibling's, silently sends work to the wrong skill. This runner takes every
 * `triggers: { should, should_not }` block in evals/golden/*.eval.json, shows a model ONLY the
 * catalog (name + description of every skill, exactly what a host sees at selection time) and asks
 * which single skill it would activate for each phrasing. No Penpot connection is needed.
 *
 *   should      → the pick must be the eval's skill
 *   should_not  → the pick must NOT be the eval's skill
 *   workflow evals → the target is the pipeline's first skill step; `penpot-router` also passes a
 *                    `should` (the router is the documented way into a workflow)
 *
 * Usage:
 *   node scripts/dev/trigger-eval.mjs                 # run via headless Claude Code (`claude -p`)
 *   node scripts/dev/trigger-eval.mjs --print         # print the prompt (paste into any model)
 *   node scripts/dev/trigger-eval.mjs --answers f.json  # score a saved answer array instead of calling a model
 *   node scripts/dev/trigger-eval.mjs --model <id>    # forwarded to `claude --model`
 *
 * Exit code 0 = all cases pass, 1 = at least one miss (listed), 2 = could not run.
 * Results: evals/results/triggers.json. The pick is an LLM judgement: re-run a miss before rewording
 * a description, and reword the description (not the test) when the miss is stable.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const opt = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };

// ---- catalog: what a host sees when it selects a skill -------------------------------------------
const catalog = readdirSync(join(ROOT, "skills"), { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(ROOT, "skills", d.name, "SKILL.md")))
  .map((d) => {
    const text = readFileSync(join(ROOT, "skills", d.name, "SKILL.md"), "utf8");
    const m = text.match(/^description:\s*(.*)$/m);
    let description = m ? m[1].trim() : "";
    if (/^".*"$/.test(description)) { try { description = JSON.parse(description); } catch { description = description.slice(1, -1); } }
    return { name: d.name, description };
  })
  .sort((a, b) => a.name.localeCompare(b.name));
const names = new Set(catalog.map((c) => c.name));

// ---- cases ---------------------------------------------------------------------------------------
const cases = [];
const goldenDir = join(ROOT, "evals", "golden");
for (const f of readdirSync(goldenDir).filter((n) => n.endsWith(".eval.json")).sort()) {
  const e = JSON.parse(readFileSync(join(goldenDir, f), "utf8"));
  if (!e.triggers) continue;
  let target = e.skill, alsoOk = [];
  if (!target && e.workflow) {
    const p = JSON.parse(readFileSync(join(ROOT, "workflows", e.workflow, "pipeline.json"), "utf8"));
    target = (p.steps.find((s) => s.skill) || {}).skill;
    alsoOk = ["penpot-router"];
  }
  if (!target) continue;
  for (const phrase of e.triggers.should || []) cases.push({ eval: e.id, kind: "should", target, alsoOk, phrase });
  for (const phrase of e.triggers.should_not || []) cases.push({ eval: e.id, kind: "should_not", target, alsoOk: [], phrase });
}
if (!cases.length) { process.stderr.write("no `triggers` blocks found in evals/golden\n"); process.exit(2); }

// ---- prompt --------------------------------------------------------------------------------------
const prompt = `You are the skill selector of an AI coding/design assistant. Below is the complete catalog of
installed skills: for each one you see ONLY its name and description — the same information a host
has when it decides which skill to activate. The user is working in Penpot.

For each numbered user request, pick the ONE skill you would activate first, or "none" if no skill
fits. Judge from the descriptions alone. Do not use tools. Do not explain.

## Catalog
${catalog.map((c) => `- ${c.name}: ${c.description}`).join("\n")}

## Requests
${cases.map((c, i) => `${i + 1}. ${c.phrase}`).join("\n")}

## Answer
Reply with exactly one JSON array of ${cases.length} strings, in request order, each a skill name from
the catalog or "none". Nothing before or after the array.`;

if (flag("--print")) { process.stdout.write(prompt + "\n"); process.exit(0); }

// ---- picks ---------------------------------------------------------------------------------------
let raw;
if (opt("--answers")) raw = readFileSync(opt("--answers"), "utf8");
else {
  // --safe-mode: no installed skills, MCP servers or CLAUDE.md, so the pick comes from the catalog above.
  const args = ["-p", prompt, "--output-format", "text", "--safe-mode"];
  if (opt("--model")) args.push("--model", opt("--model"));
  const r = spawnSync("claude", args, { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  if (r.error || r.status !== 0) {
    process.stderr.write(`claude -p failed (${r.error ? r.error.message : r.status}): ${(r.stderr || "").slice(0, 500)}\nRe-run with --print and score the reply with --answers <file>.\n`);
    process.exit(2);
  }
  raw = r.stdout || "";
}
const m = raw.match(/\[[\s\S]*\]/);
let picks = null;
try { picks = m ? JSON.parse(m[0]) : null; } catch { picks = null; }
if (!Array.isArray(picks) || picks.length !== cases.length) {
  process.stderr.write(`expected a JSON array of ${cases.length} picks, got: ${raw.slice(0, 400)}\n`);
  process.exit(2);
}

// ---- score ---------------------------------------------------------------------------------------
const rows = cases.map((c, i) => {
  const pick = String(picks[i]);
  const ok = c.kind === "should" ? (pick === c.target || c.alsoOk.includes(pick)) : pick !== c.target;
  return { ...c, pick, known: pick === "none" || names.has(pick), ok };
});
const misses = rows.filter((r) => !r.ok);
const resultsDir = join(ROOT, "evals", "results");
mkdirSync(resultsDir, { recursive: true });
writeFileSync(join(resultsDir, "triggers.json"), JSON.stringify({
  ranAt: new Date().toISOString(), model: opt("--model") || "default", total: rows.length, passed: rows.length - misses.length, rows,
}, null, 2) + "\n");

for (const r of misses) process.stdout.write(`✗ [${r.eval}] ${r.kind} ${r.target}: "${r.phrase}" → picked ${r.pick}\n`);
for (const r of rows.filter((x) => !x.known)) process.stdout.write(`! unknown skill name in answer: ${r.pick}\n`);
process.stdout.write(`${misses.length ? "✗" : "✓"} trigger eval: ${rows.length - misses.length}/${rows.length} cases pass (evals/results/triggers.json)\n`);
process.exit(misses.length ? 1 : 0);
