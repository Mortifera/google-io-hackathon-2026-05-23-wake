import type { Cascade, MonteCarloResult, World } from "@wake/contracts";
import cascadeJson from "@fixtures/cascades/notion-acquisition.json";
import mcJson from "@fixtures/montecarlo/notion-acquisition.json";
import worldJson from "@worlds/notion/mini.json";
import Stage from "../components/Stage";

// Driven entirely by the fixture Cascade + MonteCarloResult (zero kernel
// dependency). The mini world supplies static graph metadata — labels, tiers,
// edges — and is optional: the graph reconstructs from the event stream alone if
// it's ever absent. At CP1 the cascade swaps for the kernel's real run; at CP3
// the interp panel swaps its local DAG trace for the live explain() call.
const cascade = cascadeJson as unknown as Cascade;
const mc = mcJson as unknown as MonteCarloResult;
const world = worldJson as unknown as World;

export default function Page() {
  return <Stage cascade={cascade} mc={mc} world={world} />;
}
