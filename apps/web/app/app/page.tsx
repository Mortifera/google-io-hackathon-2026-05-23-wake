import type { World } from "@wake/contracts";
import worldJson from "@worlds/notion/world.json";
import Stage from "../../components/Stage";

// The product workspace. Phase 1 mounts the existing Stage console on the
// prebuilt Notion world so /app works end-to-end immediately; Phase 2 replaces
// this with the <Studio> flow (pick/build world → action → run), which mounts
// Stage as its run step.
const world = worldJson as unknown as World;

export default function AppPage() {
  return <Stage world={world} />;
}
