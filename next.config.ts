import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Isola o cache do `next dev` do Playwright (3099) do dev manual (3000). */
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  allowedDevOrigins: ["127.0.0.1"],
  output: "standalone",
  serverExternalPackages: ["@mastra/core"],
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;