/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  basePath: '/v1/employee/',
  images: {
    domains: ['cafm.zenapi.co.in'],
  },
}

module.exports = nextConfig 