import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Navbar from '@/components/Navbar';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
const syncState = {
    isOnline: true,
    isSyncing: false,
    pendingCount: 0,
    syncNow: vi.fn(),
};
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/services/api', () => ({
    ApiService: {
        getStats: vi.fn().mockResolvedValue({
            isSuccess: true,
            data: { reviewedToday: 20 },
        }),
    },
}));
vi.mock('@/hooks/useSyncStatus', () => ({ useSyncStatus: () => syncState }));
vi.mock('@/components/shared', () => ({
    CalendarModal: ({ onClose }: { onClose: () => void }) => (
        <button onClick={onClose}>Close calendar</button>
    ),
}));
vi.mock('@/store/UserProfile', () => ({
    useUserProfileStore: () => ({
        profile: {
            displayName: 'Learner Example',
            streakDays: 5,
            xp: 100,
            settings: { dailyGoal: 20 },
        },
    }),
}));

describe('Navbar', () => {
    it('renders navigation and updates the daily progress after loading stats', async () => {
        const { container } = render(<Navbar />);
        expect(screen.getByTestId('brand-logo')).toBeInTheDocument();
        expect(screen.getByTestId('streak-badge')).toHaveTextContent('5d');
        await waitFor(() =>
            expect(
                screen.getByTitle('Daily Goal: 20 / 20 cards')
            ).toBeInTheDocument()
        );
        expect(container).toMatchSnapshot();
    });

    it('routes profile, pro, and calendar actions and handles a pending sync state', () => {
        syncState.pendingCount = 2;
        render(<Navbar />);
        fireEvent.click(screen.getByTestId('btn-user-profile'));
        fireEvent.click(screen.getByText('Pro'));
        fireEvent.click(screen.getByTitle('Study Calendar'));
        expect(push).toHaveBeenCalledWith('/settings');
        expect(push).toHaveBeenCalledWith('/subscribe');
        expect(screen.getByText('Close calendar')).toBeInTheDocument();
        fireEvent.click(screen.getByTestId('btn-sync-status'));
        expect(syncState.syncNow).toHaveBeenCalledOnce();
        syncState.pendingCount = 0;
    });
});
