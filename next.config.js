/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  basePath: '/v1/employee',
  images: {
    domains: ['cafm.zenapi.co.in', 'localhost'],
  },
  webpack: (config, { isServer }) => {
    // Handle face-api.js and its Node.js dependencies
    if (!isServer) {
      // For client-side builds, provide fallbacks for Node.js modules
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        encoding: false,
        'node-fetch': false,
      };
    }
    
    // Suppress warnings about missing optional dependencies
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      { 
        module: /node_modules\/node-fetch/,
        message: /Can't resolve 'encoding'/,
      },
      { 
        module: /node_modules\/face-api\.js/,
      },
    ];
    
    return config;
  },
}

module.exports = nextConfig