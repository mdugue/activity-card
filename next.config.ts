import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  reactCompiler: true,
  reactStrictMode: true,
  experimental: {
    // Phosphor's barrel re-exports every icon; tree-shake to per-icon imports
    // so dev compile times and the client bundle stay small (lucide-react is on
    // Next's default optimize list, @phosphor-icons/react is not).
    optimizePackageImports: ["@phosphor-icons/react"],
  },
};

export default nextConfig;
