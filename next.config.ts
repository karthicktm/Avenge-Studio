import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployments
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },
  // sharp's .node file is traced by standalone, but the bundled libvips .so files
  // it dlopen()s at runtime are NOT traced (dynamic loading is invisible to the tracer).
  // This forces the standalone bundler to copy the full @img/sharp-* package tree.
  outputFileTracingIncludes: {
    "/api/**": ["./node_modules/**/@img/sharp-linuxmusl-x64/**"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "fal.media",
      },
      {
        protocol: "https",
        hostname: "*.fal.media",
      },
      {
        protocol: "https",
        hostname: "v3.fal.media",
      },
      {
        protocol: "https",
        hostname: "v3b.fal.media",
      },
    ],
  },
};

export default nextConfig;
