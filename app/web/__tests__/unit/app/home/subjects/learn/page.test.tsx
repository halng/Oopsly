import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LearnPage from '@/app/(app)/home/[shelfId]/subjects/[subjectId]/learn/page';
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

describe('LearnPage', () => {
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

    it('loads learn mode and can close', async () => {
        render(<LearnPage />);
        expect(screen.getByTestId('learn-loading')).toBeInTheDocument();
        await waitFor(() =>
            expect(screen.getByTestId('learn-mode-page')).toBeInTheDocument()
        );
        fireEvent.click(screen.getAllByTestId('btn-learn-option')[0]);
        fireEvent.click(screen.getByTestId('btn-learn-close'));
        expect(push).toHaveBeenCalled();
    });

    it('shows empty state', async () => {
        vi.mocked(ApiService.getSubjectCards).mockResolvedValue({
            isSuccess: true,
            data: [],
            message: '',
            timestamp: '',
        } as never);
        render(<LearnPage />);
        await waitFor(() =>
            expect(screen.getByTestId('learn-empty')).toBeInTheDocument()
        );
    });
});
