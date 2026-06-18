# 04 — Instances, swap, detach

## Instances
- `comp.instance()` creates a new instance; `comp.mainInstance()` is the main shape.
- `shape.isComponentInstance()`, `shape.component()`, `shape.componentRoot()` inspect linkage.

## Swapping
- `instance.swapComponent(otherComponent)` replaces the instance's component while keeping position.
- `instance.switchVariant(pos, value)` switches within a variant container.

## Detach (semi-destructive — always report)
- `instance.detach()` breaks the link to the main component.
- **Detach before** removing/replacing an instance's internal children — mutating an attached instance fights the component definition.
- Detaching is never an auto-fix; surface it at a checkpoint with the reason.

## Rule of thumb
Prefer `swapComponent`/`switchVariant` over detach. Detach only when the design genuinely diverges
from the component, and record it in the report and ledger.
