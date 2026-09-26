import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ship a trimmed, self-contained server bundle so the deploy target
  // (a 1GB VPS) never needs to run `next build` itself — see ARCHITECTURE.md.
  output: "standalone",
};

export default nextConfig;
