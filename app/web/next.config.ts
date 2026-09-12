import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    /* config options here */
    experimental: {
        serverComponentsHmrCache: false,
    },
};

export default nextConfig;
