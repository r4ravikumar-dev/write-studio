import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  // The shared package ships TypeScript source (packages/shared).
  transpilePackages: ['@studio/shared'],
};

export default nextConfig;
