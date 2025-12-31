import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  transpilePackages: ["@agentos/global", "@agentos/service", "@agentos/web"],
  experimental: {
    clientRouterFilter: false,
    outputFileTracingRoot: path.join(__dirname, "../../"),
  },
};

export default nextConfig;
