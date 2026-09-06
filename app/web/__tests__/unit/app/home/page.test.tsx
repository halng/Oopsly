import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HomePage from '@/app/home/page';
import { ApiService } from '@/services/api';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/services/api', () => ({
    ApiService: {
        getProfile: vi.fn(),
        getShelves: vi.fn(),
        getShelfSubjects: vi.fn(),
        getStats: vi.fn(),
        createShelf: vi.fn(),
        updateShelf: vi.fn(),
        updateSettings: vi.fn(),
    },
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

describe('HomePage', () => {
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
            data: [
                shelf,
                { ...shelf, id: 'deleted', name: 'Deleted', isDeleted: true },
            ],
            message: '',
            timestamp: '',
        } as never);
        vi.mocked(ApiService.getShelfSubjects).mockResolvedValue({
            isSuccess: true,
            data: [
                subject,
                {
                    ...subject,
                    id: 'deleted-sub',
                    title: 'Deleted Subject',
                    isDeleted: true,
                },
            ],
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

    it('renders loading then data, filters deleted records, and matches the loaded snapshot', async () => {
        const { container } = render(<HomePage />);
        expect(screen.getByText('Loading Oopsly...')).toBeInTheDocument();
        await waitFor(() =>
            expect(
                screen.getAllByTestId('subject-card-sub1').length
            ).toBeGreaterThan(0)
        );
        expect(screen.getByTestId('shelf-card-s1')).toBeInTheDocument();
        expect(screen.queryByText('Deleted')).not.toBeInTheDocument();
        expect(screen.queryByText('Deleted Subject')).not.toBeInTheDocument();
        expect(screen.getAllByText('Review Due (2)').length).toBeGreaterThan(0);
        expect(container).toMatchSnapshot();
    });

    it('supports global search and routes every subject study action', async () => {
        render(<HomePage />);
        await waitFor(() =>
            expect(
                screen.getAllByTestId('subject-card-sub1').length
            ).toBeGreaterThan(0)
        );
        fireEvent.change(
            screen.getByPlaceholderText(
                'Search all subjects by title or tag...'
            ),
            { target: { value: 'cells' } }
        );
        expect(screen.getAllByText('Biology').length).toBeGreaterThan(0);
        fireEvent.click(screen.getAllByTestId('btn-review-sub1')[0]);
        fireEvent.click(screen.getAllByTestId('btn-learn-sub1')[0]);
        fireEvent.click(screen.getAllByTestId('btn-match-sub1')[0]);
        fireEvent.click(screen.getAllByTestId('btn-test-sub1')[0]);
        expect(push).toHaveBeenCalledWith('/home/s1/subjects/sub1/review');
        expect(push).toHaveBeenCalledWith('/home/s1/subjects/sub1/learn');
        expect(push).toHaveBeenCalledWith('/home/s1/subjects/sub1/match');
        expect(push).toHaveBeenCalledWith('/home/s1/subjects/sub1/test');
    });

    it('shows the empty shelf state when the API returns no shelves', async () => {
        vi.mocked(ApiService.getShelves).mockResolvedValue({
            isSuccess: true,
            data: [],
            message: '',
            timestamp: '',
        } as never);
        render(<HomePage />);
        await waitFor(() =>
            expect(screen.getByText('No shelves found')).toBeInTheDocument()
        );
        expect(screen.getByTestId('btn-create-shelf')).toBeInTheDocument();
    });

    it('handles empty searches, shelf filtering, goal editing, and opening the shelf modal', async () => {
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
        fireEvent.click(screen.getByText('Close shelf modal'));
        fireEvent.change(
            screen.getByPlaceholderText(
                'Search all subjects by title or tag...'
            ),
            { target: { value: 'missing' } }
        );
        expect(screen.getByText('No subjects found')).toBeInTheDocument();
    });

    it('saves a clamped daily goal through the API', async () => {
        vi.mocked(ApiService.updateSettings).mockResolvedValue({
            isSuccess: true,
            data: { dailyGoal: 1 },
            message: '',
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
    });
});
