/**
 * createDeckPage.js
 * Purpose: put the deck on its own page, safely. Two calls (gotcha #15 page-targeting protocol):
 *          PHASE="create" creates/reuses the page and opens it; PHASE="verify" (NEXT call) asserts
 *          the page is really current before any board is created. A board born on the wrong page
 *          CANNOT be moved (docs/mcp-api-findings.md Finding 9) — so never skip "verify".
 * Usage:   paste into execute_code twice (create → verify). Phase 1 of penpot-build-deck.
 * Input:   PHASE, DECK_NAME, RUN_ID.
 * Output:  create → { pageId, pageName, created, next } · verify → { ok, currentPage, action }.
 * Note:    verify any unfamiliar API with penpot_api_info ("Penpot","createPage" / "openPage").
 */
const PHASE = "create";                 // REPLACE-ME: "create" | "verify"
const DECK_NAME = "Deck — REPLACE-ME";  // REPLACE-ME: e.g. "Deck — Q3 launch"
const RUN_ID = "RUN_ID_HERE";           // REPLACE-ME: e.g. deck-2026-09-10-a

storage.deck = storage.deck || { runId: RUN_ID, slides: [], exceptions: [], capabilities: {} };

const readLedger = () => {
  try { return JSON.parse(penpot.currentFile.getSharedPluginData("penpot-ai", RUN_ID + ".ledger") || "{}"); }
  catch { return {}; }
};
const writeLedger = (patch) => {
  const led = Object.assign(readLedger(), patch, { runId: RUN_ID });
  penpot.currentFile.setSharedPluginData("penpot-ai", RUN_ID + ".ledger", JSON.stringify(led));
  return led;
};

if (PHASE === "create") {
  // Idempotent: reuse an existing deck page by name (resume-safe).
  let page = penpotUtils.getPageByName(DECK_NAME);
  const created = !page;
  if (!page) { page = penpot.createPage(); page.name = DECK_NAME; }
  // openPage returns a promise. On Penpot >= 2.20 awaiting it makes the page active in THIS call; on
  // older instances currentPage only updates on the next call — which is why PHASE="verify" still runs.
  let activeNow = false;
  try { await penpot.openPage(page); activeNow = !!(penpot.currentPage && penpot.currentPage.id === page.id); } catch (e) { activeNow = false; }
  storage.deck.pageId = page.id;
  storage.deck.pageName = DECK_NAME;
  writeLedger({ phase: 1, deckPageId: page.id, deckPageName: DECK_NAME });
  return { pageId: page.id, pageName: DECK_NAME, created, activeNow, next: "run this script again with PHASE=\"verify\" before creating any board" };
}

if (PHASE === "verify") {
  const led = readLedger();
  const wanted = (storage.deck && storage.deck.pageId) || led.deckPageId;
  const current = penpot.currentPage;
  const ok = !!(wanted && current && current.id === wanted);
  if (ok) {
    storage.deck.pageId = wanted;
    storage.deck.pageName = current.name;
    storage.deck.verified = true;
    // Re-derive slides already on the page (resume): boards named NN-…
    storage.deck.slides = (current.root.children || [])
      .filter((c) => c.type === "board" && /^\d{2}-/.test(c.name))
      .map((c) => ({ n: parseInt(c.name.slice(0, 2), 10), id: c.id, name: c.name, archetype: c.name.split("-")[1], done: true }))
      .sort((a, b) => a.n - b.n);
    return { ok: true, currentPage: current.name, existingSlides: storage.deck.slides.length };
  }
  return {
    ok: false,
    currentPage: current ? current.name : null,
    wantedPageId: wanted,
    action: "STOP. Ask the user to open the deck page in the Penpot UI (or re-run PHASE=create), then run PHASE=verify again. Do not create boards until ok === true."
  };
}

return { error: "PHASE must be \"create\" or \"verify\"" };
