# Genesis — the demo closer

> **"Same engine, any world, one sentence."**
> Everything else in the demo ran on worlds we hand-built. Genesis shows the
> world model isn't bespoke — it's *generated* from a single English sentence.

---

## The locked command

```bash
pnpm exec tsx tools/genesis/genesis.ts "What happens if Stripe acquires Plaid?" --budget 0.1 --ticks 8
```

This is the proven, on-camera default (matches the design mock). It produces:

- **~21 entities** — 4 leaders · 3 competitors · 3 journalists · 5 cohorts · 2 platforms · 2 regulators
- **~37 edges** (~23 load-bearing) · **3 seed actions**
- **21/21 dossiers** via Gemini 3.5 Flash
- **~$0.016** of Gemini · **~5 calls**
- then **parses `WorldSchema`, loads via `loadWorld()`, and runs a real cascade** (proof it's runnable, not just JSON)

**Timing:** ~50–55s end-to-end live (the Google-Search research call is a ~30–40s
floor we don't control; dossiers are parallelized). For a tight 20–30s beat,
**use the precomputed fallback** (below) and let the build-steps animation pace
the narration; run the live command as proof-of-realness / B-roll.

---

## On-screen build steps (point at these as they check off)

The CLI prints these in order — the same six as the mock's progress panel:

1. **Researching the cast** — Google Search
2. **Deciding which entities matter** — structuring the cast
3. **Sizing the graph to budget** — `N entities × T ticks ≈ $X / run`
4. **Generating dossiers** — Gemini 3.5 Flash
5. **Writing edges & channels**
6. **Assembling world.json** — then ✓ parses + ✓ runnable

Then the **THE CAST · 21 ENTITIES** summary (leaders / competitors / journalists /
cohorts / platforms / regulators) — the mock's bottom row.

---

## ⚠️ Never fail live — the fallback

A finished run is committed, identical to a successful live run:

- **World:** `tools/genesis/examples/stripe-plaid.json` (21 nodes, 37 edges, 3 seeds)
- **Cascade:** `tools/genesis/examples/stripe-plaid-cascade.json` — a real Gemini
  cascade over that world (15 ticks, 48 events, ~$0.12; parses `CascadeSchema`,
  0 dangling `causedBy`). The deal announcement propagates leadership → press →
  X/Twitter ("war on Visa/Mastercard") → developers, VCs, fintech startups.

If the live run is slow or flaky during recording, **show the committed files
instead** — same content, instant. Sanity-check either artifact anytime:

```bash
# parses WorldSchema, loads via the kernel, runs a cascade — prints ticks/events
pnpm exec tsx tools/genesis/genesis.ts --verify tools/genesis/examples/stripe-plaid.json
```

(There is no network in the verify path — it uses the MockLLM canned responder.)

---

## Narration beat (~25s)

> "Everything you've seen ran on a world we built by hand. But the world model
> isn't hand-built — it's generated. One sentence: *what happens if Stripe
> acquires Plaid?* Genesis researches the real cast with Google Search — the
> Collisons, Adyen, the FTC — sizes the graph to a budget, writes every dossier
> with Gemini Flash, and assembles a `world.json` the exact same engine runs.
> Twenty-one entities, a runnable world, about two cents. **Same engine, any
> world, one sentence.**"

---

## If you want a different scenario on the day

Any one-liner works (`"OpenAI open-sources GPT-5"`, `"Disney acquires Netflix"`).
Keep `--budget` small (0.1) for speed; raise it for a bigger cast. Always have a
freshly-precomputed fallback for whatever scenario you lock — regenerate with the
command above and re-copy `out/<id>.json` into `examples/`.
```
