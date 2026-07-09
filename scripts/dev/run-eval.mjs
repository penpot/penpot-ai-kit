#!/usr/bin/env node
/**
 * run-eval.mjs — semi-automatic harness for the golden evals in evals/golden/.
 *
 * The evals were "agent-driven, no runner" by design. This closes the gap pragmatically: it turns a
 * golden eval JSON into a single self-contained eval-run prompt (set up the fixture → run the
 * target skill/workflow → self-assert every must_* item → emit a JSON verdict), then either:
 *   - pipes it through headless Claude Code (`claude -p`) if the CLI is available
 *     (the session must have the Penpot MCP configured and the Penpot plugin window OPEN), or
 *   - prints the prompt for manual pasting into any MCP-connected agent (--print).
 * The verdict is saved under evals/results/<id>.json (git-ignored territory; evals/ never ships).
 *
 * The judge is the agent itself + the skill's own validate*.js scripts — an LLM-checked eval, not a
 * deterministic unit test. Treat verdicts as strong signal, and spot-check failures by hand.
 *
 * Usage:
 *   node scripts/dev/run-eval.mjs evals/golden/foundations-basic.eval.json          # run via claude -p
 *   node scripts/dev/run-eval.mjs evals/golden/foundations-basic.eval.json --print  # just print the prompt
 */
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const evalPath = process.argv[2];
const printOnly = process.argv.includes("--print");
if (!evalPath || !existsSync(evalPath)) {
  process.stderr.write("usage: node scripts/dev/run-eval.mjs evals/golden/<id>.eval.json [--print]\n");
  process.exit(1);
}
const spec = JSON.parse(readFileSync(evalPath, "utf8"));
const target = spec.skill ? `skill \`${spec.skill}\`` : `workflow \`${spec.workflow}\``;

const list = (arr, label) => (arr && arr.length)
  ? `\n### ${label}\n` + arr.map((x, i) => `${i + 1}. ${x}`).join("\n") : "";

const prompt = `You are running a GOLDEN EVAL of the Penpot AI Kit against a live Penpot file. Follow the kit's
rules (AGENTS.md) throughout — checkpoints included; for this eval, self-approve each checkpoint
AFTER writing down what you would have shown the user (that record is part of the verdict).

## 1. Fixture (set up first, via execute_code, on the CURRENT page)
${spec.fixture}

If the fixture describes canvas state, build it exactly (idempotently, prefixing every shape name
with "eval-${spec.id}-"). If it is a brief, treat it as the user's brief.

## 2. Run
Execute the ${target} on that fixture, following its SKILL.md / pipeline end to end.

## 3. Self-assert (be adversarial with yourself — a false PASS poisons the suite)
${list(spec.expected?.must_detect, "must_detect — the run must have detected each of these")}${list(spec.expected?.must_create, "must_create — each must exist on the canvas/library now (verify with execute_code reads, not memory)")}${list(spec.expected?.must_do, "must_do — the transcript of this run must show each behavior")}${list(spec.expected?.must_not, "must_not — verify each did NOT happen")}

### pass_criteria
${spec.pass_criteria}

## 4. Verdict (your FINAL message must be exactly this JSON, nothing after it)
{
  "id": "${spec.id}",
  "verdict": "PASS" | "FAIL",
  "assertions": [ { "kind": "must_detect|must_create|must_do|must_not", "item": "<text>", "ok": true|false, "evidence": "<one line: the read/observation that proves it>" } ],
  "notes": ["<anything ambiguous, plus cleanup status>"]
}

## 5. Cleanup
Remove every "eval-${spec.id}-" prefixed shape/token/set you created, then report cleanup in notes.`;

if (printOnly) { process.stdout.write(prompt + "\n"); process.exit(0); }

// headless run via Claude Code
try { execFileSync("claude", ["--version"], { stdio: "ignore" }); }
catch {
  process.stderr.write("claude CLI not found — re-run with --print and paste the prompt into an MCP-connected agent.\n");
  process.exit(1);
}
process.stderr.write(`Running eval '${spec.id}' headlessly (this uses your Claude Code session + the Penpot MCP; keep the plugin window open)...\n`);
const r = spawnSync("claude", ["-p", prompt, "--output-format", "text"], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
if (r.status !== 0) {
  process.stderr.write(`claude -p failed (${r.status}): ${r.stderr?.slice(0, 500)}\n`);
  process.exit(1);
}
const outText = r.stdout || "";
const jsonMatch = outText.match(/\{[\s\S]*\}\s*$/);
const resultsDir = join(ROOT, "evals", "results");
mkdirSync(resultsDir, { recursive: true });
const outPath = join(resultsDir, `${spec.id}.json`);
writeFileSync(outPath, JSON.stringify({
  id: spec.id, ranAt: new Date().toISOString(),
  verdict: jsonMatch ? (() => { try { return JSON.parse(jsonMatch[0]); } catch { return { parseError: true, raw: jsonMatch[0] }; } })() : { parseError: true },
  transcriptTail: outText.slice(-4000),
}, null, 2) + "\n");
process.stdout.write(`Verdict saved to ${outPath}\n${jsonMatch ? jsonMatch[0] : "(no JSON verdict found — inspect transcriptTail)"}\n`);
