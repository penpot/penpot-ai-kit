# 06 — Anti-rationalization (screens)

| Excuse | Why it's wrong | Countermeasure (halt) |
|--------|----------------|------------------------|
| "Draw a quick button instead of the component." | Raw shapes drift from the system. | Instantiate the existing component. |
| "Hardcode color/spacing to move fast." | Breaks rhythm/theming/governance. | Bind semantic tokens; snap spacing to 4px. |
| "Generate the whole screen at once." | One-shot is generic and unauditable. | Section by section, checkpoint each. |
| "Centered cards + gradient is fine." | Distributive convergence → bland UI. | Commit to a style profile; justify choices. |
| "I'll set up the token system here." | Foundations belong in their skill. | Hand off to `penpot-foundations`. |
| "Skip the critique, looks good." | Quality gates get skipped. | Run the critique + contrast check before done. |
| "I'll skip the anti-slop question, the user is busy." | Strict mode is the user's choice; guessing either way is wrong. | Read `prefs.antiSlop`; unset → ask once (`shared/anti-slop.md` §0). |
| "I'll just position these with x/y, it's faster." | Absolute coords don't resize, reflow, or theme; off-system. | Wrap them in a flex/grid Board; order by append + gaps/align. |
| "A plain Group is enough to bunch these together." | Groups don't lay out — they only bound. | Use a Board with `addFlexLayout()`; the audit flags layout-less boards. |
| "This little container doesn't need a layout." | Every UI container needs one for rhythm + responsiveness. | Add flex/grid before appending children — no exceptions. |
| "The call failed, I'll just run it again." | A failed call may have run (gotchas #19); a re-run duplicates shapes and toggles token bindings off (#2). | Read state first; re-run only what is missing, with guarded `applyToken`. |
| "I'll re-apply all tokens to be safe." | Re-applying a bound token removes the binding. | Apply only where `shape.tokens[prop] !== tok.name`; verify in the next call. |
