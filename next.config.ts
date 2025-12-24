import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    ppr: true,
    clientSegmentCache: true,
    serverActions: {
      allowedOrigins: [
        'improved-memory-69r9wx7wqq5934966-3000.app.github.dev',
        'localhost:3000'
      ]
    }
  }
};

export default nextConfig;
