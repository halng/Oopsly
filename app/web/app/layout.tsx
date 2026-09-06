import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Playfair_Display } from 'next/font/google';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700', '800'],
    variable: '--font-plus-jakarta-sans',
});

const playfairDisplay = Playfair_Display({
    subsets: ['latin'],
    weight: ['600', '700'],
    variable: '--font-playfair-display',
});

export const metadata: Metadata = {
    title: 'Oopsly — Active Recall & Spaced Repetition Flashcards',
    description:
        'Master any subject with Oopsly. A cross-platform flashcard app combining the scientifically-proven FSRS spaced repetition algorithm with a relaxing, gamified Ghibli-inspired forest sanctuary.',
    keywords: [
        'spaced repetition',
        'flashcards',
        'active recall',
        'FSRS',
        'study app',
        'gamified learning',
        'pomodoro',
        'memory',
    ],
    authors: [{ name: 'Oopsly' }],
    alternates: {
        canonical: 'https://oopsly.app/',
    },
    openGraph: {
        type: 'website',
        url: 'https://oopsly.app/',
        title: 'Oopsly — Active Recall & Spaced Repetition Flashcards',
        description:
            'Master any subject with Oopsly. Combine the proven FSRS spaced repetition algorithm with a relaxing, gamified Ghibli-inspired forest sanctuary.',
    },
    twitter: {
        card: 'summary_large_image',
        site: 'https://oopsly.app/',
        title: 'Oopsly — Active Recall & Spaced Repetition Flashcards',
        description:
            'Master any subject with Oopsly. Combine the proven FSRS spaced repetition algorithm with a relaxing, gamified Ghibli-inspired forest sanctuary.',
    },
};

// ─── Layout ────────────────────────────────────────────────────────────────
export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html
            lang="en"
            className={`${plusJakartaSans.variable} ${playfairDisplay.variable} h-full antialiased`}
        >
            <body
                className={`${plusJakartaSans.variable} ${playfairDisplay.variable} min-h-full flex flex-col`}
            >
                {children}
            </body>
        </html>
    );
}
