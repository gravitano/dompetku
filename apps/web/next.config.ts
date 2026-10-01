import path from "node:path";

import type { NextConfig } from "next";

/** Root monorepo (pnpm workspace) — tempat `pnpm-lock.yaml` & `node_modules/.pnpm`. */
const workspaceRoot = path.join(__dirname, "../..");

const nextConfig: NextConfig = {
  // Output standalone untuk image Docker (lihat apps/web/Dockerfile);
  // di Vercel dibiarkan default karena build Vercel mengemas sendiri.
  output: process.env.VERCEL ? undefined : "standalone",
  // Tracing dari root workspace agar dependency pnpm (symlink ke
  // node_modules/.pnpm di root) ikut tersalin ke `.next/standalone`.
  outputFileTracingRoot: workspaceRoot,
  turbopack: { root: workspaceRoot },
  poweredByHeader: false,
};

export default nextConfig;
