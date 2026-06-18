# Local model calibration (LM Studio / local LLMs)

If you run a local model instead of a cloud provider, tune it so it drives the Penpot tools reliably
instead of hallucinating.

## Settings
- **Temperature ≈ 0.1.** Tool/structure work needs determinism; the creative default (~0.8) makes the
  model improvise tool calls and break the API contract.
- **Context window ≈ 30,000 tokens** (up from a 4,096 default). The Plugin API surface + multi-step
  `execute_code` sequences need room; too small a window truncates the tool protocol.
- **Rolling / overflow window: ON.** Use a sliding "rolling window" so old messages are discarded
  rather than saturating and corrupting the control channel.

## Practical notes
- Prefer the SSE endpoint directly for low-latency local setups: `http://localhost:4401/sse`.
- Models below ~7–8B often can't keep the four-tool protocol straight; prefer a stronger local model
  or the cloud providers for production work.
- Always keep the Penpot plugin window open (see `README.md` / `../docs/troubleshooting.md`).
