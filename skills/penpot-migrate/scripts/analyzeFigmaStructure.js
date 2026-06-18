/**
 * analyzeFigmaStructure.js
 * Purpose: NOTE — Figma is read via the Figma MCP, not Penpot's execute_code. This file documents
 *          the inventory you must produce from Figma data before building the IR.
 * Usage:   not an execute_code script. Use the Figma MCP design-context tools (or pasted export) and
 *          normalize into the inventory object below; pass it to buildIR.js.
 * Output (target shape):
 *   {
 *     variables: [{ collection, name, type, value, mode }],
 *     componentSets: [{ name, props:[{name, values:[]}], components:[{props:{}, layout, children}] }],
 *     screens: [{ name, size:[w,h], layout, children:[] }]
 *   }
 * Mapping rules (record decisions): Figma name -> Penpot name; Variable -> token tier; mode -> theme.
 * Degraded mode: if no Figma MCP, request a pasted Figma export/JSON and fill this shape from it.
 */
return {
  note: "Produce the inventory object above from the Figma MCP (or pasted data), then call buildIR.js.",
  inventory: { variables: [], componentSets: [], screens: [] }
};
