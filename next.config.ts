import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "partnercentral.kapruka.com" },
      { protocol: "https", hostname: "www.kapruka.com" },
      { protocol: "https", hostname: "kapruka.com" },
    ],
  },
};

export default nextConfig;
