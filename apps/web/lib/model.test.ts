import { describe, expect, it } from "vitest";
import {
  CascadeSchema,
  MonteCarloResultSchema,
  WorldSchema,
  type Cascade,
  type MonteCarloResult,
  type World,
} from "@wake/contracts";
import cascadeJson from "../../../fixtures/cascades/notion-acquisition.json";
import mcJson from "../../../fixtures/montecarlo/notion-acquisition.json";
import worldJson from "../../../worlds/notion/mini.json";
import { buildCascadeModel, buildGraphModel, resolveFrame } from "./model";
import { explainNode } from "./explain";

const cascade = cascadeJson as unknown as Cascade;
const mc = mcJson as unknown as MonteCarloResult;
const world = worldJson as unknown as World;

describe("fixtures validate against @wake/contracts", () => {
  it("cascade matches CascadeSchema", () => {
    expect(() => CascadeSchema.parse(cascadeJson)).not.toThrow();
  });
  it("monte carlo matches MonteCarloResultSchema", () => {
    expect(() => MonteCarloResultSchema.parse(mcJson)).not.toThrow();
  });
  it("mini world matches WorldSchema", () => {
    expect(() => WorldSchema.parse(worldJson)).not.toThrow();
  });
});

describe("buildGraphModel", () => {
  it("includes every node the cascade references, enriched by the world", () => {
    const g = buildGraphModel(cascade, world);
    // every finalState id and every event endpoint (except the seed "world")
    const referenced = new Set<string>([
      ...Object.keys(cascade.finalState),
      ...cascade.eventDag.flatMap((e) => [e.source, e.target]),
    ]);
    referenced.delete("world");
    const have = new Set(g.nodes.map((n) => n.id));
    for (const id of referenced) expect(have.has(id)).toBe(true);
    expect(g.edges.length).toBe(world.edges.length);
    // tier/label came from the world, not the id-humanizer fallback
    const corp = g.nodes.find((n) => n.id === "notion-corp");
    expect(corp?.label).toBe("Notion (corporate)");
    expect(corp?.tier).toBe(1);
  });

  it("degrades gracefully with no world (reconstructs from the event stream)", () => {
    const g = buildGraphModel(cascade);
    expect(g.nodes.length).toBeGreaterThanOrEqual(
      Object.keys(cascade.finalState).length,
    );
    expect(g.edges.length).toBeGreaterThan(0); // synthesized from event hops
  });
});

describe("buildCascadeModel", () => {
  const g = buildGraphModel(cascade, world);
  const m = buildCascadeModel(cascade, g);

  it("resolves one full state map per tick, carrying state forward", () => {
    expect(m.resolvedStates.length).toBe(cascade.ticks.length);
    // sparse timeline → every node still has a state at every tick
    for (const states of m.resolvedStates) {
      for (const n of g.nodes) expect(states[n.id]).toBeDefined();
    }
  });

  it("overlays the canonical finalState onto the last tick", () => {
    const lastStates = m.resolvedStates[m.resolvedStates.length - 1];
    for (const [id, st] of Object.entries(cascade.finalState)) {
      expect(lastStates[id].mood.sentiment).toBe(st.mood.sentiment);
    }
  });

  it("tracks divergence and its peak", () => {
    expect(m.divergenceByTick.length).toBe(cascade.ticks.length);
    expect(m.maxDivergence).toBeGreaterThanOrEqual(3);
  });
});

describe("resolveFrame", () => {
  const g = buildGraphModel(cascade, world);
  const m = buildCascadeModel(cascade, g);
  const nTicks = cascade.ticks.length;

  it("parks the final act fully played at p === nTicks", () => {
    const f = resolveFrame(m, nTicks);
    expect(f.act).toBe(nTicks - 1);
    expect(f.sub).toBe(1);
    expect(f.tick).toBe(nTicks - 1);
  });

  it("opens on the seed act at p === 0", () => {
    const f = resolveFrame(m, 0);
    expect(f.act).toBe(0);
    expect(f.sub).toBe(0);
  });

  it("clamps out-of-range positions", () => {
    expect(resolveFrame(m, -5).p).toBe(0);
    expect(resolveFrame(m, 999).p).toBe(nTicks);
  });
});

describe("explainNode (DAG trace-back invariant)", () => {
  const g = buildGraphModel(cascade, world);
  const m = buildCascadeModel(cascade, g);
  const dagIds = new Set(cascade.eventDag.map((e) => e.id));

  it("every citedEventId exists in the cascade DAG", () => {
    for (const id of Object.keys(cascade.finalState)) {
      const exp = explainNode(m, g, id);
      for (const cited of exp.citedEventIds) {
        expect(dagIds.has(cited)).toBe(true);
      }
    }
  });

  it("produces a grounded chain for a downstream node", () => {
    // productivity Twitter is the betrayal node; its cause should trace to the seed
    const exp = explainNode(m, g, "prod-twitter");
    expect(exp.answer.length).toBeGreaterThan(40);
    expect(exp.chain.length).toBeGreaterThanOrEqual(2);
    expect(exp.chain[0].causedBy).toBeNull(); // root of the chain is the seed
  });
});
