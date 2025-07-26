/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow dev server access from other devices on the network
  experimental: {
    allowedDevOrigins: ['http://192.168.0.37:3000'],
  },
}

module.exports = nextConfig
