import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack(config) {
    config.module.rules.push({
      test: /\.ged$/,
      type: "asset/source",
    });
    return config;
  },
  turbopack: {
    rules: {
      "*.ged": {
        loaders: ["raw-loader"],
        as: "*.js",
      },
    },
  },
};

export default nextConfig;
