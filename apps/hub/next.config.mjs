import fs from "fs";
import path from "path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    externalDir: true,
  },
  webpack: (config) => {
    if (!config.resolve) config.resolve = {};
    if (!config.resolve.alias) config.resolve.alias = {};

    const sharedConvexPath = path.resolve(process.cwd(), "../../convex");
    const localConvexPath = path.resolve(process.cwd(), "./convex");
    const convexPath = fs.existsSync(sharedConvexPath)
      ? sharedConvexPath
      : localConvexPath;

    config.resolve.alias["@/convex"] = convexPath;
    return config;
  },
}

export default nextConfig
