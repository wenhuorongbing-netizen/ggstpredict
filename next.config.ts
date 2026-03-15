import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    return [
      {
        source: "/api/bot/:path*",
        destination: "http://localhost:5000/:path*",
      },
    ];
  },
};

export default nextConfig;
