import { readFileSync } from "node:fs";
import { WorldSchema, type World } from "@wake/contracts";

/** Read and validate a world JSON file. Throws (with zod detail) if invalid. */
export function loadWorld(path: string): World {
  const raw = JSON.parse(readFileSync(path, "utf8"));
  return WorldSchema.parse(raw);
}
