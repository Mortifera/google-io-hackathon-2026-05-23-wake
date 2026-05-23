# L0 — Contracts & scaffold (orchestrator)

**Folder:** `packages/contracts`, `packages/util`, `packages/llm` (mock), `fixtures/`,
plus root config. **Role:** owner of the seams; coordinator of the integration
checkpoints.

## Mission
Keep the integration surface stable so every other worker can move fast. You are
the only one who edits `@wake/contracts`. You author and maintain the fixtures and
the mock that unblock everyone.

## Done (v1 — already shipped)
- All six contracts as zod schemas + types in `packages/contracts/src`.
- `packages/util`: seeded RNG, `mapWithConcurrency`, id gen.
- `packages/llm`: `MockLLMClient` (offline default) + `GeminiLLMClient` stub.
- `worlds/notion/mini.json` (8-node toy) and `fixtures/` (Cascade + MonteCarlo)
  that validate against the schemas (`packages/contracts/src/fixtures.test.ts`).
- Root scaffold: pnpm workspace, `tsconfig.base.json`, vitest, `apps/web`.

## Ongoing responsibilities
- **Field requests:** when a worker needs a new field on a contract, add it as an
  **optional** field (never rename/remove), update the fixtures to match, bump
  nothing but keep the test green, and tell the affected workers.
- **Guard the freeze:** reject changes that would break existing consumers.
- **Run the checkpoints (CP1–CP4 in `PLAN.md`):** coordinate the swap from
  fixtures→real cascade (CP1), mock→Gemini and mini→Notion (CP2), wiring the fan
  + interp (CP3), and the operator/escape-hatch/rehearsal (CP4).

## Needs coordination
- Any non-additive contract change → announce, because it ripples to everyone.

## Gotchas
- Imports inside `contracts` are extensionless (moduleResolution `bundler`).
- Function-only contracts (TickFn, EdgeTransform, LLMClient, Explain) are TS
  types, not zod — they can't be runtime-validated, so their *inputs/outputs*
  (TickInput/TickOutput, Event, Cascade) carry the schemas.
