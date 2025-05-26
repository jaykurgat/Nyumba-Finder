import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false, // Set to false to see all TypeScript errors during build
  },
  eslint: {
    ignoreDuringBuilds: false, // Set to false to see all ESLint errors during build
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co', // For placeholder images
        port: '',
        pathname: '/**',
      },
      // If you use Firebase Storage for image uploads in the future, add its hostname here.
      // e.g., firebasestorage.googleapis.com
    ],
  },
};

export default nextConfig;
