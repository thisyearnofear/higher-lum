/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone", // This ensures better compatibility with Vercel
  images: {
    // Replace domains with remotePatterns for better security
    remotePatterns: [
      {
        protocol: "https",
        hostname: "futuretape.xyz",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "api.grove.storage",
        pathname: "**",
      },
    ],
  },
  // Optimize for static export
  experimental: {
    optimizePackageImports: ["@rainbow-me/rainbowkit", "wagmi", "three"],
  },
  // Configure webpack to support web workers
  webpack: (config, { isServer }) => {
    // Support web workers
    config.module.rules.push({
      test: /\.worker\.(js|ts)$/,
      use: {
        loader: "worker-loader",
        options: {
          filename: "static/chunks/[id].worker.[contenthash].js",
          publicPath: "/_next/",
          inline: "no-fallback",
        },
      },
    });

    // Fix for "Can't resolve 'fs'" error in browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    // Fix for "Module not found: Can't resolve 'worker_threads'" error
    config.resolve.alias = {
      ...config.resolve.alias,
      worker_threads: false,
    };

    // Fix for "window is not defined" error during build
    config.output.globalObject = "self";

    return config;
  },
};

module.exports = nextConfig;
