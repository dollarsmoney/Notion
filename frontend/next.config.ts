import type { NextConfig } from 'next';

const config: NextConfig = {
  // Produces .next/standalone so the runtime image stays small.
  output: 'standalone',
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**.supabase.co' }],
  },
};

export default config;
