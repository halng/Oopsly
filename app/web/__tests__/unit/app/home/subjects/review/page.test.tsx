import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReviewPage from '@/app/(user)/home/[slug]/subjects/[subSlug]/review/page';
import { ApiService } from '@/services/api';
import { GameService } from '@/services/gameApi';
import { card, subjectContext } from '@/__tests__/unit/helpers/studyFixtures';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push }),
    useParams: () => ({ slug: 'science', subSlug: 'biology' }),
}));
vi.mock('@/hooks/useSyncStatus', () => ({
    useSyncStatus: () => ({ isOnline: true }),
}));
vi.mock('@/hooks/useSubjectContext', () => ({
    useSubjectContext: () => subjectContext,
}));
vi.mock('@/services/api', () => ({
    ApiService: {
        getDueCards: vi.fn(),
        getSubjectCards: vi.fn(),
        gradeCard: vi.fn(),
    },
}));
vi.mock('@/services/gameApi', () => ({
    GameService: {
        claimReview: vi.fn(),
    },
}));

const due = card({
    id: 'c1',
    front: 'Q',
    back: 'A',
    hint: 'think',
    repetitions: 2,
    lastReviewedAt: '2026-01-01T00:00:00Z',
});

describe('ReviewPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(ApiService.getDueCards).mockResolvedValue({
            isSuccess: true,
            data: [due],
            message: '',
            statusCode: 200,
            timestamp: '',
        });
        vi.mocked(ApiService.gradeCard).mockResolvedValue({
            isSuccess: true,
            data: { card: due, xpGained: 20, totalXp: 40 },
            message: '',
            statusCode: 200,
            timestamp: '',
        });
        vi.mocked(GameService.claimReview).mockResolvedValue({
            isSuccess: true,
            data: {
                species: 'wildflower_meadow',
                rarity: 'Common',
                dewDropsGained: 1,
                sunlightOrbsGained: 0,
                forestCoinsGained: 1,
                growthPointsGained: 2,
                xpGained: 0,
                garden: {} as never,
            },
            message: '',
            statusCode: 200,
            timestamp: '',
        });
    });

    it('loads a due card and grades it Easy', async () => {
        render(<ReviewPage />);
        expect(screen.getByTestId('review-loading')).toBeInTheDocument();
        await waitFor(() =>
            expect(
                screen.getByTestId('flashcard-review-screen')
            ).toBeInTheDocument()
        );
        expect(screen.getByTestId('review-progress')).toBeInTheDocument();
        expect(screen.getByTestId('flashcard-flip-hint')).toBeInTheDocument();
        fireEvent.click(screen.getByTestId('flashcard-box'));
        fireEvent.click(screen.getByTestId('btn-grade-4'));
        await waitFor(() =>
            expect(ApiService.gradeCard).toHaveBeenCalledWith(
                's1',
                'sub1',
                'c1',
                4
            )
        );
        await waitFor(() =>
            expect(GameService.claimReview).toHaveBeenCalledWith({
                cardsReviewed: 1,
                again: 0,
                hard: 0,
                good: 0,
                easy: 1,
            })
        );
    });

    it('shows the done-for-today screen and offers a cram of every card', async () => {
        vi.mocked(ApiService.getDueCards).mockResolvedValue({
            isSuccess: true,
            data: [],
            message: '',
            statusCode: 200,
            timestamp: '',
        });
        vi.mocked(ApiService.getSubjectCards).mockResolvedValue({
            isSuccess: true,
            data: {
                entities: [due],
                currentPage: 1,
                totalItems: 1,
                totalPages: 1,
                hasNextPage: false,
            },
            message: '',
            statusCode: 200,
            timestamp: '',
        });
        render(<ReviewPage />);
        await waitFor(() =>
            expect(screen.getByTestId('review-empty')).toBeInTheDocument()
        );
        await waitFor(() =>
            expect(screen.getByTestId('study-confetti')).toBeInTheDocument()
        );
        fireEvent.click(screen.getByTestId('btn-review-all'));
        await waitFor(() =>
            expect(
                screen.getByTestId('flashcard-review-screen')
            ).toBeInTheDocument()
        );
    });
});
