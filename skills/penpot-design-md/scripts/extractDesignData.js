// extractDesignData.js — Phase 0 inventory for penpot-design-md. READ-ONLY.
// Paste into an `execute_code` call. Returns the file's documentation raw material in one call:
// pages, token sets (+ themes, active state, per-type counts), library assets.
// Caches into storage.run.inventory for later phases.
// Verify any unfamiliar API with penpot_api_info before editing this script.

const lib = penpot.library.local;
const cat = lib.tokens || {};

const sets = (cat.sets || []).map((s) => {
  const byType = {};
  for (const t of s.tokens || []) byType[t.type] = (byType[t.type] || 0) + 1;
  return { name: s.name, active: s.active, count: (s.tokens || []).length, byType };
});

// dedupe library colors by (group path, name, value) — same short name across groups differs
const colorKey = (c) => `${c.path || ""}|${c.name}|${c.color}`;
const seen = new Set();
const libColors = [];
for (const c of lib.colors || []) {
  const k = colorKey(c);
  if (seen.has(k)) continue;
  seen.add(k);
  libColors.push({ group: c.path || null, name: c.name, color: c.color, opacity: c.opacity ?? 1 });
}

const inventory = {
  file: penpot.currentFile ? { id: penpot.currentFile.id, name: penpot.currentFile.name } : null,
  penpotVersion: penpot.version || null,
  pages: penpotUtils.getPages().map((p) => p.name),
  tokenSets: sets,
  themes: (cat.themes || []).map((t) => ({ group: t.group, name: t.name })),
  components: (lib.components || []).map((c) => c.name),
  variantComponents: (lib.components || []).filter((c) => c.isVariant && c.isVariant()).length,
  libraryColors: libColors,
  typographies: (lib.typographies || []).map((t) => t.name),
  // connected libraries can number in the hundreds on shared instances — cap the sample
  connectedLibrariesCount: (penpot.library.connected || []).length,
  connectedLibrariesSample: (penpot.library.connected || []).slice(0, 10).map((l) => l.name),
};

storage.run = storage.run || {};
storage.run.inventory = inventory;
return {
  pages: inventory.pages.length,
  tokenSets: inventory.tokenSets,
  themes: inventory.themes,
  components: inventory.components.length,
  variantComponents: inventory.variantComponents,
  libraryColors: inventory.libraryColors.length,
  typographies: inventory.typographies,
  connectedLibraries: inventory.connectedLibrariesCount,
  note: "Full inventory cached in storage.run.inventory (pages/components name lists included there).",
};
