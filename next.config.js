/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['cafm.zenapi.co.in'],
  },
}

module.exports = nextConfig 