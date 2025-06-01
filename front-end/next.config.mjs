/** @type {import('next').NextConfig} */
const nextConfig = {
  // Add API rewrites to handle CORS issues (only in development)
  ...(process.env.NODE_ENV === 'development' && {
    async rewrites() {
      return [
        {
          source: '/api/:path*',
          destination: 'https://memedici-backend.onrender.com/:path*',
        },
      ];
    },
  }),
  
  // Force fresh build to clear Netlify cache - 2024-12-19
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

// Only add static export for production builds
if (process.env.NODE_ENV === 'production') {
  nextConfig.output = 'export';
  nextConfig.trailingSlash = true;
  nextConfig.skipTrailingSlashRedirect = true;
}

export default nextConfig;