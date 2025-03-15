/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone", // This ensures better compatibility with Vercel
  images: {
    domains: ["futuretape.xyz", "api.grove.storage"], // Allow images from futuretape.xyz and api.grove.storage
  },
  // Optimize for static export
  experimental: {
    optimizePackageImports: ["@rainbow-me/rainbowkit", "wagmi", "three"],
  },
};

module.exports = nextConfig;
