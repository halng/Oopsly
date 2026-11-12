import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_URL, deckSummary, getPublicDecks } from '@/utils/publicDecks';

export const metadata: Metadata = {
    title: 'Free Flashcard Decks — Quizi',
    description:
        'Browse free flashcard decks shared by the Quizi community and study them with spaced repetition.',
    alternates: { canonical: `${SITE_URL}/decks` },
};

export default async function DecksPage() {
    const { entities } = await getPublicDecks(0, 100);

    return (
        <main className="min-h-screen bg-[#FDFBF7] px-6 py-12">
            <div className="mx-auto max-w-3xl">
                <h1 className="text-4xl font-black text-stone-900">
                    Free flashcard decks
                </h1>
                <p className="mt-4 text-lg text-stone-600">
                    Decks shared by the Quizi community. Add any of them to your
                    shelf and study with spaced repetition.
                </p>
                {entities.length === 0 ? (
                    <p className="mt-10 text-stone-500">No public decks yet.</p>
                ) : (
                    <ul className="mt-10 space-y-3">
                        {entities.map((deck) => (
                            <li key={deck.id}>
                                <Link
                                    href={`/decks/${deck.id}`}
                                    className="block rounded-xl border border-stone-200 bg-white p-4 hover:border-stone-400"
                                >
                                    <span className="font-bold text-stone-900">
                                        {deck.name}
                                    </span>
                                    <span className="ml-2 text-sm text-stone-500">
                                        {deck.totalCards} cards
                                    </span>
                                    <p className="mt-1 text-sm text-stone-600">
                                        {deckSummary(deck)}
                                    </p>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </main>
    );
}
