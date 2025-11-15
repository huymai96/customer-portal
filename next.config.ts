import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdnm.sanmar.com' },
      { protocol: 'https', hostname: 'cdn.sanmar.com' },
      { protocol: 'https', hostname: 'images.promosink.com' },
      { protocol: 'https', hostname: 'img.promosink.com' },
      { protocol: 'https', hostname: 'cdn.ssactivewear.com' },
      { protocol: 'https', hostname: 'ssactivewear.com' },
    ],
  },
};

export default nextConfig;
