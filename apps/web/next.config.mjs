/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@nexusdesk/ui",
    "@nexusdesk/types",
    "@nexusdesk/protocol",
    "@nexusdesk/validation",
    "@nexusdesk/crypto",
    "@nexusdesk/config",
  ],
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
