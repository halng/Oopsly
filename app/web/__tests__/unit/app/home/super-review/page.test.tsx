import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SuperReviewPage from '@/app/(user)/home/super-review/page';
import { ApiService } from '@/services/api';
import { GameService } from '@/services/gameApi';
import { card } from '@/__tests__/unit/helpers/studyFixtures';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push }),
}));
vi.mock('@/hooks/useSyncStatus', () => ({
    useSyncStatus: () => ({ isOnline: true }),
}));
vi.mock('@/services/api', () => ({
    ApiService: {
        getDuePracticeCards: vi.fn(),
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
    shelfId: 's1',
    subjectId: 'sub1',
    subjectName: 'Biology',
    repetitions: 2,
    lastReviewedAt: '2026-01-01T00:00:00Z',
});

describe('SuperReviewPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(ApiService.getDuePracticeCards).mockResolvedValue({
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
            data: null,
            message: '',
            statusCode: 200,
            timestamp: '',
        });
    });

    it('reviews every due card and grades it with that card’s shelf', async () => {
        render(<SuperReviewPage />);
        await waitFor(() =>
            expect(
                screen.getByTestId('flashcard-review-screen')
            ).toBeInTheDocument()
        );
        expect(screen.getByText('Biology')).toBeInTheDocument();
        expect(screen.getByText('Daily review')).toBeInTheDocument();
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
            expect(push).toHaveBeenCalledWith('/home/super-review/complete')
        );
    });

    it('shows an empty session when nothing is due', async () => {
        vi.mocked(ApiService.getDuePracticeCards).mockResolvedValue({
            isSuccess: true,
            data: [],
            message: '',
            statusCode: 200,
            timestamp: '',
        });
        render(<SuperReviewPage />);
        await waitFor(() =>
            expect(screen.getByTestId('review-empty')).toBeInTheDocument()
        );
        expect(screen.queryByTestId('btn-review-all')).not.toBeInTheDocument();
    });
});
