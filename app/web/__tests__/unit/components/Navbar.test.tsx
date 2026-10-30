import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Navbar from '@/components/Navbar';

const { push, pathname } = vi.hoisted(() => ({
    push: vi.fn(),
    pathname: { current: '/home' },
}));
const syncState = {
    isOnline: true,
    isSyncing: false,
    pendingCount: 0,
    syncNow: vi.fn(),
};
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push }),
    usePathname: () => pathname.current,
}));
vi.mock('@/services/api', () => ({
    ApiService: {
        getStats: vi.fn().mockResolvedValue({
            isSuccess: true,
            data: { reviewedToday: 20 },
        }),
    },
}));
vi.mock('@/hooks/useSyncStatus', () => ({ useSyncStatus: () => syncState }));
const logout = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/useLogout', () => ({ useLogout: () => logout }));
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

    it('shows only the account menu next to the counters', () => {
        render(<Navbar />);
        expect(screen.queryByTitle('Study Calendar')).toBeNull();
        expect(screen.queryByTitle('Settings')).toBeNull();
        expect(screen.queryByText('Pro')).toBeNull();
        expect(screen.queryByTestId('user-menu')).toBeNull();
    });

    it('opens the menu with Profile and Log out', () => {
        render(<Navbar />);
        fireEvent.click(screen.getByTestId('btn-user-profile'));
        expect(screen.getAllByRole('menuitem')).toHaveLength(2);

        fireEvent.click(screen.getByTestId('menu-profile'));
        expect(push).toHaveBeenCalledWith('/settings');
        expect(screen.queryByTestId('user-menu')).toBeNull();

        fireEvent.click(screen.getByTestId('btn-user-profile'));
        fireEvent.click(screen.getByTestId('menu-logout'));
        expect(logout).toHaveBeenCalledOnce();
    });

    it('closes the menu on Escape and on an outside click', () => {
        render(<Navbar />);
        fireEvent.click(screen.getByTestId('btn-user-profile'));
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(screen.queryByTestId('user-menu')).toBeNull();

        fireEvent.click(screen.getByTestId('btn-user-profile'));
        fireEvent.mouseDown(document.body);
        expect(screen.queryByTestId('user-menu')).toBeNull();
    });

    it('handles a pending sync state', () => {
        syncState.pendingCount = 2;
        render(<Navbar />);
        fireEvent.click(screen.getByTestId('btn-sync-status'));
        expect(syncState.syncNow).toHaveBeenCalledOnce();
        syncState.pendingCount = 0;
    });

    it('marks the current navbar destination as active', () => {
        pathname.current = '/stats';
        render(<Navbar />);
        expect(screen.getByTestId('nav-stats')).toHaveStyle({
            color: 'var(--theme-accent)',
        });
        pathname.current = '/home';
    });
});
