/** @type {import('next').NextConfig} */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nextConfig = {
  images: {
    unoptimized: true,
  },
  experimental: {
    /**
     * The todo app imports shared Convex code from the repo root.
     * Allow bundling files that live outside of this package.
     */
    externalDir: true,
  },
  webpack: (config) => {
    if (!config.resolve) config.resolve = {};
    if (!config.resolve.alias) config.resolve.alias = {};

    const sharedConvexPath = path.resolve(__dirname, "../../convex");
    const localConvexPath = path.resolve(__dirname, "./convex");
    const convexPath = fs.existsSync(sharedConvexPath)
      ? sharedConvexPath
      : localConvexPath;

    config.resolve.alias["@/convex"] = convexPath;
    return config;
  }
}

export default nextConfig