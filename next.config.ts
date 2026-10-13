import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

// Baseline security headers for every route. Deliberately NOT a full CSP:
// snapdom's export (serialised <svg><foreignObject>, data:/blob: images),
// the Remotion players and object-URL photos would all need carve-outs. The
// CSP carries only `frame-ancestors` — the app is never embedded, so no
// origin may frame it (X-Frame-Options covers browsers without CSP2).
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  experimental: {
    // Phosphor's barrel re-exports every icon; tree-shake to per-icon imports
    // so dev compile times and the client bundle stay small (lucide-react is on
    // Next's default optimize list, @phosphor-icons/react is not).
    optimizePackageImports: ["@phosphor-icons/react"],
  },
  // Next's contract is async; the header list itself is static.
  headers: async () =>
    await Promise.resolve([{ headers: SECURITY_HEADERS, source: "/:path*" }]),
  reactCompiler: true,
  reactStrictMode: true,
};

// Sentry: error reports reach it through the same-origin `/monitoring` tunnel
// (ad blockers drop direct requests to sentry.io). Source maps are uploaded
// only when SENTRY_AUTH_TOKEN is set (Vercel), and never served publicly.
export default withSentryConfig(nextConfig, {
  org: "manuel-dugue",
  project: "effort",
  silent: process.env.CI === undefined,
  sourcemaps: { deleteSourcemapsAfterUpload: true },
  tunnelRoute: "/monitoring",
  widenClientFileUpload: true,
});
