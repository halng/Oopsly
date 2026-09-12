import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ShelfPage from '@/app/(app)/home/[shelfId]/page';
import { ApiService } from '@/services/api';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push }),
    useParams: () => ({ shelfId: 's1' }),
}));
vi.mock('@/services/api', () => ({
    ApiService: {
        getProfile: vi.fn(),
        getShelves: vi.fn(),
        getShelfSubjects: vi.fn(),
        getStats: vi.fn(),
        createSubject: vi.fn(),
        updateSubject: vi.fn(),
        deleteSubject: vi.fn(),
        updateShelf: vi.fn(),
        updateSettings: vi.fn(),
    },
}));
vi.mock('@/components/shared', () => ({
    ShelfModal: ({ onClose }: { onClose: () => void }) => (
        <button onClick={onClose}>Close shelf modal</button>
    ),
    SubjectModal: ({ onClose }: { onClose: () => void }) => (
        <button onClick={onClose}>Close subject modal</button>
    ),
    ImportCardsModal: () => <div data-testid="import-cards-modal" />,
    CloneSubjectModal: ({ isOpen }: { isOpen: boolean }) =>
        isOpen ? <div data-testid="clone-subject-modal" /> : null,
}));

const profile = {
    id: 'u1',
    email: 'learner@example.com',
    displayName: 'Learner',
    settings: { dailyGoal: 20 },
};
const shelf = {
    id: 's1',
    name: 'Science',
    description: 'Core science',
    isDeleted: false,
};
const subject = {
    id: 'sub1',
    shelfId: 's1',
    title: 'Biology',
    description: 'Cells',
    tags: ['cells'],
    isDeleted: false,
    cardCount: 10,
    dueCount: 2,
    updatedAt: '2026-01-01T00:00:00Z',
};

describe('ShelfPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(ApiService.getProfile).mockResolvedValue({
            isSuccess: true,
            data: profile,
            message: '',
            timestamp: '',
        } as never);
        vi.mocked(ApiService.getShelves).mockResolvedValue({
            isSuccess: true,
            data: [shelf],
            message: '',
            timestamp: '',
        } as never);
        vi.mocked(ApiService.getShelfSubjects).mockResolvedValue({
            isSuccess: true,
            data: [subject],
            message: '',
            timestamp: '',
        } as never);
        vi.mocked(ApiService.getStats).mockResolvedValue({
            isSuccess: true,
            data: { reviewedToday: 2 },
            message: '',
            timestamp: '',
        } as never);
    });

    it('loads shelf subjects and routes study plus back actions', async () => {
        render(<ShelfPage />);
        expect(screen.getByTestId('shelf-page-loading')).toBeInTheDocument();
        await waitFor(() =>
            expect(screen.getByTestId('shelf-page')).toBeInTheDocument()
        );
        expect(screen.getByTestId('subject-card-sub1')).toBeInTheDocument();
        fireEvent.click(screen.getByTestId('btn-review-sub1'));
        fireEvent.click(screen.getByTestId('btn-learn-sub1'));
        fireEvent.click(screen.getByTestId('btn-match-sub1'));
        fireEvent.click(screen.getByTestId('btn-test-sub1'));
        fireEvent.click(screen.getByTestId('btn-quick-shelf-review'));
        fireEvent.click(screen.getByTestId('btn-back-to-shelves'));
        expect(push).toHaveBeenCalledWith('/home/s1/subjects/sub1/review');
        expect(push).toHaveBeenCalledWith('/home/s1/subjects/sub1/learn');
        expect(push).toHaveBeenCalledWith('/home/s1/subjects/sub1/match');
        expect(push).toHaveBeenCalledWith('/home/s1/subjects/sub1/test');
        expect(push).toHaveBeenCalledWith('/home');
    });

    it('opens the create-subject modal from the shelf page', async () => {
        render(<ShelfPage />);
        await waitFor(() =>
            expect(screen.getByTestId('shelf-page')).toBeInTheDocument()
        );
        fireEvent.click(screen.getByTestId('btn-create-subject-in-shelf'));
        expect(screen.getByText('Close subject modal')).toBeInTheDocument();
    });

    it('shows empty state when the shelf has no subjects', async () => {
        vi.mocked(ApiService.getShelfSubjects).mockResolvedValue({
            isSuccess: true,
            data: [],
            message: '',
            timestamp: '',
        } as never);
        render(<ShelfPage />);
        await waitFor(() =>
            expect(screen.getByTestId('shelf-subjects-empty')).toBeInTheDocument()
        );
    });
});
