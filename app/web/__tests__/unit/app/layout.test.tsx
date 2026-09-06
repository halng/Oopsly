import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RootLayout, { metadata } from '@/app/layout'; // Update path if necessary

// Mock Next.js font optimization to return predictable CSS variable strings
vi.mock('next/font/google', () => ({
    Plus_Jakarta_Sans: () => ({
        variable: '--font-plus-jakarta-sans-mock',
    }),
    Playfair_Display: () => ({
        variable: '--font-playfair-display-mock',
    }),
}));

describe('RootLayout', () => {
    it('renders correctly with required attributes and children (Snapshot)', () => {
        // Render the layout with a dummy child component
        const { container } = render(
            <RootLayout>
                <div data-testid="child-element">Oopsly Content</div>
            </RootLayout>
        );

        expect(container).toMatchSnapshot();
        expect(screen.getByTestId('child-element')).toBeInTheDocument();
        expect(screen.getByText('Oopsly Content')).toBeInTheDocument();
    });

    it('exports the correct SEO metadata', () => {
        // Verify the object exists
        expect(metadata).toBeDefined();

        // Verify core meta tags
        expect(metadata.title).toBe(
            'Oopsly — Active Recall & Spaced Repetition Flashcards'
        );
        expect(metadata.description).toContain(
            'Master any subject with Oopsly'
        );

        // Verify keywords array contains expected terms
        expect(metadata.keywords).toContain('FSRS');
        expect(metadata.keywords).toContain('spaced repetition');

        // Verify OpenGraph configuration
        expect(metadata.openGraph).toMatchObject({
            type: 'website',
            url: 'https://oopsly.app/',
            title: 'Oopsly — Active Recall & Spaced Repetition Flashcards',
        });

        // Verify Twitter configuration
        expect(metadata.twitter).toMatchObject({
            card: 'summary_large_image',
            site: 'https://oopsly.app/',
        });

        // Verify canonical link
        expect(metadata.alternates?.canonical).toBe('https://oopsly.app/');
    });
});
