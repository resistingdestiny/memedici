/** @type {import('next').NextConfig} */
const nextConfig = {
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
    ignoreBuildErrors: true
  },
  eslint: {
    ignoreDuringBuilds: true
  },
  webpack: (config, { isServer }) => {
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

    return config;
  }
}

export default nextConfig;