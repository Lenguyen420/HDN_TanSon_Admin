import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Keep file watching and module resolution inside this project.
    root: process.cwd(),
  },
  experimental: {
    // Target for Turbopack's cache, not a hard limit for the Node process.
    turbopackMemoryLimit: 1024 * 1024 * 1024,
    // Avoid loading every admin route into RAM when production starts.
    preloadEntriesOnStart: false,
    // Reduce parallel static-generation workers on local machines.
    cpus: 2,
    webpackMemoryOptimizations: true,
  },
};

export default nextConfig;
