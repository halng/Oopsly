import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MatchPage from '@/app/(app)/home/[shelfId]/subjects/[subjectId]/match/page';
import { ApiService } from '@/services/api';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push }),
    useParams: () => ({ shelfId: 's1', subjectId: 'sub1' }),
}));
vi.mock('@/services/api', () => ({
    ApiService: {
        getSubject: vi.fn(),
        getSubjectCards: vi.fn(),
    },
}));

describe('MatchPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(ApiService.getSubject).mockResolvedValue({
            isSuccess: true,
            data: { id: 'sub1', title: 'Biology' },
            message: '',
            timestamp: '',
        } as never);
        vi.mocked(ApiService.getSubjectCards).mockResolvedValue({
            isSuccess: true,
            data: [
                { id: 'c1', front: 'Q1', back: 'A1', isDeleted: false },
                { id: 'c2', front: 'Q2', back: 'A2', isDeleted: false },
            ],
            message: '',
            timestamp: '',
        } as never);
    });

    it('loads matching tiles', async () => {
        render(<MatchPage />);
        expect(screen.getByTestId('match-loading')).toBeInTheDocument();
        await waitFor(() =>
            expect(screen.getByTestId('matching-game-page')).toBeInTheDocument()
        );
        fireEvent.click(screen.getByTestId('btn-match-close'));
        expect(push).toHaveBeenCalled();
    });
});
