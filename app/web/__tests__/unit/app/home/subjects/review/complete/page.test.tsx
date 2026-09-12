import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReviewCompletePage from '@/app/(app)/home/[shelfId]/subjects/[subjectId]/review/complete/page';
import { useStudySessionStore } from '@/store';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push }),
    useParams: () => ({ shelfId: 's1', subjectId: 'sub1' }),
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
        });
    });

    it('shows recap stats and routes back', () => {
        render(<ReviewCompletePage />);
        expect(screen.getByTestId('review-complete-page')).toBeInTheDocument();
        expect(screen.getByText('Biology')).toBeInTheDocument();
        fireEvent.click(screen.getByTestId('btn-practice-again'));
        expect(push).toHaveBeenCalledWith('/home/s1/subjects/sub1/review');
        fireEvent.click(screen.getByTestId('btn-return-shelf'));
        expect(push).toHaveBeenCalledWith('/home');
    });
});
