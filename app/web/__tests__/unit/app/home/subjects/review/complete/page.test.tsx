import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReviewCompletePage from '@/app/(user)/home/[slug]/subjects/[subSlug]/review/complete/page';
import { useStudySessionStore } from '@/store';
import { subjectContext } from '@/__tests__/unit/helpers/studyFixtures';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push, replace: push }),
    useParams: () => ({ slug: 'science', subSlug: 'biology' }),
}));
vi.mock('next/dynamic', () => ({
    default: (importer: () => Promise<{ default: React.ComponentType }>) => {
        const Lazy = React.lazy(importer);
        return function DynamicComponent(props: Record<string, unknown>) {
            return (
                <React.Suspense fallback={null}>
                    <Lazy {...props} />
                </React.Suspense>
            );
        };
    },
}));
vi.mock('@/hooks/useSubjectContext', () => ({
    useSubjectContext: () => subjectContext,
}));
vi.mock('@/components/garden/PouchReveal', () => ({
    default: ({ species, rarity }: { species: string; rarity: string }) => (
        <div data-testid="seed-pouch">
            {species} {rarity}
        </div>
    ),
}));

describe('ReviewCompletePage', () => {
    const initial = useStudySessionStore.getState();

    beforeEach(() => {
        vi.clearAllMocks();
        useStudySessionStore.setState(initial, true);
        useStudySessionStore.getState().setLastReview({
            totalReviewed: 4,
            xpEarned: 40,
            gradeCounts: { 1: 0, 2: 1, 3: 2, 4: 1 },
            timeSpentSeconds: 60,
            subjectTitle: 'Biology',
            subjectId: 'sub1',
            shelfId: 's1',
            pouch: {
                species: 'cherry_blossom',
                rarity: 'Rare',
                dewDropsGained: 4,
                sunlightOrbsGained: 0,
                forestCoinsGained: 2,
                growthPointsGained: 8,
                xpGained: 0,
                garden: {} as never,
            },
        });
    });

    it('shows recap stats and routes back', async () => {
        render(<ReviewCompletePage />);
        expect(screen.getByTestId('review-complete-page')).toBeInTheDocument();
        expect(screen.getByTestId('study-confetti')).toBeInTheDocument();
        expect(screen.getByText('Biology')).toBeInTheDocument();
        expect(screen.getByTestId('complete-xp')).toHaveTextContent('+40');
        expect(await screen.findByTestId('seed-pouch')).toHaveTextContent(
            'cherry_blossom'
        );
        fireEvent.click(screen.getByTestId('btn-practice-again'));
        expect(push).toHaveBeenCalledWith(
            '/home/science/subjects/biology/review'
        );
        fireEvent.click(screen.getByTestId('btn-return-shelf'));
        expect(push).toHaveBeenCalledWith('/home/science');
    });

    it('redirects when there is no last review', () => {
        useStudySessionStore.getState().clearLastReview();
        render(<ReviewCompletePage />);
        expect(
            screen.getByTestId('review-complete-redirect')
        ).toBeInTheDocument();
    });
});
