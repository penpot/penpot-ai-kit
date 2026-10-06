/**
 * antiSlopPrefs.js
 * Purpose: read or store the user's anti-slop opt-in (shared/anti-slop.md §0) so it is asked once per file.
 * Usage:   paste into execute_code. Phase 0 of penpot-build-screen / penpot-build-deck runs ACTION="read" first;
 *          only when the result is "unset" does the agent ask the question, then runs ACTION="set" with the answer.
 * Input:   ACTION — "read" | "set";  VALUE — "on" | "off" (only for "set").
 * Output:  { antiSlop: "on" | "off" | "unset", askedAt?, source: "file" | "session" | "none" }
 * Note:    setSharedPluginData lives on File (shared/state-management.md); verify with
 *          penpot_api_info("File", "setSharedPluginData") if the call throws.
 */
const ACTION = "read";      // "read" | "set"
const VALUE = "REPLACE-ME"; // "on" | "off" when ACTION === "set"
const NS = "penpot-ai";

storage.prefs = storage.prefs || {};
const file = penpot.currentFile;
if (ACTION === "set") {
  if (VALUE !== "on" && VALUE !== "off") return { error: `VALUE must be "on" or "off", got ${VALUE}` };
  const askedAt = new Date().toISOString();
  if (file) {
    file.setSharedPluginData(NS, "prefs.antiSlop", VALUE);
    file.setSharedPluginData(NS, "prefs.antiSlop.askedAt", askedAt);
  }
  storage.prefs.antiSlop = VALUE;
  return { antiSlop: VALUE, askedAt, source: file ? "file" : "session" };
}
const stored = file ? file.getSharedPluginData(NS, "prefs.antiSlop") : "";
if (stored === "on" || stored === "off") {
  storage.prefs.antiSlop = stored;
  return { antiSlop: stored, askedAt: file.getSharedPluginData(NS, "prefs.antiSlop.askedAt") || undefined, source: "file" };
}
if (storage.prefs.antiSlop === "on" || storage.prefs.antiSlop === "off") return { antiSlop: storage.prefs.antiSlop, source: "session" };
return { antiSlop: "unset", source: "none" };
