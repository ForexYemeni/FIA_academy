import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Mark native packages as external so Next.js doesn't try to bundle them
  serverExternalPackages: [
    '@napi-rs/canvas',
    'bwip-js',
  ],
};

export default nextConfig;
