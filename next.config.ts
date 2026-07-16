import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  devIndicators: false,
  allowedDevOrigins: ['*.trycloudflare.com', '*.loca.lt', 'localhost'],
};

export default nextConfig;
