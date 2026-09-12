import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SettingsPage from '@/app/(app)/settings/page';
import { ApiService } from '@/services/api';
import { useUserProfileStore } from '@/store';

const { push, logout } = vi.hoisted(() => ({
    push: vi.fn(),
    logout: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/hooks/useLogout', () => ({ useLogout: () => logout }));
vi.mock('@/services/api', () => ({
    ApiService: {
        getProfile: vi.fn(),
        updateProfile: vi.fn(),
    },
}));
vi.mock('@/components/shared', () => ({
    ThemeModal: ({ isOpen }: { isOpen: boolean }) =>
        isOpen ? <div data-testid="theme-modal" /> : null,
}));

const profile = {
    id: 'u1',
    email: 'learner@example.com',
    displayName: 'Learner',
    bio: 'Hi',
    settings: { dailyGoal: 20, theme: 'ghibli-meadow' },
};

describe('SettingsPage', () => {
    const initialProfileState = useUserProfileStore.getState();

    beforeEach(() => {
        vi.clearAllMocks();
        useUserProfileStore.setState(initialProfileState, true);
        useUserProfileStore.getState().setProfile(profile as never);
        vi.mocked(ApiService.updateProfile).mockResolvedValue({
            isSuccess: true,
            data: profile,
            message: '',
            timestamp: '',
        } as never);
    });

    it('saves profile settings and logs out', async () => {
        render(<SettingsPage />);
        expect(screen.getByTestId('settings-page')).toBeInTheDocument();
        fireEvent.change(screen.getByTestId('input-display-name'), {
            target: { value: 'Forest' },
        });
        fireEvent.click(screen.getByTestId('btn-save-settings'));
        await waitFor(() =>
            expect(ApiService.updateProfile).toHaveBeenCalled()
        );
        fireEvent.click(screen.getByTestId('btn-settings-back'));
        expect(push).toHaveBeenCalledWith('/home');
        fireEvent.click(screen.getByTestId('btn-logout'));
        expect(logout).toHaveBeenCalled();
    });
});
