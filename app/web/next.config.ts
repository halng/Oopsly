import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    // The integration run keeps its own build dir so it can run beside `pnpm dev`.
    distDir: process.env.NEXT_DIST_DIR || '.next',
    /* config options here */
    experimental: {
        serverComponentsHmrCache: false,
    },
    // pageExtensions: ['page.tsx', 'page.ts', 'page.jsx', 'page.js'].map((ext) => `(?<!\\.test\\.)${ext}`),
};

export default nextConfig;
