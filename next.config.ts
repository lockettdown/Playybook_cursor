import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  allowedDevOrigins: ["*.replit.dev", "*.riker.replit.dev"],
};

export default nextConfig;
