import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Playfair_Display } from 'next/font/google';
import './globals.css';
import ToastViewport from '@/components/shared/ToastViewport';

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
    metadataBase: new URL('https://www.quizi.tech'),
    applicationName: 'Quizi',
    title: 'Quizi — Active Recall & Spaced Repetition Flashcards',
    description:
        'Master any subject with Quizi. A cross-platform flashcard app combining the scientifically-proven FSRS spaced repetition algorithm with a relaxing, gamified Ghibli-inspired forest sanctuary.',
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
    authors: [{ name: 'Quizi' }],
    alternates: {
        canonical: 'https://www.quizi.tech/',
    },
    openGraph: {
        type: 'website',
        url: 'https://www.quizi.tech/',
        siteName: 'Quizi',
        locale: 'en_US',
        title: 'Quizi — Active Recall & Spaced Repetition Flashcards',
        description:
            'Master any subject with Quizi. Combine the proven FSRS spaced repetition algorithm with a relaxing, gamified Ghibli-inspired forest sanctuary.',
    },
    robots: { index: true, follow: true },
    twitter: {
        card: 'summary_large_image',
        site: 'https://www.quizi.tech/',
        title: 'Quizi — Active Recall & Spaced Repetition Flashcards',
        description:
            'Master any subject with Quizi. Combine the proven FSRS spaced repetition algorithm with a relaxing, gamified Ghibli-inspired forest sanctuary.',
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
                <ToastViewport />
            </body>
        </html>
    );
}
