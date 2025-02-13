/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone", // This ensures better compatibility with Vercel
  images: {
    domains: ["futuretape.xyz"], // Allow images from futuretape.xyz
  },
  // Optimize for static export
  experimental: {
    optimizePackageImports: ["@rainbow-me/rainbowkit", "wagmi", "three"],
  },
};

module.exports = nextConfig;
