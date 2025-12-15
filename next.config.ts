import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Disable static generation for pages with dynamic routes that require Firebase
  experimental: {
    // Allow dynamic rendering for Firebase-dependent pages
    dynamicIO: true,
  },
};

export default nextConfig;
