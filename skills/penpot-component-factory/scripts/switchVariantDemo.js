/**
 * switchVariantDemo.js
 * Purpose: instantiate a component and switch a variant property to prove the matrix works.
 * Usage:   paste into execute_code (Phase 4, optional).
 * Input:   COMPONENT_NAME; POS / VALUE to switch.
 * Output:  { instanceId, switched }.
 * Note:    confirm switchVariant signature with penpot_api_info('Shape','switchVariant').
 */
const COMPONENT_NAME = "Button"; // REPLACE-ME
const POS = 0, VALUE = "Hover";  // REPLACE-ME

const comp = penpot.library.local.components.find(c => c.name === COMPONENT_NAME);
if (!comp) return { error: `component "${COMPONENT_NAME}" not found` };
const inst = comp.instance();
penpot.currentPage.root.appendChild(inst);
let switched = false;
try { inst.switchVariant(POS, VALUE); switched = true; } catch (e) { return { instanceId: inst.id, switched, error: String(e) }; }
return { instanceId: inst.id, switched };
