/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@agentos/global", "@agentos/service", "@agentos/web"],
};

export default nextConfig;
