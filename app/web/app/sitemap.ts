import type { MetadataRoute } from 'next';
import { SITE_URL, getAllPublicDecks } from '@/utils/publicDecks';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const decks = await getAllPublicDecks();
    return [
        { url: `${SITE_URL}/`, changeFrequency: 'weekly', priority: 1 },
        { url: `${SITE_URL}/decks`, changeFrequency: 'daily', priority: 0.8 },
        ...decks.map((deck) => ({
            url: `${SITE_URL}/decks/${deck.id}`,
            lastModified: deck.updatedAt ?? undefined,
            changeFrequency: 'weekly' as const,
            priority: 0.6,
        })),
    ];
}
