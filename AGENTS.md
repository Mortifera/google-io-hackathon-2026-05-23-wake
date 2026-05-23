# Wake — operating rules for AI workers

You are one of several AI workers building Wake in parallel. This file is your
contract. Read it fully before you touch anything. The goal: **work as hard and
as autonomously as possible inside your lane, and stop only at the seams where
workers must coordinate.**

New here? Read `README.md` (what Wake is), `PLAN.md` (the parallelization model,
the seams, the Gantt, the checkpoints), and your brief in `briefs/`. Then go.

---

## 1. The model: one worker, one folder, frozen seams

Each worker owns exactly one folder (see `PLAN.md` → "Monorepo layout"). You build
against **frozen JSON/function contracts** in `@wake/contracts`, not against other
workers' code. You integrate by producing or consuming a JSON artifact, never by
reaching into someone else's package.

Your brief (`briefs/L<n>-*.md`) tells you: your folder, what you depend on, what
mock/fixture to build against, and your **done-when**.

The two rules that make this work:
1. **Stay in your folder.** Don't edit another worker's package.
2. **Treat `@wake/contracts` and the fixtures as read-only law.** They are the
   integration surface. Changing them breaks everyone silently.

---

## 2. ✅ Pre-approved — do all of this without asking

Work hard here. No permission needed, no pausing to check in:

- **Read anything** in the repo.
- **Create and edit files inside your own assigned folder** freely.
- **Run the toolchain**: `pnpm typecheck`, `pnpm test`, `pnpm --filter <your-pkg>
  <script>`, `pnpm --filter @wake/web dev`/`build`, `tsx` scripts, vitest watch.
- **Add dependencies to your own package's `package.json`** and `pnpm install`.
- **Use `MockLLMClient` (`@wake/llm`) as much as you want** — it's free and
  offline. Run cascades, evals, and iterations against the mock all day.
- **Write your own tests and fixtures inside your folder.** Add a test that
  validates the JSON artifact you produce against its contract schema.
- **Iterate on prompts** and re-run your eval loop against the mock.
- **Commit and push to `main` continuously** — small, frequently, with clear
  messages (see §5). You do not need approval to commit working, in-lane changes.
- **Run the dev server and screenshot/QA your own work.**

When in doubt and it's inside your folder, against the mock, and reversible: **do
it.** Momentum beats caution here.

---

## 3. ⛔ Requires coordination — STOP and flag the orchestrator

These touch the seams or the wider system, or cost money. Do **not** do them
solo; surface the need and let the human/orchestrator coordinate:

- **Editing `packages/contracts`** (any seam: World, Cascade, MonteCarloResult,
  LLMClient, TickFn/TickOutput, EdgeTransform, Explanation). Only the contracts
  owner (L0) changes these. If you need a field, **request it** — and changes
  must be **additive** (new optional field), never a rename or removal, until a
  coordinated re-freeze.
- **Editing another worker's folder** or the shared fixtures
  (`fixtures/`, `worlds/notion/mini.json`). Those are everyone's baseline.
- **Spending real money / hitting the live Gemini API at scale.** The mock is the
  default. A few real calls to smoke-test L2's client is fine; **batch runs, the
  Monte Carlo precompute, or any large live run need an explicit human go** (cost
  + Tier 1 rate limits — see `GEMINI_RATE_LIMITS.md`).
- **Changing shared root config**: root `package.json`, `tsconfig.base.json`,
  `pnpm-workspace.yaml`, `vitest.config.ts`, or `apps/web/next.config.ts` in ways
  that affect everyone.
- **Adding a new cross-package dependency edge** (e.g. making the kernel import
  `@wake/edges` directly instead of via injection). This changes the dep graph in
  `PLAN.md`.
- **The integration checkpoints CP1–CP4** (see §6). These are the orchestration
  milestones — by design, the whole point is that you sprint *up to* them.
- **Anything outward-facing or hard to reverse**: force-push, history rewrite,
  deleting files you didn't create, changing `.gitignore`, publishing anything.

---

## 4. 🔒 Never

- **Never commit secrets.** `.env` is gitignored; keep it that way. Never print a
  full API key in logs, commit messages, or code. Never weaken `.gitignore`'s
  `.env` rules.
- **Never `git push --force`** or rewrite shared history on `main`.
- **Never delete or overwrite another worker's work** to resolve a conflict —
  rebase and keep both (your folders shouldn't actually collide).
- **Never fabricate data** (rate limits, benchmarks, "facts" about real people in
  dossiers). Dossiers are composites from public sources; mark uncertainty.

---

## 5. Git discipline (continuous push to `main`)

We work on `main` and push continuously. Because each worker owns a separate
folder, real conflicts are rare. Keep it clean:

- **Commit small and often**, scoped to your folder, with a clear message.
- **`git pull --rebase` before you push.** If a push is rejected, rebase (your
  folder won't conflict) and push again.
- End every commit message with the trailer:
  `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`
- Don't commit `node_modules`, `.env`, build output, or run artifacts (already in
  `.gitignore`).
- If you're doing something genuinely risky/experimental, use a short-lived
  branch and open a PR instead of pushing to `main`.

---

## 6. Integration checkpoints (the coordination milestones)

Sprint up to these; stop and coordinate at them. (Full detail in `PLAN.md`.)

- **CP1 — "the seam works":** kernel + MockLLM + mini world emit a real
  `Cascade.json`; the viz drops the fixture and renders the real one.
- **CP2 — "it's real":** swap MockLLM → Gemini Flash, mini → Notion world; tune
  node/edge prompts against the eval.
- **CP3 — "the punchline":** Monte Carlo → analysis → fan view; interp panel wired.
- **CP4 — "the demo":** operator console, precomputed runs, escape hatch, rehearsal.

---

## 7. Definition of done (every worker)

Before you call your piece done:
1. `pnpm typecheck` passes (your package at minimum).
2. Your package's tests pass, including a test that validates your output
   artifact against its `@wake/contracts` schema.
3. Your package's script runs and produces/consumes the expected JSON.
4. Committed and pushed to `main`.

---

## 8. Cost & rate limits

- Default to `MockLLMClient`. It is free and deterministic.
- Live Gemini is **Tier 1** — see `GEMINI_RATE_LIMITS.md`. Bound concurrency with
  `mapWithConcurrency` (`@wake/util`); don't blast the API.
- Big live runs and the Monte Carlo precompute are coordinated, budgeted events
  (see `PLAN.md` → budget allocation), not something a worker kicks off alone.

---

## 9. Quality bar

- Write code that reads like the surrounding code: match naming, comment density,
  and idioms already in the package.
- The contract schemas are the source of truth. If your output doesn't validate,
  fix your output — don't loosen the schema.
- Prefer a small, working, tested slice pushed now over a big untested one later.
