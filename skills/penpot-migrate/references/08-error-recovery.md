# 08 — Error recovery (migration)

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Figma MCP tools missing | server not connected / different version | Degrade: ask for pasted export/JSON; discover tools via the Figma MCP overview. |
| Layout looks scrambled | Auto Layout → absolute instead of flex | Re-translate to flex/grid; preserve child order. |
| Tokens not resolving | references migrated before targets | Migrate primitives first, then aliases; verify with `tokenOverview()`. |
| Variants missing states | Figma set incomplete / not invented | Flag the gap; don't fabricate states. |
| Components redrawn as raw shapes | skipped component phase | Instantiate migrated components; rebuild the component first if needed. |
| Huge file stalls | one-shot attempt | Layered migration (tokens→components→screens), checkpoint each. |
| Lost place after truncation | IR not persisted | Re-read the IR from the ledger; resume from `ledger.phase`. |
