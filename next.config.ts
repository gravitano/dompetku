import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Output standalone untuk image Docker (lihat Dockerfile).
  output: "standalone",
  poweredByHeader: false,
};

export default nextConfig;
