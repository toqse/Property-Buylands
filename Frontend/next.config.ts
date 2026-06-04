import type { NextConfig } from "next";

const isStaticExport = process.env.NEXT_OUTPUT === "export";

const nextConfig: NextConfig = {
  devIndicators: false,
  ...(isStaticExport ? { output: "export" } : {}),
  trailingSlash: true,
  images: {
    disableStaticImages: true,
    unoptimized: true,
  },
};

export default nextConfig;
