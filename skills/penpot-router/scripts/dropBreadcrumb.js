/**
 * dropBreadcrumb.js — Phase 2: optional routing breadcrumb
 * Purpose:  record the router's decision in the file so a resumed session can see how it got here.
 * Usage:    paste into an execute_code call after routing decision is made.
 *           Replace REPLACE-ME with the target skill name and RUN_ID_HERE with the run id.
 * Input:    none (edit placeholders before running).
 * Output:   { recorded: true }.
 * Note:     verify penpot.currentFile.setSharedPluginData signature with
 *           penpot_api_info("PenpotFile", "setSharedPluginData") before relying on it.
 *           This call is optional — the router works without it.
 */
penpot.currentFile.setSharedPluginData(
  "penpot-ai",
  "router.lastRoute",
  JSON.stringify({ chosenTarget: "REPLACE-ME", at: "RUN_ID_HERE" })
);
return { recorded: true };
