import { describe, it, expect } from "vitest";
import { WorldSchema } from "../../packages/contracts/src/index";
import type { GenesisLLM, JsonArgs } from "./llm";
import { buildWorld } from "./pipeline";
import { validateAndRun } from "./validateRun";
import { castToWorld } from "./wire";
import { normalizeCast } from "./cast";
import { planSizing } from "./budget";

/**
 * A fake GenesisLLM: returns a canned cast for the structuring call and canned
 * dossiers for the dossier call — zero network. This proves the whole pipeline
 * (research → wire → dossiers → assemble) yields a world that parses AND runs.
 */
const SCENARIO = "What happens if Stripe acquires Plaid?";

const FAKE_CAST = {
  worldId: "stripe-plaid",
  worldLabel: "Stripe acquires Plaid",
  sideAId: "stripe-corp",
  sideBId: "plaid-corp",
  nodes: [
    { id: "stripe-corp", label: "Stripe", category: "company", side: "A", note: "Payments infra giant." },
    { id: "plaid-corp", label: "Plaid", category: "company", side: "B", note: "Bank-data connectivity." },
    { id: "patrick-collison", label: "Patrick Collison", category: "leader", side: "A", affiliation: "stripe-corp", note: "Stripe CEO." },
    { id: "zach-perret", label: "Zach Perret", category: "leader", side: "B", affiliation: "plaid-corp", note: "Plaid CEO." },
    { id: "adyen", label: "Adyen", category: "competitor", side: "neutral", note: "Payments rival." },
    { id: "paypal", label: "PayPal", category: "competitor", side: "neutral", note: "Payments rival." },
    { id: "alex-heath", label: "Alex Heath", category: "journalist", side: "neutral", note: "Sources newsletter." },
    { id: "the-information", label: "The Information", category: "journalist", side: "neutral", note: "Scoops." },
    { id: "x-twitter", label: "X / Twitter", category: "platform", side: "neutral", note: "Fintech discourse." },
    { id: "hacker-news", label: "Hacker News", category: "platform", side: "neutral", note: "Dev jury." },
    { id: "fintech-developers", label: "Fintech developers", category: "cohort", side: "neutral", note: "Build on the APIs." },
    { id: "smb-merchants", label: "SMB merchants", category: "cohort", side: "neutral", note: "Stripe customers." },
    { id: "cfpb", label: "CFPB", category: "regulator", side: "neutral", note: "Open-banking rule (1033)." },
    { id: "ftc", label: "FTC", category: "regulator", side: "neutral", note: "Antitrust review (blocked the 2020 deal)." },
  ],
  seeds: [
    {
      id: "acquisition",
      label: "Stripe acquires Plaid",
      targetId: "stripe-corp",
      payload: "Stripe announces it is acquiring Plaid to own the bank-data connectivity layer.",
    },
  ],
};

class FakeLLM implements GenesisLLM {
  readonly usage = { calls: 0, inTokens: 0, outTokens: 0 };
  async ground(): Promise<{ text: string; queries: string[] }> {
    this.usage.calls++;
    return { text: "Stripe (Patrick Collison) acquiring Plaid (Zach Perret)...", queries: ["stripe plaid acquisition"] };
  }
  async json<T>(args: JsonArgs): Promise<T> {
    this.usage.calls++;
    if ((args.system ?? "").includes("design the cast")) {
      return FAKE_CAST as unknown as T;
    }
    // Dossier call — return one dossier per id mentioned in the batch prompt.
    const ids = [...args.user.matchAll(/- id: ([a-z0-9-]+)/g)].map((m) => m[1]);
    return {
      dossiers: ids.map((id) => ({
        id,
        dossier: `${id} reacts to the Stripe/Plaid deal in character; a composite, scenario-grounded profile.`,
        publicFace: "measured public line",
      })),
    } as unknown as T;
  }
}

describe("genesis pipeline (offline)", () => {
  it("turns a NL scenario into a World that parses against WorldSchema", async () => {
    const llm = new FakeLLM();
    const { world, summary } = await buildWorld(SCENARIO, { budget: 1, ticks: 12 }, llm);

    expect(() => WorldSchema.parse(world)).not.toThrow();
    expect(world.id).toBe("stripe-plaid");
    expect(world.nodes.length).toBeGreaterThanOrEqual(12);
    expect(world.seeds.length).toBeGreaterThanOrEqual(1);
    expect(summary.leaders).toBeGreaterThanOrEqual(2);
    expect(summary.competitors).toBeGreaterThanOrEqual(2);
    expect(summary.regulators).toBeGreaterThanOrEqual(2);
  });

  it("produces a structurally sound graph (unique ids, resolvable edges, reachable nodes)", async () => {
    const { world } = await buildWorld(SCENARIO, { budget: 1, ticks: 12 }, new FakeLLM());

    const ids = new Set(world.nodes.map((n) => n.id));
    expect(ids.size).toBe(world.nodes.length); // unique node ids

    const edgeIds = new Set<string>();
    for (const e of world.edges) {
      expect(e.source).not.toBe(e.target); // no self-loops
      expect(ids.has(e.source)).toBe(true);
      expect(ids.has(e.target)).toBe(true);
      expect(edgeIds.has(e.id)).toBe(false);
      edgeIds.add(e.id);
    }
    for (const s of world.seeds) for (const t of s.targets) expect(ids.has(t)).toBe(true);

    // Every non-root node has an inbound path.
    const roots = new Set([world.seeds[0]!.targets[0]!, "stripe-corp"]);
    const inbound = new Set<string>();
    for (const e of world.edges) {
      inbound.add(e.target);
      if (e.direction === "two-way") inbound.add(e.source);
    }
    const orphans = world.nodes.filter((n) => !inbound.has(n.id) && !roots.has(n.id)).map((n) => n.id);
    expect(orphans).toEqual([]);
  });

  it("is runnable: a real cascade through the kernel produces ticks + events", async () => {
    const { world } = await buildWorld(SCENARIO, { budget: 1, ticks: 12 }, new FakeLLM());
    const report = await validateAndRun(world, world.seeds[0]!.id, 6);
    expect(report.ticks).toBeGreaterThan(0);
    expect(report.events).toBeGreaterThan(0);
  });

  it("only load-bearing edges use the canonical archetype characters", async () => {
    const { world } = await buildWorld(SCENARIO, { budget: 1, ticks: 12 }, new FakeLLM());
    const blessed = new Set([
      "journalist->audience",
      "employee->manager",
      "customer->cohort",
      "competitor->strategy",
      "platform-amplification",
      "friend->friend",
      "company->journalist",
      "internal-leadership",
      "leadership->report",
    ]);
    for (const e of world.edges) {
      if (e.llmMediated) expect(blessed.has(e.character)).toBe(true);
    }
  });
});

describe("normalizeCast repair", () => {
  it("synthesizes a focal company and a seed when the LLM omits them", () => {
    const sizing = planSizing(1, 12);
    const cast = normalizeCast(
      { nodes: [{ label: "Some Journalist", category: "journalist", side: "neutral", note: "x" }], seeds: [] },
      "mystery scenario",
      sizing,
      [],
    );
    expect(cast.sideA).toBeTruthy();
    expect(cast.nodes.some((n) => n.id === cast.sideA)).toBe(true);
    expect(cast.seeds.length).toBeGreaterThanOrEqual(1);
    expect(cast.nodes.some((n) => n.id === cast.seeds[0]!.targetId)).toBe(true);
    // And it still wires into a valid world.
    expect(() => WorldSchema.parse(castToWorld(cast))).not.toThrow();
  });
});
