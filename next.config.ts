import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      // Redirect www to non-www
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'www.meetmatt.xyz',
          },
        ],
        destination: 'https://meetmatt.xyz/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
