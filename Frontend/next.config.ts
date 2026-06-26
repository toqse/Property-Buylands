import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  devIndicators: false,
  trailingSlash: true,
  images: {
    disableStaticImages: true,
    unoptimized: true,
  },
};

export default nextConfig;
