/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    domains: ['images.pexels.com', 'api.dicebear.com', 'picsum.photos'],
    unoptimized: true,
  },
  swcMinify: true,
  typescript: {
    ignoreBuildErrors: true
  },
  eslint: {
    ignoreDuringBuilds: true
  },
  webpack: (config) => {
    config.ignoreWarnings = [
      { module: /node_modules\/node-fetch/ },
      { file: /node_modules\/node-fetch/ },
      /critical dependency/i,
      /dynamic require/i,
      /Failed to parse source map/i,
      /ModuleBuildError/i,
    ];
    return config;
  }
}

export default nextConfig;