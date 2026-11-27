/**
 * migrateTokens.js
 * Purpose: create Penpot tokens from the IR tokens. Idempotent; creates only the sets it needs.
 * Usage:   paste into execute_code (Phase 2). Review with tokenOverview() at the checkpoint.
 * Input:   IR_TOKENS [{ type, name, value, mode? }] (storage.mig.ir.tokens); SET_PREFIX (optional).
 * Output:  { sets:[{name, active, added, total}], skipped:[...], conflicts:[...], modes }.
 * Set routing (the layout penpot-foundations uses, so later skills find what they expect):
 *   - literal values                    -> `primitives`
 *   - aliases ("{…}") that are colours, and every token that carries a Figma MODE -> `modes/<mode>`
 *     (a mode-less colour alias goes to `modes/light`)
 *   - other aliases (spacing, radius…)  -> `semantic`
 *   A set is created only when a token lands in it — a file whose Variables are all literals gets just
 *   `primitives`. The first mode is left active, the others inactive: the user switches modes in the
 *   Tokens panel.
 * Safety: an existing token with the same name and a DIFFERENT value is never overwritten — it is
 *   returned in `conflicts` for the user to decide. Unknown token types are returned in `skipped`.
 */
const IR_TOKENS = (storage.mig && storage.mig.ir && storage.mig.ir.tokens) || []; // or REPLACE-ME
const SET_PREFIX = "";   // e.g. "figma/" to keep migrated sets apart from an existing system

const PENPOT_TYPES = ["color", "dimension", "spacing", "sizing", "number", "rotation", "typography", "shadow", "opacity",
  "borderRadius", "borderWidth", "fontWeights", "fontSizes", "fontFamilies", "letterSpacing", "textDecoration", "textCase"];
const cat = penpot.library.local.tokens;
const isRef = (v) => /^\{.+\}$/.test(String(v));
const modes = [...new Set(IR_TOKENS.map(t => t.mode).filter(Boolean))];
const modeSet = (m) => `modes/${String(m).trim().toLowerCase().replace(/\s+/g, "-")}`;
const routeOf = (t) => {
  if (t.mode) return modeSet(t.mode);
  if (!isRef(t.value)) return "primitives";
  return t.type === "color" ? "modes/light" : "semantic";
};

const touched = new Map();                      // set name -> { set, added }
const ensureSet = (name) => {
  const full = SET_PREFIX + name;
  if (touched.has(full)) return touched.get(full);
  let set = cat.sets.find(s => s.name === full) || null;
  if (!set) set = cat.addSet({ name: full });
  const rec = { set, added: 0, created: true };
  touched.set(full, rec);
  return rec;
};

const skipped = []; const conflicts = [];
// literals first, so aliases find their targets
const ordered = [...IR_TOKENS].sort((a, b) => Number(isRef(a.value)) - Number(isRef(b.value)));
for (const t of ordered) {
  if (!PENPOT_TYPES.includes(t.type)) { skipped.push({ name: t.name, reason: `unknown token type "${t.type}"` }); continue; }
  const rec = ensureSet(routeOf(t));
  const existing = rec.set.tokens.find(x => x.name === t.name);
  if (existing) {
    if (String(existing.value) !== String(t.value)) conflicts.push({ name: t.name, set: rec.set.name, existing: String(existing.value), incoming: String(t.value) });
    continue;
  }
  rec.set.addToken({ type: t.type, name: t.name, value: String(t.value) });
  rec.added++;
}

// activation: primitives + semantic + the FIRST mode on; the other modes off
const firstMode = modes.length ? SET_PREFIX + modeSet(modes[0]) : SET_PREFIX + "modes/light";
for (const [name, rec] of touched) {
  const isMode = name.startsWith(SET_PREFIX + "modes/");
  const wantActive = !isMode || name === firstMode;
  if (rec.set.active !== wantActive) rec.set.toggleActive();   // new sets are born inactive (gotchas #8)
}

return {
  sets: [...touched].map(([name, rec]) => ({ name, active: rec.set.active, added: rec.added, total: rec.set.tokens.length })),
  skipped, conflicts, modes,
  next: "show tokenOverview() at the checkpoint; resolve every entry in `conflicts` with the user before Phase 3"
};
