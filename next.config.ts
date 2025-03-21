/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: "standalone", // This ensures better compatibility with Vercel
  images: {
    domains: ["futuretape.xyz"], // Allow images from futuretape.xyz
  },
};

module.exports = nextConfig;
