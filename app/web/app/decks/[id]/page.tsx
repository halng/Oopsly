import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SITE_URL, deckSummary, getPublicDeck } from '@/utils/publicDecks';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    const deck = await getPublicDeck(id);
    if (!deck)
        return { title: 'Deck not found — Quizi', robots: { index: false } };
    const title = `${deck.name} — Flashcards | Quizi`;
    const description = deckSummary(deck);
    return {
        title,
        description,
        alternates: { canonical: `${SITE_URL}/decks/${deck.id}` },
        openGraph: {
            type: 'article',
            url: `${SITE_URL}/decks/${deck.id}`,
            title,
            description,
        },
        twitter: { card: 'summary_large_image', title, description },
    };
}

export default async function DeckPage({ params }: Props) {
    const { id } = await params;
    const deck = await getPublicDeck(id);
    if (!deck) notFound();

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'LearningResource',
        name: deck.name,
        description: deckSummary(deck),
        url: `${SITE_URL}/decks/${deck.id}`,
        learningResourceType: 'Flashcards',
        dateModified: deck.updatedAt ?? undefined,
        provider: { '@type': 'Organization', name: 'Quizi', url: SITE_URL },
    };

    return (
        <main className="min-h-screen bg-[#FDFBF7] px-6 py-12">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
                }}
            />
            <article className="mx-auto max-w-3xl">
                <nav className="mb-6 text-sm text-stone-500">
                    <Link href="/" className="hover:text-stone-900">
                        Quizi
                    </Link>{' '}
                    /{' '}
                    <Link href="/decks" className="hover:text-stone-900">
                        Decks
                    </Link>
                </nav>
                <h1 className="text-4xl font-black text-stone-900">
                    {deck.name}
                </h1>
                {deck.description && (
                    <p className="mt-4 text-lg text-stone-600">
                        {deck.description}
                    </p>
                )}
                <p className="mt-2 text-sm text-stone-500">
                    {deck.totalCards} flashcards
                </p>
                <Link
                    href="/login"
                    className="mt-6 inline-block rounded-xl bg-[var(--theme-accent)] px-6 py-3 font-bold text-white"
                >
                    Study this deck for free
                </Link>

                <h2 className="mt-12 text-2xl font-black text-stone-900">
                    Preview cards
                </h2>
                <ol className="mt-4 space-y-3">
                    {deck.cards.map((card, i) => (
                        <li
                            key={i}
                            className="rounded-xl border border-stone-200 bg-white p-4"
                        >
                            <p className="font-bold text-stone-900">
                                {card.front}
                            </p>
                            <p className="mt-1 text-stone-600">{card.back}</p>
                        </li>
                    ))}
                </ol>
                {deck.totalCards > deck.cards.length && (
                    <p className="mt-6 text-stone-500">
                        and {deck.totalCards - deck.cards.length} more cards.
                        Sign in to add the full deck to your shelf.
                    </p>
                )}
            </article>
        </main>
    );
}
