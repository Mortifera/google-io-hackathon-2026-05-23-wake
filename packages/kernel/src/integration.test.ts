import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { CascadeSchema } from "@wake/contracts";
import { MockLLMClient } from "@wake/llm";
import { tickFn } from "@wake/nodes";
import { edgeTransform } from "@wake/edges";
import { runCascade, loadWorld } from "./index";
import { cannedResponder } from "./canned";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const world = loadWorld(path.join(root, "worlds/notion/mini.json"));

// Full pipeline: kernel + the REAL @wake/nodes tickFn + the REAL @wake/edges
// edgeTransform, driven by the offline MockLLMClient with the canned responder.
// Proves the three packages integrate (the seam) without any API spend.
describe("kernel + nodes + edges integration (offline)", () => {
  it("runs the real node/edge behaviour into a schema-valid cascade", async () => {
    const llm = new MockLLMClient({ responder: cannedResponder });
    const cascade = await runCascade(
      world,
      "acquisition",
      { llm, tickFn, edgeTransform },
      { seed: 1, concurrency: 6 },
    );
    expect(() => CascadeSchema.parse(cascade)).not.toThrow();
    expect(cascade.ticks.length).toBeGreaterThan(2);
    // events propagated beyond the seed
    expect(cascade.eventDag.length).toBeGreaterThan(world.seeds.length + 3);
    // the real node prompt produced public/private faces
    const corp = cascade.finalState["notion-corp"]!;
    expect(corp.publicFace.length).toBeGreaterThan(0);
    expect(corp.privateInterior.length).toBeGreaterThan(0);
  });

  it("is deterministic for a fixed seed", async () => {
    const run = () =>
      runCascade(
        world,
        "acquisition",
        {
          llm: new MockLLMClient({ responder: cannedResponder }),
          tickFn,
          edgeTransform,
        },
        { seed: 3 },
      );
    expect(JSON.stringify(await run())).toBe(JSON.stringify(await run()));
  });
});
