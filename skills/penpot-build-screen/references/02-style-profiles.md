# 02 — Style profiles (avoid generic output)

LLMs converge to a bland average (centered cards, generic gradients, system font). Counter it by
committing to a deliberate **style profile** up front, then applying it consistently via tokens.

## Pick one (or define a brand one)
- **Functional/Enterprise** — dense, neutral palette, restrained radius, clear data hierarchy.
- **Modern SaaS** — generous whitespace, one strong accent, medium radius, soft shadows.
- **Editorial** — large type scale, high contrast, asymmetric layout, minimal chrome.
- **Playful/Consumer** — vivid accent, rounded radius, bolder weights, motion-ready states.

## Apply through the system
- Color: choose semantic roles from the token set; don't introduce one-off colors.
- Type: use the semantic type tokens; set a clear h1→body rhythm.
- Spacing: pick an inset/stack rhythm from the spacing scale and keep it consistent.
- Radius/shadow: one radius token family; restrained, tokenized shadows.

Record the chosen profile in the ledger so every section stays coherent. Justify aesthetic choices in
the final critique.
