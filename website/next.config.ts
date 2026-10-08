import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  poweredByHeader: false,
  agentRules: false,
  turbopack: { root: process.cwd() },
};
export default function config(phase: string): NextConfig {
  // The exported site uses its host's fallback. This rule is only for next dev.
  return phase === PHASE_DEVELOPMENT_SERVER ? {
    ...nextConfig,
    output: undefined,
    async rewrites() { return { afterFiles: [{ source: "/app/:path*", destination: "/app/index.html" }] }; },
  } : nextConfig;
}
