// capability-probe.js — test whether the VERSION-PINNED gotchas still reproduce on the connected
// Penpot instance, instead of assuming they are eternal truths.
// VALIDATED LIVE 2026-07-09 against Penpot 2.17.0 (remote MCP): #8 fixed, #13 fixed, ["all"] still
// broken, direct property set does NOT clear a binding. Re-run whenever `penpot.version` changes.
//
// Usage: paste into an `execute_code` call TWICE (token application is async — gotcha #2):
//   1st call with PHASE = "apply"   → creates a tiny off-canvas probe board (+ a clearly-named
//                                     probe token set if the file has no numeric token) and applies
//   2nd call with PHASE = "verify"  → reads the async results, checks binding removal, CLEANS UP
//                                     everything (board + probe set), persists + returns verdicts
//
// Probes (all innocuous, all cleaned up):
//   gotcha8       applyToken → ["paddingTop"]        (F8: threw on 2.16.x; fixed on 2.17.0)
//   gotchaAll     applyToken → ["all"]               (F8: still throws on 2.17.0)
//   gotcha13      font.applyToText fontId integrity  (F13: corrupt on 2.16.x; fixed on 2.17.0)
//   bindingRemoval direct property set over a bound token (gotcha #2 says sticky; MCP 2.17 overview
//                  claims it clears — live: STICKY, the overview is wrong)
// NOT probed: #12 (variant mutation corrupts the file + hangs saves) — DESTRUCTIVE, never probe it.
//
// Verdicts: "reproduces" | "fixed" | "unknown". Persisted to the ledger (namespace "penpot-ai",
// key "capabilities") so later sessions read instead of re-probing.

const PHASE = "REPLACE-ME-phase"; // "apply" | "verify"
const NS = "penpot-ai";
const PROBE_NAME = "kit-capability-probe (safe to delete)";

if (PHASE === "apply") {
  // idempotency: reuse leftovers from a previous run
  const existing = penpotUtils.findShape((s) => s.name === PROBE_NAME);
  const board = existing || penpot.createBoard();
  board.name = PROBE_NAME;
  board.resize(200, 200);
  if (!existing) penpot.currentPage.root.appendChild(board);
  board.x = -10000; board.y = -10000; // park far off-canvas

  const state = { boardId: board.id, probes: {}, createdProbeSet: false };
  const cat = penpot.library.local.tokens;

  // find a numeric token in the active sets; else create a clearly-named probe set (removed at verify)
  let tok = null, set = null;
  for (const s of cat.sets || []) {
    tok = (s.tokens || []).find((t) => ["spacing", "dimension", "sizing"].includes(t.type));
    if (tok) { set = s; break; }
  }
  if (!tok) {
    set = (cat.sets || []).find((s) => s.name === PROBE_NAME) || cat.addSet({ name: PROBE_NAME });
    state.createdProbeSet = true;
    if (!set.active) set.toggleActive();
    tok = (set.tokens || []).find((t) => t.name === "probe.spacing")
      || set.addToken({ type: "spacing", name: "probe.spacing", value: "16" });
  }

  // --- gotcha8: padding binding + rowGap (rowGap also feeds the removal probe at verify) ---
  try {
    if (!board.flex) board.addFlexLayout();
    board.applyToken(tok, ["paddingTop"]);
    board.applyToken(tok, ["rowGap"]);
    state.probes.gotcha8 = { applied: tok.name, expected: String(tok.resolvedValue) };
  } catch (e) { state.probes.gotcha8 = { threw: String(e && e.message || e) }; }

  // --- gotchaAll: ["all"] ---
  try {
    const r = penpot.createRectangle(); r.name = "probe-rect"; board.appendChild(r);
    r.applyToken(tok, ["all"]);
    state.probes.gotchaAll = { applied: tok.name };
  } catch (e) { state.probes.gotchaAll = { threw: String(e && e.message || e) }; }

  // --- gotcha13: applyToText fontId integrity ---
  try {
    const t = penpot.createText("probe"); t.name = "probe-text"; board.appendChild(t);
    const font = penpot.fonts && penpot.fonts.all && penpot.fonts.all[0];
    if (font && font.applyToText) {
      font.applyToText(t);
      state.probes.gotcha13 = { textId: t.id, fontRefId: font.fontId || font.id || null };
    } else state.probes.gotcha13 = { skipped: "penpot.fonts.all unavailable" };
  } catch (e) { state.probes.gotcha13 = { threw: String(e && e.message || e) }; }

  storage.capabilityProbe = state;
  return { phase: "apply", penpotVersion: penpot.version || null,
    note: "Re-run with PHASE='verify' in a NEW execute_code call (async token application).", state };
}

