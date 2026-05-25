import type { World } from "@wake/contracts";
import notionJson from "@worlds/notion/world.json";
import anthropicJson from "@worlds/anthropic/world.json";
import Studio, { type PrebuiltWorld } from "../../components/Studio";

// The product workspace: the Studio flow (pick/build a world → action → run).
// Prebuilt worlds are the "quick look" on-ramp; build-your-own (Genesis) is the
// hero, handled inside the World step.
const PREBUILT: PrebuiltWorld[] = [
  {
    id: "notion",
    label: "Notion × Microsoft",
    description:
      "Microsoft acquires Notion. 208 people, communities, and platforms reason about the deal, the backlash, and the integration.",
    world: notionJson as unknown as World,
  },
  {
    id: "anthropic",
    label: "Anthropic",
    description:
      "A frontier lab under the safety-vs-commercial tension. 57 named leaders, labs, journalists, and regulators.",
    world: anthropicJson as unknown as World,
  },
];

export default function AppPage() {
  return <Studio prebuilt={PREBUILT} />;
}
