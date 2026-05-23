import { defineConfig } from "vitest/config";

// Local to @wake/web. The root vitest config only covers packages/**; this runs
// the app's pure-logic tests (lib/*) via `pnpm --filter @wake/web test`.
export default defineConfig({
  test: {
    include: ["lib/**/*.test.ts"],
  },
});
