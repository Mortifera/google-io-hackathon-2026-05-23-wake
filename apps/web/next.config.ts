import type { NextConfig } from "next";
import path from "node:path";

const repoRoot = path.resolve(process.cwd(), "..", "..");

const nextConfig: NextConfig = {
  // Transpile the workspace TS packages (their entry points are raw .ts).
  transpilePackages: ["@wake/contracts", "@wake/util", "@wake/llm", "@wake/interp"],
  // We import fixtures/worlds JSON from the monorepo root; pin the root so
  // Turbopack resolves and traces files outside apps/web correctly.
  turbopack: {
    root: repoRoot,
  },
};

export default nextConfig;
