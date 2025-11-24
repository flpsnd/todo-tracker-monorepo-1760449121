import path from "path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["convex"],
  experimental: {
    /**
     * The notes app imports Convex code from the shared `/convex` directory
     * located outside the app root. `externalDir` lets Next bundle files that
     * live outside of this package when deployed on Vercel.
     */
    externalDir: true,
  },
  webpack: (config) => {
    // Resolve @/convex/* alias to the shared convex directory at repo root
    // This ensures webpack can find the files during build, matching tsconfig paths
    // On Vercel, process.cwd() is the app directory (apps/notes)
    const convexPath = path.resolve(process.cwd(), "../../convex");
    
    // Ensure resolve and alias objects exist
    if (!config.resolve) {
      config.resolve = {};
    }
    if (!config.resolve.alias) {
      config.resolve.alias = {};
    }
    
    // Set alias - webpack will resolve @/convex/_generated/api to convexPath/_generated/api
    config.resolve.alias["@/convex"] = convexPath;
    
    return config;
  },
};

export default nextConfig;
