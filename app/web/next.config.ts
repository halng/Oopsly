import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    /* config options here */
    experimental: {
        serverComponentsHmrCache: false,
    },
    // pageExtensions: ['page.tsx', 'page.ts', 'page.jsx', 'page.js'].map((ext) => `(?<!\\.test\\.)${ext}`),
};

export default nextConfig;
