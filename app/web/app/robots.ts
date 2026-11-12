import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: [
                '/home',
                '/discover',
                '/leaderboard',
                '/settings',
                '/stats',
                '/study',
                '/subscribe',
                '/game',
            ],
        },
        sitemap: 'https://www.quizi.tech/sitemap.xml',
    };
}