if (PHASE === "verify") {
  const state = storage.capabilityProbe;
  if (!state) return { error: "no apply-phase state in storage — run PHASE='apply' first" };
  const board = penpotUtils.findShapeById(state.boardId);
  const results = { penpotVersion: penpot.version || null };

  // gotcha8: did the padding token bind?
  const p8 = state.probes.gotcha8 || {};
  if (p8.threw) results.gotcha8 = { verdict: "reproduces", detail: `applyToken threw: ${p8.threw}` };
  else {
    const bound = board && board.tokens && Object.keys(board.tokens).some((k) => /padding/i.test(k));
    results.gotcha8 = bound
      ? { verdict: "fixed", detail: `padding token '${p8.applied}' bound (flex.topPadding=${board.flex && board.flex.topPadding})` }
      : { verdict: "reproduces", detail: "applyToken to paddingTop did not bind (no error, no binding)" };
  }

  // gotchaAll: throws at apply time when broken
  const pa = state.probes.gotchaAll || {};
  results.gotchaAll = pa.threw
    ? { verdict: "reproduces", detail: pa.threw }
    : { verdict: "fixed", detail: `["all"] accepted for '${pa.applied}'` };

  // gotcha13: is the written fontId a real font id?
  const p13 = state.probes.gotcha13 || {};
  if (p13.threw || p13.skipped) results.gotcha13 = { verdict: "unknown", detail: p13.threw || p13.skipped };
  else {
    const t = penpotUtils.findShapeById(p13.textId);
    const written = t && t.fontId;
    const known = (penpot.fonts && penpot.fonts.all || []).some((f) => (f.fontId || f.id) === written);
    results.gotcha13 = known
      ? { verdict: "fixed", detail: `fontId '${written}' is a known font` }
      : { verdict: "reproduces", detail: `written fontId '${written}' not found in penpot.fonts.all` };
  }

  // bindingRemoval: does a direct property set clear the rowGap binding? (gotcha #2 says NO)
  try {
    const before = board.tokens ? { ...board.tokens } : {};
    board.flex.rowGap = 5;
    const after = board.tokens ? { ...board.tokens } : {};
    results.bindingRemoval = {
      verdict: before.rowGap && !after.rowGap ? "direct-set-clears-binding" : (after.rowGap ? "binding-sticky" : "unknown"),
      detail: `rowGap binding before='${before.rowGap || ""}' after='${after.rowGap || ""}'`
    };
  } catch (e) { results.bindingRemoval = { verdict: "unknown", detail: String(e && e.message || e) }; }

  // cleanup: the probe leaves nothing behind
  if (board) board.remove();
  if (state.createdProbeSet) {
    const cat = penpot.library.local.tokens;
    const probeSet = (cat.sets || []).find((s) => s.name === PROBE_NAME);
    if (probeSet && typeof probeSet.remove === "function") probeSet.remove();
    else if (probeSet && typeof cat.removeSet === "function") cat.removeSet(probeSet);
  }
  delete storage.capabilityProbe;

  // persist so later sessions read instead of re-probing
  try {
    penpot.currentFile.setSharedPluginData(NS, "capabilities", JSON.stringify({
      penpotVersion: results.penpotVersion, probedAt: new Date().toISOString(),
      gotcha8: results.gotcha8.verdict, gotchaAll: results.gotchaAll.verdict,
      gotcha13: results.gotcha13.verdict, bindingRemoval: results.bindingRemoval.verdict,
    }));
  } catch (e) { results.persistNote = `could not persist to pluginData: ${String(e && e.message || e)}`; }
  return results;
}

return { error: `PHASE must be "apply" or "verify", got: ${PHASE}` };
