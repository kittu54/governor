import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@governor/shared"],
  experimental: {
    typedRoutes: true
  }
};

export default nextConfig;
