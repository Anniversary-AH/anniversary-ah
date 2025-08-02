/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['wow.zamimg.com', 'render.worldofwarcraft.com'],
  },
  experimental: {
    appDir: false
  }
}

module.exports = nextConfig
