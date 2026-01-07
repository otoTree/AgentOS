import path from "path";
import { fileURLToPath } from "url";
import MonacoWebpackPlugin from "monaco-editor-webpack-plugin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  transpilePackages: ["@agentos/global", "@agentos/service", "@agentos/web", "@agentos/superagent", "@agentos/office"],
  experimental: {
    clientRouterFilter: false,
    outputFileTracingRoot: path.join(__dirname, "../../"),
  },
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      config.plugins.unshift(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
          resource.request = resource.request.replace(/^node:/, "");
        }),
      );
      config.resolve.alias = {
        ...config.resolve.alias,
        "node:fs": false,
        "node:child_process": false,
        "node:net": false,
        "node:tls": false,
        "node:https": false,
        "node:path": false,
        "node:url": false,
        "node:util": false,
        "node:zlib": false,
        "node:stream": false,
        "node:buffer": false,
        fs: false,
        path: false,
        os: false,
      };

      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        child_process: false,
        net: false,
        tls: false,
        https: false,
      };

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
