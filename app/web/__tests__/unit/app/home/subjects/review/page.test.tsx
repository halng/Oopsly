import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReviewPage from '@/app/(app)/home/[shelfId]/subjects/[subjectId]/review/page';
import { ApiService } from '@/services/api';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push }),
    useParams: () => ({ shelfId: 's1', subjectId: 'sub1' }),
}));
vi.mock('@/hooks/useSyncStatus', () => ({
    useSyncStatus: () => ({ isOnline: true }),
}));
vi.mock('@/services/api', () => ({
    ApiService: {
        getSubject: vi.fn(),
        getDueCards: vi.fn(),
        getSubjectCards: vi.fn(),
        gradeCard: vi.fn(),
    },
}));

const card = {
    id: 'c1',
    front: 'Q',
    back: 'A',
    isDeleted: false,
};

describe('ReviewPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(ApiService.getSubject).mockResolvedValue({
            isSuccess: true,
            data: { id: 'sub1', title: 'Biology' },
            message: '',
            timestamp: '',
        } as never);
        vi.mocked(ApiService.getDueCards).mockResolvedValue({
            isSuccess: true,
            data: [card],
            message: '',
            timestamp: '',
        } as never);
        vi.mocked(ApiService.gradeCard).mockResolvedValue({
            isSuccess: true,
            data: card,
            message: '',
            timestamp: '',
        } as never);
    });

    it('loads a due card and grades it', async () => {
        render(<ReviewPage />);
        expect(screen.getByTestId('review-loading')).toBeInTheDocument();
        await waitFor(() =>
            expect(
                screen.getByTestId('flashcard-review-screen')
            ).toBeInTheDocument()
        );
        fireEvent.click(screen.getByTestId('flashcard-box'));
        fireEvent.click(screen.getByTestId('btn-grade-4'));
        await waitFor(() =>
            expect(ApiService.gradeCard).toHaveBeenCalled()
        );
    });

    it('shows empty state when there are no cards', async () => {
        vi.mocked(ApiService.getDueCards).mockResolvedValue({
            isSuccess: true,
            data: [],
            message: '',
            timestamp: '',
        } as never);
        vi.mocked(ApiService.getSubjectCards).mockResolvedValue({
            isSuccess: true,
            data: [],
            message: '',
            timestamp: '',
        } as never);
        render(<ReviewPage />);
        await waitFor(() =>
            expect(screen.getByTestId('review-empty')).toBeInTheDocument()
        );
        fireEvent.click(screen.getByTestId('btn-exit-review'));
        expect(push).toHaveBeenCalledWith('/home/s1/subjects/sub1');
    });
});
