import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Remove static export for full-stack app
  // output: 'export',
  // distDir: 'dist',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
