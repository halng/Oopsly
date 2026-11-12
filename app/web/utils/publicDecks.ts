export const SITE_URL = 'https://www.quizi.tech';

export interface PublicDeckCard {
    front: string;
    back: string;
}

export interface PublicDeck {
    id: string;
    name: string;
    description: string | null;
    totalCards: number;
    updatedAt: string | null;
    cards: PublicDeckCard[];
}

interface Envelope<T> {
    isSuccess: boolean;
    data: T | null;
}

/** Reads a public endpoint on the server; null when it is missing or the API is down. */
async function getPublic<T>(path: string): Promise<T | null> {
    const base = process.env.NEXT_PUBLIC_API_URL;
    if (!base) return null;
    try {
        const res = await fetch(`${base}/public/decks${path}`, {
            next: { revalidate: 3600 },
        });
        if (!res.ok) return null;
        const body = (await res.json()) as Envelope<T>;
        return body.isSuccess ? body.data : null;
    } catch {
        return null;
    }
}

export async function getPublicDeck(id: string) {
    return getPublic<PublicDeck>(`/${encodeURIComponent(id)}`);
}

export async function getPublicDecks(page = 0, size = 100) {
    const data = await getPublic<{
        entities: PublicDeck[];
        hasNextPage: boolean;
    }>(`?page=${page}&size=${size}`);
    return data ?? { entities: [], hasNextPage: false };
}

/** Every public deck, for the sitemap. Capped so a huge catalogue cannot stall the build. */
export async function getAllPublicDecks(maxPages = 50) {
    const decks: PublicDeck[] = [];
    for (let page = 0; page < maxPages; page++) {
        const { entities, hasNextPage } = await getPublicDecks(page, 500);
        decks.push(...entities);
        if (!hasNextPage) break;
    }
    return decks;
}

/** A short plain-text summary for meta descriptions. */
export function deckSummary(deck: PublicDeck) {
    const text =
        deck.description?.trim() ||
        `Study ${deck.name} with ${deck.totalCards} flashcards using spaced repetition on Quizi.`;
    return text.length > 160 ? `${text.slice(0, 157)}...` : text;
}
