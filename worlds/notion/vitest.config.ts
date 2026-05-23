import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Local config: worlds/ is not a workspace package, so the root vitest config
// (which globs packages/**) won't pick this up. Run explicitly:
//   pnpm exec vitest run --config worlds/notion/vitest.config.ts
// Aliases let world.test.ts import the kernel's real loadWorld() + the schema
// by package name, mirroring how the actual workers consume them.
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
