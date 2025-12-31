/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  transpilePackages: ["@agentos/global", "@agentos/service", "@agentos/web"],
};

export default nextConfig;
