import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdnm.sanmar.com' },
      { protocol: 'https', hostname: 'cdn.sanmar.com' },
      { protocol: 'https', hostname: 'images.promosink.com' },
      { protocol: 'https', hostname: 'img.promosink.com' },
    ],
  },
};

export default nextConfig;
