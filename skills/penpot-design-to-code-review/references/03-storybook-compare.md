# 03 — Comparing against Storybook (or any rendered source)

> Loaded during **Phase 3** when the code source is a Storybook story (or another rendered component) rather than a raw file. Goal: derive the code-side states and computed styles to feed the mapping in `02` and the diff in `04`. Storybook is **not** required — if it is absent, degrade as described in section 5.

## 1. Storybook gives you states for free

A story's `args` and `argTypes`/controls enumerate the component's prop space, which is the cleanest source for the **state matrix**. For a Button story:

```
args:    { variant: "primary", size: "md", disabled: false }
argTypes:
  variant:  { options: ["primary","secondary","ghost"] }
  size:     { options: ["sm","md","lg"] }
  disabled: { control: "boolean" }
```

From this you derive the code's declared states: `variant ∈ {primary,secondary,ghost}`, `size ∈ {sm,md,lg}`, `disabled ∈ {true,false}`, plus CSS-driven pseudo-states (`:hover`, `:focus-visible`, `:active`) read from the stylesheet. Cross these against the Penpot variant axes (`Hierarchy`, `Size`, `State`) to fill the matrix in `02 §2c`.

## 2. Getting the rendered DOM + computed CSS

You need the actual rendered values, not just the source, because runtime CSS (themes, cascade) determines what users see. Options, in order of preference:

1. **A browser/automation MCP** pointed at the Storybook iframe URL
   (`/iframe.html?id=<storyId>&args=disabled:true`): read `outerHTML` of the story root and `getComputedStyle` for the element(s) you mapped. One render per state in the matrix.
2. **The user pastes** the computed styles / DOM for each state (ask for the states you actually need to diff, not all of them).
3. **The static CSS** (stylesheet / `.module.css`): parse selectors per state. Less reliable than computed styles because it ignores cascade, but acceptable when no browser is available — note the reduced confidence.

For each state you obtain, normalize the computed values the same way as the design side (`01 §6`): colors → lowercase hex, lengths → px, weights → numeric.

## 3. Mapping computed CSS back to tokens

Computed styles are literals (`rgb(0, 102, 255)` → `#0066ff`). To diff at the token level:
- If the code uses CSS custom properties, the computed value of the *variable* (`getComputedStyle(el).getPropertyValue('--color-action-primary-bg')`) tells you which var produced the value — map that var to the design token via `02 §2b`.
- If only the final literal is available, fall back to matching the literal against `tokenOverview()` (`01 §5`) and report whether the code is using a variable at all (a `Minor` "code not tokenized" finding if it isn't).

## 4. Pair the visual with Phase 2's export

For each state in the matrix, capture:
- design side: `export_shape` of the corresponding variant board (Phase 2);
- code side: a screenshot of the Storybook story at that arg combination (browser MCP or user-supplied).

Present them paired at the Phase 2 checkpoint so the engineer can prioritize. Visual pairing catches drift that value-diffing misses (e.g. a shadow the design has that the story omits because a wrapper clips it).

## 5. Graceful degradation (no Storybook, no browser)

If only a URL is given but you cannot render it, **do not invent computed styles.** Choose the best available fallback and record it in the report header:
- URL only, no access → ask the user to paste DOM+CSS for the key states, OR fall back to the static stylesheet if provided.
- Nothing code-side at all → set `codeSource: "none"`, skip the code column, and run the **design-system-token check**: diff the selection's bound tokens / raw values against `penpotUtils.tokenOverview()` and report only design-side findings (hardcoded values, off-grid spacing, tokens that don't resolve, missing states across the design's own variant set).

The report must always state what the code side actually was, so the reader knows how much weight to give the parity claims.

## 6. Output additions for the Storybook case

Augment the Phase 3 mapping output (`02 §5`) with:
```
codeSource: "storybook",
storyId, iframeUrl,
statesRendered: [ { state, domCaptured: bool, computedCaptured: bool } ],
varResolution: "computed-var" | "literal-fallback" | "static-css"
```
