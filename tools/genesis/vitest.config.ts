import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import path from "node:path";

// tools/ is not a workspace package, so the root vitest config (globs packages/**)
// won't pick this up. Run explicitly:
//   pnpm exec vitest run --config tools/genesis/vitest.config.ts
// Modules import @wake/* packages by relative path; the workspace's node_modules
// symlinks resolve the packages' own internal "@wake/*" imports.
const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    root: here,
    include: ["*.test.ts"],
  },
});
