import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AuthenticatedShell from '@/components/AuthenticatedShell';
import { ApiService } from '@/services/api';
import { useUserProfileStore } from '@/store/UserProfile';

vi.mock('next/navigation', () => ({ usePathname: () => '/home' }));
vi.mock('@/components', () => ({ Navbar: () => <nav /> }));
vi.mock('@/components/AuthGuard', () => ({
    default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/services/syncManager', () => ({ syncManager: { init: vi.fn() } }));
vi.mock('@/services/tokenRefresh', () => ({
    startTokenRefreshTimer: () => () => undefined,
}));
vi.mock('@/services/api', () => ({
    ApiService: { getProfile: vi.fn(), getFeatures: vi.fn() },
}));

const withTheme = (theme: string) =>
    ({ settings: { theme, dailyGoal: 20 } }) as never;

describe('AuthenticatedShell theme', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        document.documentElement.removeAttribute('data-theme');
        useUserProfileStore.setState({ profile: null });
        vi.mocked(ApiService.getFeatures).mockResolvedValue({
            isSuccess: false,
        } as never);
    });

    it('applies the theme saved on the account once the profile loads', async () => {
        vi.mocked(ApiService.getProfile).mockResolvedValue({
            isSuccess: true,
            data: withTheme('ghibli-night'),
        } as never);
        render(<AuthenticatedShell>page</AuthenticatedShell>);
        await waitFor(() =>
            expect(document.documentElement.dataset.theme).toBe('ghibli-night')
        );
    });

    it('uses the theme this browser remembers until the profile arrives', () => {
        localStorage.setItem('quizi_theme', 'ghibli-howl');
        vi.mocked(ApiService.getProfile).mockReturnValue(
            new Promise(() => undefined)
        );
        render(<AuthenticatedShell>page</AuthenticatedShell>);
        expect(document.documentElement.dataset.theme).toBe('ghibli-howl');
    });

    it('ignores an account theme the app does not know', async () => {
        localStorage.setItem('quizi_theme', 'ghibli-kiki');
        vi.mocked(ApiService.getProfile).mockResolvedValue({
            isSuccess: true,
            data: withTheme('SYSTEM'),
        } as never);
        render(<AuthenticatedShell>page</AuthenticatedShell>);
        await waitFor(() => expect(ApiService.getProfile).toHaveBeenCalled());
        expect(document.documentElement.dataset.theme).toBe('ghibli-kiki');
    });
});
