/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // Configure Socket.IO to work properly
  async rewrites() {
    return [
      {
        source: '/socket.io/:path*',
        destination: '/api/socket/:path*',
      },
    ];
  },
  // Fix RSC errors
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
};

module.exports = nextConfig;