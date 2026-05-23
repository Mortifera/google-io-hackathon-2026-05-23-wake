import type { NextConfig } from "next";
import path from "node:path";

const repoRoot = path.resolve(process.cwd(), "..", "..");

const nextConfig: NextConfig = {
  // Transpile the workspace TS packages (their entry points are raw .ts).
  transpilePackages: [
    "@wake/contracts",
    "@wake/util",
    "@wake/llm",
    "@wake/interp",
    "@wake/kernel",
    "@wake/nodes",
    "@wake/edges",
  ],
  // We import fixtures/worlds JSON from the monorepo root; pin the root so
  // Turbopack resolves and traces files outside apps/web correctly.
  turbopack: {
    root: repoRoot,
  },
  // Match turbopack.root so Vercel's build (which otherwise sets this to the
  // project Root Directory, apps/web) still traces files outside apps/web —
  // needed because we import fixtures/ and the workspace packages from root.
  outputFileTracingRoot: repoRoot,
};

export default nextConfig;
