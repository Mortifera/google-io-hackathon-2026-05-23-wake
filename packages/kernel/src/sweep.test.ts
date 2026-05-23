import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { CascadeSchema } from "@wake/contracts";
import { MockLLMClient } from "@wake/llm";
import { tickFn } from "@wake/nodes";
import { edgeTransform } from "@wake/edges";
import { loadWorld } from "./index";
import { sweep, applyPerturbation } from "./sweep";
import { cannedResponder } from "./canned";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const world = loadWorld(path.join(root, "worlds/notion/mini.json"));
const deps = {
  llm: new MockLLMClient({ responder: cannedResponder }),
  tickFn,
  edgeTransform,
};

describe("sweep", () => {
  it("produces (combos × reps) cascades, each tagged with its perturbation", async () => {
    const cascades = await sweep(world, "acquisition", deps, {
      dimensions: [
        { name: "framing", values: ["independent", "integrated"] },
        { name: "pressClimate", values: ["skeptical", "favorable"] },
      ],
      repetitions: 2,
      maxTicks: 8,
      runConcurrency: 4,
    });
    expect(cascades).toHaveLength(8); // 2 × 2 combos × 2 reps
    for (const c of cascades) {
      expect(() => CascadeSchema.parse(c)).not.toThrow();
      expect(c.meta.perturbation?.framing).toBeDefined();
      expect(c.meta.perturbation?.pressClimate).toBeDefined();
    }
    const distinct = new Set(
      cascades.map((c) => JSON.stringify(c.meta.perturbation)),
    );
    expect(distinct.size).toBe(4); // 4 distinct perturbation combos
  });

  it("applyPerturbation rewrites the seed payload by framing", () => {
    const integrated = applyPerturbation(world, "acquisition", {
      framing: "integrated",
    });
    expect(
      integrated.seeds.find((s) => s.id === "acquisition")!.payload.toLowerCase(),
    ).toContain("integrated");

    const independent = applyPerturbation(world, "acquisition", {
      framing: "independent",
    });
    expect(
      independent.seeds.find((s) => s.id === "acquisition")!.payload.toLowerCase(),
    ).toContain("independent");
  });
});
