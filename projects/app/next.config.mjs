import path from "path";
import { fileURLToPath } from "url";
import MonacoWebpackPlugin from "monaco-editor-webpack-plugin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  transpilePackages: ["@agentos/global", "@agentos/service", "@agentos/web", "@agentos/superagent"],
  experimental: {
    clientRouterFilter: false,
    outputFileTracingRoot: path.join(__dirname, "../../"),
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.plugins.push(
        new MonacoWebpackPlugin({
          languages: [
            "json",
            "javascript",
            "typescript",
            "python",
            "css",
            "html",
            "markdown",
            "yaml",
          ],
          filename: "static/[name].worker.js",
        })
      );
    }
    return config;
  },
};

export default nextConfig;
