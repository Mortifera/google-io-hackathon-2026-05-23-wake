import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Local config (worlds/ is not a workspace package). Run:
//   pnpm exec vitest run --config worlds/anthropic/vitest.config.ts
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");

export default defineConfig({
  test: {
    root: here,
    include: ["world.test.ts"],
  },
  resolve: {
    alias: {
      "@wake/contracts": path.resolve(root, "packages/contracts/src/index.ts"),
      "@wake/kernel": path.resolve(root, "packages/kernel/src/index.ts"),
    },
  },
});
