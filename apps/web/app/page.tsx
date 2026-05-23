import type { Cascade, MonteCarloResult, World } from "@wake/contracts";
import cascadeJson from "@fixtures/cascades/notion-world.acquisition.json";
import mcJson from "@fixtures/montecarlo/notion-acquisition.json";
import worldJson from "@worlds/notion/world.json";
import Stage from "../components/Stage";

// CP1 (landed): the cascade + world are now the REAL 207-node Gemini run
// (`notion-world.acquisition.json` over `worlds/notion/world.json`), not the
// hand-authored mini fixtures. The viz reads the same Cascade/World shapes, so
// this was a two-import swap. The Monte Carlo fan still reads the fixture
// MonteCarloResult until CP3 wires the real analysis output.
const cascade = cascadeJson as unknown as Cascade;
const mc = mcJson as unknown as MonteCarloResult;
const world = worldJson as unknown as World;

export default function Page() {
  return <Stage cascade={cascade} mc={mc} world={world} />;
}
