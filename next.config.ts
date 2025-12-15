import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Disable static generation for pages with dynamic routes that require Firebase
  experimental: {
    // Allow dynamic rendering for Firebase-dependent pages
    dynamicIO: true,
  },
  // Vercel environment optimization
  swcMinify: true,
  // Enable static optimization for better performance
  staticPageGenerationTimeout: 60,
  // Configure image optimization for Vercel
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  // PWA support
  webpack: (config, { isServer }) => {
    return config;
  },
};

export default nextConfig;
