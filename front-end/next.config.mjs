/** @type {import('next').NextConfig} */
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nextConfig = {
  // Enable static export for Netlify
  output: 'export',
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  
  images: {
    domains: [
      'images.pexels.com', 
      'api.dicebear.com', 
      'picsum.photos',
      'images.unsplash.com',
      'creator.nightcafe.studio'
    ],
    unoptimized: true,
  },
  swcMinify: true,
  typescript: {
    ignoreBuildErrors: false
  },
  eslint: {
    ignoreDuringBuilds: false
  },
  experimental: {
    // Improve build caching
    turbotrace: {
      logLevel: 'error'
    }
  },
  webpack: (config, { isServer, dev }) => {
    config.ignoreWarnings = [
      { module: /node_modules\/node-fetch/ },
      { file: /node_modules\/node-fetch/ },
      /critical dependency/i,
      /dynamic require/i,
      /Failed to parse source map/i,
      /ModuleBuildError/i,
      /Module not found: Can't resolve 'pino-pretty'/,
    ];

    // Handle Three.js and troika-worker SSR issues
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'three': 'THREE',
        'troika-worker-utils': 'troika-worker-utils'
      });
    }

    // Fallback for worker modules in SSR
    config.resolve.fallback = {
      ...config.resolve.fallback,
      worker_threads: false,
      child_process: false,
      fs: false,
      net: false,
      tls: false,
      'pino-pretty': false,
    };

    // Ensure proper module resolution for @/ alias
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, './')
    };

    return config;
  }
}

export default nextConfig;