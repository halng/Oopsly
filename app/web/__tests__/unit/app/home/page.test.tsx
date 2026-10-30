import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HomePage from '@/app/(user)/home/page';
import { ApiService } from '@/services/api';
import { useUserProfileStore } from '@/store';
import { useToastStore } from '@/store/ToastStore';
import { shelf } from '@/__tests__/unit/helpers/studyFixtures';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/services/api', () => ({
    ApiService: {
        getProfile: vi.fn(),
        getShelves: vi.fn(),
        getStats: vi.fn(),
        createShelf: vi.fn(),
        updateShelf: vi.fn(),
        deleteShelf: vi.fn(),
        updateSettings: vi.fn(),
        updateNewComer: vi.fn(),
    },
}));
vi.mock('@/services/syncManager', () => ({
    syncManager: { init: vi.fn() },
}));
vi.mock('@/components', () => ({
    OfflineSyncBanner: () => <div data-testid="offline-banner" />,
    WelcomeTourModal: ({ onClose }: { onClose: () => void }) => (
        <button onClick={onClose}>Close tour</button>
    ),
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
    JoinGameModal: ({ onClose }: { onClose: () => void }) => (
        <button onClick={onClose}>Close join game</button>
    ),
}));

const profile = {
    id: 'u1',
    email: 'learner@example.com',
    displayName: 'Learner',
    avatarUrl: '',
    streakDays: 3,
    xp: 1200,
    totalReviews: 4,
    settings: { dailyGoal: 20, isNewComer: false },
};

const page = {
    entities: [shelf],
    currentPage: 1,
    totalItems: 1,
    totalPages: 1,
    hasNextPage: false,
};

describe('HomePage', () => {
    const initialProfileState = useUserProfileStore.getState();

    beforeEach(() => {
        vi.clearAllMocks();
        useUserProfileStore.setState(initialProfileState, true);
        vi.mocked(ApiService.getProfile).mockResolvedValue({
            isSuccess: true,
            data: profile,
            message: '',
            statusCode: 200,
            timestamp: '',
        } as never);
        vi.mocked(ApiService.getShelves).mockResolvedValue({
            isSuccess: true,
            data: page,
            message: '',
            statusCode: 200,
            timestamp: '',
        } as never);
        vi.mocked(ApiService.getStats).mockResolvedValue({
            isSuccess: true,
            data: { reviewedToday: 2, dueCards: 4 },
            message: '',
            statusCode: 200,
            timestamp: '',
        } as never);
    });

    it('renders shelves after loading', async () => {
        render(<HomePage />);
        expect(screen.getByText('Loading Oopsly...')).toBeInTheDocument();
        await waitFor(() =>
            expect(screen.getByTestId('shelf-card-s1')).toBeInTheDocument()
        );
        expect(screen.getByText('Science')).toBeInTheDocument();
        expect(
            screen.getByText('4 Total Cards Due for Daily FSRS Review')
        ).toBeInTheDocument();
        fireEvent.click(screen.getByTestId('btn-practise-now'));
        expect(push).toHaveBeenCalledWith('/home/super-review');
    });

    it('shows the empty shelf state when the API returns no shelves', async () => {
        vi.mocked(ApiService.getShelves).mockResolvedValue({
            isSuccess: true,
            data: { ...page, entities: [], totalItems: 0 },
            message: '',
            statusCode: 200,
            timestamp: '',
        } as never);
        render(<HomePage />);
        await waitFor(() =>
            expect(screen.getByText('No shelves found')).toBeInTheDocument()
        );
        expect(screen.getByTestId('btn-create-shelf')).toBeInTheDocument();
    });

    it('filters shelves and opens the create-shelf modal', async () => {
        render(<HomePage />);
        await waitFor(() =>
            expect(screen.getByTestId('shelf-card-s1')).toBeInTheDocument()
        );
        fireEvent.change(screen.getByPlaceholderText('Search shelves...'), {
            target: { value: 'missing' },
        });
        expect(screen.getByText('No shelves found')).toBeInTheDocument();
        fireEvent.click(
            screen.getByRole('button', { name: 'Create New Shelf' })
        );
        expect(screen.getByText('Close shelf modal')).toBeInTheDocument();
    });

    it('saves a clamped daily goal through the API', async () => {
        vi.mocked(ApiService.updateSettings).mockResolvedValue({
            isSuccess: true,
            data: { dailyGoal: 1 },
            message: '',
            statusCode: 200,
            timestamp: '',
        } as never);
        render(<HomePage />);
        await waitFor(() =>
            expect(screen.getByTitle('Edit Daily Goal')).toBeInTheDocument()
        );
        fireEvent.click(screen.getByTitle('Edit Daily Goal'));
        fireEvent.change(screen.getByRole('spinbutton'), {
            target: { value: '-5' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        await waitFor(() =>
            expect(ApiService.updateSettings).toHaveBeenCalledWith({
                dailyGoal: 1,
            })
        );
        expect(useToastStore.getState().toasts[0]).toMatchObject({
            kind: 'success',
            title: 'Daily goal updated',
        });
    });

    it('opens a shelf by slug', async () => {
        render(<HomePage />);
        await waitFor(() =>
            expect(screen.getByTestId('shelf-card-s1')).toBeInTheDocument()
        );
        fireEvent.click(screen.getByTestId('shelf-card-s1'));
        expect(push).toHaveBeenCalledWith('/home/science');
        expect(screen.getByTestId('btn-view-shelf-s1')).toBeInTheDocument();
    });

    it('opens the join-game placeholder from the library view', async () => {
        render(<HomePage />);
        await waitFor(() =>
            expect(screen.getByTestId('btn-join-game')).toBeInTheDocument()
        );
        fireEvent.click(screen.getByTestId('btn-join-game'));
        expect(screen.getByText('Close join game')).toBeInTheDocument();
    });
});
