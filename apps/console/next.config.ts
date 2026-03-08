import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@governor/shared"],
  experimental: {
    typedRoutes: true
  },
  eslint: {
    ignoreDuringBuilds: true
  }
};

export default nextConfig;
