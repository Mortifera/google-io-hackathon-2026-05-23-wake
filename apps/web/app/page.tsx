import type { World } from "@wake/contracts";
import worldJson from "@worlds/notion/world.json";
import Stage from "../components/Stage";

// CP1 (landed): the real 207-node Gemini world + cascade. Cascades are wired
// through the scenario registry (lib/scenarios.ts) keyed by seed action, so the
// operator console can switch between precomputed runs; this page just supplies
// the static World. The Monte Carlo fan reads the fixture analysis until CP3.
const world = worldJson as unknown as World;

export default function Page() {
  return <Stage world={world} />;
}
