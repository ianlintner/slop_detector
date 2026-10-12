import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle (`.next/standalone/server.js`) with only
  // the traced runtime dependencies, so the container image does not need
  // node_modules or the Next.js CLI. See docs/deployment.md.
  output: 'standalone',
};

export default nextConfig;
