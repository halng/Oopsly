import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    // The integration run keeps its own build dir so it can run beside `pnpm dev`.
    distDir: process.env.NEXT_DIST_DIR || '.next',
    // Docker sets NEXT_OUTPUT=standalone for a minimal runtime image; Vercel and dev ignore it.
    output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
    /* config options here */
    experimental: {
        serverComponentsHmrCache: false,
    },
    // pageExtensions: ['page.tsx', 'page.ts', 'page.jsx', 'page.js'].map((ext) => `(?<!\\.test\\.)${ext}`),
};

export default nextConfig;
