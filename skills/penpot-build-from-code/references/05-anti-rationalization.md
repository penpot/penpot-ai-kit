# 05 — Anti-Rationalization (all phases)

> Loaded whenever you feel the pull to cut a corner. Expanded countermeasures for the specific
> excuses that show up when translating code into Penpot. Mirrors SKILL §13, with concrete code-
> translation traps. When you catch one of these thoughts, **stop and do the rigorous thing**.

## "The CSS literally says `#0066FF` — setting it as the fill is correct."
**Wrong because** a hex on a shape is off-system: it won't follow theme switches, it fails the
coverage gate, and it diverges the moment the design system updates its blue.
**Countermeasure:** look the value up in `storage.run.ds.tokensByValue`. Matched → `applyToken(token,
["fill"])`. No match → push to `ledger.proposedTokens` and stop at the checkpoint. The fill is a
**token reference**, never a literal.

## "Tailwind `p-5` is 20px — I'll just set padding 20."
**Wrong because** a numeric literal bypasses the spacing scale and is often off the 4px grid.
**Countermeasure:** resolve the utility through the project's scale, then bind the resulting px to the
matching spacing token. If 20 isn't a token, round to the nearest grid token and flag the rounding;
keep 20 only as a human-approved documented exception.

## "There's a `Button` component, but drawing a rounded rect + text is faster and looks identical."
**Wrong because** a redrawn box has no link to the main component, no variants, no state coverage, and
breaks handoff parity. It looks identical today and rots tomorrow.
**Countermeasure:** `componentsByRole.button` exists → `comp.instance()`, set label, `switchVariant`
for hierarchy/size/state. Raw shapes only for parts with **no** system equivalent.

## "I'll build the whole page in one `execute_code` call to save round-trips."
**Wrong because** one-shotting hides which step failed, produces unverified bindings (token apply is
async), and skips per-section human review.
**Countermeasure:** one section per call. Build → verify in a later call → `export_shape` → checkpoint
→ next. Round-trips are the feature, not the cost.

## "This code color has no token; I'll add `color.misc.brandish` now and move on."
**Wrong because** silently creating tokens pollutes the system with unreviewed, badly-named entries and
skips governance (new tokens always require human approval — `shared/modes-and-policies.md`).
**Countermeasure:** add `{from, suggestName, suggestTier, value}` to `ledger.proposedTokens` and halt
at the checkpoint. A human approves name/value/tier before any `addToken`.

## "The token didn't read back as applied — I'll hardcode the value too, as a safety net."
**Wrong because** the read-back is async (~100 ms); it's almost certainly fine. A literal "safety net"
is precisely the orphan value the validator will flag.
**Countermeasure:** re-read `resolvedValue` in a **later** `execute_code` call. If it truly didn't
apply, fix the token name or the property string — never add a literal alongside the token.

## "The layout looks right if I just set x/y on these children."
**Wrong because** a flex/grid Board ignores child x/y; you'll fight the layout and the result drifts on
any reflow.
**Countermeasure:** order children by `appendChild` and control spacing with flex `rowGap`/`columnGap`/
padding bound to spacing tokens. Use `layoutChild.absolute = true` only for genuinely absolute elements.

## "I need to tweak this instance's inner layout, so I'll just edit its children."
**Wrong because** mutating an attached instance's internals fights the component definition and is
unsupported (gotcha #6).
**Countermeasure:** if you only need content, set the text descendant's `characters`. If you truly need
structural change, `detach()` first — but that is review-gated; get approval and report it.

## "Layer names don't matter for a from-code build."
**Wrong because** semantic names are a precondition for the accessibility audit (heading hierarchy) and
design-to-code review; `Rectangle 12` fails handoff.
**Countermeasure:** name every layer from its code role in kebab-case (`nav`, `header`,
`card-container`) as you create it (`shared/naming-conventions.md`).
