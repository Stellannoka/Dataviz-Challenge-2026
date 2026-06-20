import type { NextConfig } from "next";

const repo = "pacific-dataviz-competition-2026";

const nextConfig: NextConfig = {
  output: "export",
  basePath: `/${repo}`,
  assetPrefix: `/${repo}/`,
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;