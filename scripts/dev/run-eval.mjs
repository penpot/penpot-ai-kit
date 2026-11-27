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
 *   node scripts/dev/run-eval.mjs evals/golden/<id>.eval.json --server <mcp-server-name>   # pin the instance + pre-approve its tools
 *   … --allow-write   # skills that deliver a local file (penpot-design-md): pre-approve Write, pin the path to evals/results/<id>/
 */
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const evalPath = process.argv[2];
const printOnly = process.argv.includes("--print");
// --server <mcp server name>: the Penpot MCP server the headless run must use (e.g. "penpot" or
// "claude_ai_PenpotRemotePRE"). Names the instance in the prompt (AGENTS.md §2: never guess between
// several servers) and pre-approves that server's tools, which a headless run cannot be asked about.
const serverIdx = process.argv.indexOf("--server");
const server = serverIdx > 0 ? process.argv[serverIdx + 1] : null;
const serverLine = server
  ? `## 0. Target instance\nUse ONLY the Penpot MCP server \`${server}\` (tools \`mcp__${server}__*\`). The operator confirmed it is the target and that the open file is a scratch file. Do not call any other Penpot server.\n\n`
  : "";
if (!evalPath || !existsSync(evalPath)) {
  process.stderr.write("usage: node scripts/dev/run-eval.mjs evals/golden/<id>.eval.json [--print]\n");
  process.exit(1);
}
const spec = JSON.parse(readFileSync(evalPath, "utf8"));
// --allow-write: for skills whose deliverable is a local file (penpot-design-md). Pre-approves the Write
// tool and pins the output directory, so the run cannot scatter files around the repo.
const allowWrite = process.argv.includes("--allow-write");
const outDirRel = `evals/results/${spec.id}`;
const writeLine = allowWrite
  ? `## 0b. Output files\nThis skill writes a local file. The operator has approved the output path: write it under \`${outDirRel}/\` (relative to the current directory) and nowhere else.\n\n`
  : "";
const target = spec.skill ? `skill \`${spec.skill}\`` : `workflow \`${spec.workflow}\``;

// A fixture may be a prose description or a path under evals/fixtures/ — inline the file when it exists.
let fixtureText = spec.fixture;
if (typeof spec.fixture === "string" && /^fixtures\/[\w.-]+$/.test(spec.fixture)) {
  const fixturePath = resolve(dirname(evalPath), "..", spec.fixture);
  if (existsSync(fixturePath)) fixtureText = `(file: ${fixtureText})\n\n` + readFileSync(fixturePath, "utf8");
}

// Optional scripted fixture: a paste-into-execute_code script (phases tokens → components → verify →
// teardown) that builds the starting design system deterministically, so the run measures the skill
// and not how well the agent improvises a fixture.
let setupBlock = "";
if (typeof spec.setup === "string") {
  const setupPath = resolve(dirname(evalPath), "..", spec.setup);
  if (!existsSync(setupPath)) { process.stderr.write(`setup script not found: ${setupPath}\n`); process.exit(1); }
  setupBlock = `

### Scripted fixture — run this FIRST, exactly as written
Paste the script below into execute_code once per phase, changing ONLY the PHASE constant, in this
order: "tokens", then "components", then (in a NEW call) "verify". Do not rewrite, shorten or "improve"
it, and do not prefix its names — the brief looks these tokens and components up by their plain
names. Start the run only when "verify" returns ok: true; if it does not, re-run "components" once and
verify again, and if it still fails emit the verdict as INCONCLUSIVE. At cleanup, run it with
PHASE = "teardown".

\`\`\`js
${readFileSync(setupPath, "utf8")}
\`\`\`
`;
}

const list = (arr, label) => (arr && arr.length)
  ? `\n### ${label}\n` + arr.map((x, i) => `${i + 1}. ${x}`).join("\n") : "";

const prompt = `You are running a GOLDEN EVAL of the Penpot AI Kit against a live Penpot file. Follow the kit's
rules (AGENTS.md) throughout — checkpoints included; for this eval, self-approve each checkpoint
AFTER writing down what you would have shown the user (that record is part of the verdict).

${serverLine}${writeLine}## 1. Fixture (set up first, via execute_code, on the CURRENT page)
${fixtureText}

If the fixture describes canvas state, build it exactly (idempotently, prefixing every shape name
with "eval-${spec.id}-"). If it is a brief, treat it as the user's brief.${setupBlock}

## 2. Run
Execute the ${target} on that fixture, following its SKILL.md / pipeline end to end.

## 3. Self-assert (be adversarial with yourself — a false PASS poisons the suite)
${list(spec.expected?.must_detect, "must_detect — the run must have detected each of these")}${list(spec.expected?.must_create, "must_create — each must exist on the canvas/library now (verify with execute_code reads, not memory)")}${list(spec.expected?.must_do, "must_do — the transcript of this run must show each behavior")}${list(spec.expected?.must_not, "must_not — verify each did NOT happen")}

### pass_criteria
${spec.pass_criteria}

## 4. Verdict (your FINAL message must be exactly this JSON, nothing after it)
{
  "id": "${spec.id}",
  "verdict": "PASS" | "FAIL" | "INCONCLUSIVE",
  "assertions": [ { "kind": "must_detect|must_create|must_do|must_not", "item": "<text>", "ok": true|false, "evidence": "<one line: the read/observation that proves it>" } ],
  "notes": ["<anything ambiguous, plus cleanup status>"]
}

This is a headless run: it ends with your message, so you cannot back off and come back later. If the
Penpot MCP is unreachable (gateway errors, "No Penpot sessions are connected") after one state read
and one retry, stop and emit the verdict JSON now with "verdict": "INCONCLUSIVE", the assertions you
could check, and in notes exactly what had been built and what was not cleaned up.

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
const cliArgs = ["-p", prompt, "--output-format", "text"];
if (server) cliArgs.push("--allowedTools", `mcp__${server}`, "Skill", "Read", "Glob", "Grep", ...(allowWrite ? ["Write"] : []));
if (allowWrite) mkdirSync(join(ROOT, outDirRel), { recursive: true });
const r = spawnSync("claude", cliArgs, { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
if (r.status !== 0) {
  process.stderr.write(`claude -p failed (${r.status}): ${r.stderr?.slice(0, 500)}\n`);
  process.exit(1);
}
const outText = r.stdout || "";
// the verdict is the last top-level object that starts with "id"; tolerate a ``` fence around it
const cleaned = outText.replace(/```(?:json)?/g, "").trimEnd();
const startIdx = cleaned.lastIndexOf('{\n  "id"') >= 0 ? cleaned.lastIndexOf('{\n  "id"') : cleaned.lastIndexOf('{"id"');
const jsonMatch = startIdx >= 0 ? [cleaned.slice(startIdx)] : cleaned.match(/\{[\s\S]*\}\s*$/);
const resultsDir = join(ROOT, "evals", "results");
mkdirSync(resultsDir, { recursive: true });
const outPath = join(resultsDir, `${spec.id}.json`);
writeFileSync(outPath, JSON.stringify({
  id: spec.id, ranAt: new Date().toISOString(),
  verdict: jsonMatch ? (() => { try { return JSON.parse(jsonMatch[0]); } catch { return { parseError: true, raw: jsonMatch[0] }; } })() : { parseError: true },
  transcriptTail: outText.slice(-4000),
  transcript: outText,
}, null, 2) + "\n");
process.stdout.write(`Verdict saved to ${outPath}\n${jsonMatch ? jsonMatch[0] : "(no JSON verdict found — inspect transcriptTail)"}\n`);
