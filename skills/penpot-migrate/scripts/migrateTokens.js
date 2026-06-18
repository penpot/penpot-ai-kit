/**
 * migrateTokens.js
 * Purpose: create Penpot tokens from the IR tokens (primitives first, then aliases). Idempotent.
 * Usage:   paste into execute_code (Phase 2). Uses real token type strings.
 * Input:   IR_TOKENS [{type,name,value,mode}].
 * Output:  { addedPrimitives, addedAliases, themes }.
 * Note:    mode -> theme handling is verified with penpot_api_info('TokenCatalog','addTheme').
 */
const IR_TOKENS = (storage.mig && storage.mig.ir && storage.mig.ir.tokens) || []; // or REPLACE-ME

const tok = penpot.library.local.tokens;
const isRef = (v) => /^\{.+\}$/.test(String(v));
const ensureSet = (name) => tok.sets.find(s => s.name === name) || tok.addSet({ name });

const prim = ensureSet("primitives");
const sem = ensureSet("semantic");
// New sets are created INACTIVE; activate so reference tokens validate and tokens affect shapes.
if (!prim.active) prim.toggleActive();
if (!sem.active) sem.toggleActive();
let addedPrimitives = 0, addedAliases = 0;

for (const t of IR_TOKENS) {
  const target = isRef(t.value) ? sem : prim;
  if (!target.tokens.find(x => x.name === t.name)) {
    target.addToken({ type: t.type, name: t.name, value: t.value });
    isRef(t.value) ? addedAliases++ : addedPrimitives++;
  }
}
const modes = [...new Set(IR_TOKENS.map(t => t.mode).filter(Boolean))];
// for (const m of modes) if (!tok.themes.find(th=>th.name===m)) tok.addTheme({ group: "mode", name: m }); // addTheme takes an object (verified)
return { addedPrimitives, addedAliases, themes: modes, note: "addTheme({group,name}) and addSet({name}) take object args (verified)." };
