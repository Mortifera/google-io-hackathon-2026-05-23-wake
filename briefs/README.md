# Worker briefs

One brief per worker. Each is self-contained: your folder, what you depend on,
the mock/fixture to build against, your done-when, and what needs coordination.

**Before you start:** read `../AGENTS.md` (the operating rules — pre-approval vs.
coordination, git, checkpoints) and `../PLAN.md` (the seams, dep graph, Gantt).

| Brief | Worker | Folder | Depends on | Builds against |
|-------|--------|--------|-----------|----------------|
| [L0](./L0-contracts.md) | Contracts & scaffold / orchestrator | `packages/contracts`, `fixtures/` | — | — |
| [L1](./L1-kernel.md) | Kernel | `packages/kernel` | contracts, util | MockLLM + mini world |
| [L2](./L2-llm.md) | LLM client | `packages/llm` | contracts | Gemini API + mock |
| [L3](./L3-nodes.md) | Per-node behavior | `packages/nodes` | contracts, llm (mock) | mock + mini world |
| [L4](./L4-edges.md) | Per-edge behavior | `packages/edges` | contracts, llm (mock) | mock |
| [L5](./L5-world.md) | World data (Notion) | `worlds/notion` | contracts (schema) | — |
| [L6](./L6-analysis.md) | Monte Carlo analysis | `packages/analysis` | contracts | fixture cascades |
| [L7](./L7-interp.md) | Interpretability | `packages/interp` | contracts, llm | fixture cascade |
| [L8](./L8-viz.md) | Visualization | `apps/web` | contracts | fixtures (already wired) |
| [L9](./L9-integration.md) | Integration / operator | `tools/`, wiring | everything | real world + kernel |

## Status right now (post-scaffold)

- ✅ L0 contracts frozen v1; fixtures + mini world + MockLLM shipped; everything
  typechecks, tests green, `apps/web` builds.
- 🟡 L1–L8 are typed stubs that throw with a pointer to their brief. Pick one up
  and replace the stub.
- The seams are stable. Build in your lane against the mock/fixtures and push to
  `main` continuously.

## How a worker run goes

1. Read `../AGENTS.md` and your brief.
2. `pnpm install` at the repo root (once).
3. Implement in your folder, against the mock/fixture. Iterate freely.
4. Add a test that validates your output against its `@wake/contracts` schema.
5. `pnpm typecheck && pnpm test`, then commit + push to `main`.
6. Stop and flag at the integration checkpoints (CP1–CP4 in `../PLAN.md`).
