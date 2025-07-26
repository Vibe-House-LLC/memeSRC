/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    allowedDevOrigins: ["http://192.168.0.37:3000"],
  },
}

module.exports = nextConfig
