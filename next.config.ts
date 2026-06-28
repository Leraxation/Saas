import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Suppress "async component" hydration warnings in demo mode
  reactStrictMode: true,
};

export default nextConfig;
