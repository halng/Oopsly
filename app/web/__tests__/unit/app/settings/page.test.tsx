import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SettingsPage from '@/app/(user)/settings/page';
import { ApiService } from '@/services/api';
import { useUserProfileStore } from '@/store';
import { useToastStore } from '@/store/ToastStore';

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
        sendStudyReminder: vi.fn(),
        getStudyReminderCalendar: vi.fn(),
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
        useToastStore.setState({ toasts: [] });
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

    it('confirms with a toast once the settings are saved', async () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByTestId('btn-save-settings'));
        await waitFor(() =>
            expect(useToastStore.getState().toasts[0]).toMatchObject({
                kind: 'success',
                title: 'Settings saved',
            })
        );
    });

    it('does not claim success when saving fails', async () => {
        vi.mocked(ApiService.updateProfile).mockResolvedValue({
            isSuccess: false,
            data: null,
            message: 'nope',
            timestamp: '',
        } as never);
        render(<SettingsPage />);
        fireEvent.click(screen.getByTestId('btn-save-settings'));
        await waitFor(() =>
            expect(ApiService.updateProfile).toHaveBeenCalled()
        );
        expect(useToastStore.getState().toasts).toEqual([]);
    });

    it('shows the email but does not let the user edit it', () => {
        render(<SettingsPage />);
        const email = screen.getByTestId('input-email');
        expect(email).toHaveValue('learner@example.com');
        expect(email).toHaveAttribute('readonly');
    });

    it('emails the calendar event for the chosen days and time', async () => {
        localStorage.clear();
        useUserProfileStore.getState().setProfile({
            ...profile,
            settings: { ...profile.settings, allowReminders: true },
        } as never);
        vi.mocked(ApiService.sendStudyReminder).mockResolvedValue({
            isSuccess: true,
            data: null,
            message: '',
            timestamp: '',
        } as never);
        render(<SettingsPage />);

        // Default is Mon-Fri; add Sunday, drop Friday, change the time.
        fireEvent.click(screen.getByTestId('btn-reminder-day-0'));
        fireEvent.click(screen.getByTestId('btn-reminder-day-5'));
        fireEvent.change(screen.getByTestId('input-reminder-time'), {
            target: { value: '07:30' },
        });
        fireEvent.click(screen.getByTestId('btn-send-reminder'));

        await waitFor(() =>
            expect(ApiService.sendStudyReminder).toHaveBeenCalledWith(
                [0, 1, 2, 3, 4],
                '07:30',
                expect.any(String)
            )
        );
        await waitFor(() =>
            expect(useToastStore.getState().toasts[0]).toMatchObject({
                kind: 'success',
                title: 'Reminder sent',
            })
        );
    });

    it('cannot send a reminder with no days picked', () => {
        localStorage.setItem(
            'oopsly.studyReminder',
            JSON.stringify({ days: [], time: '18:00' })
        );
        useUserProfileStore.getState().setProfile({
            ...profile,
            settings: { ...profile.settings, allowReminders: true },
        } as never);
        render(<SettingsPage />);
        expect(screen.getByTestId('btn-send-reminder')).toBeDisabled();
        localStorage.clear();
    });

    it('hides the schedule when reminders are off', () => {
        render(<SettingsPage />);
        expect(screen.queryByTestId('study-reminder-panel')).toBeNull();
    });

    it('downloads the calendar file instead of emailing it', async () => {
        localStorage.clear();
        useUserProfileStore.getState().setProfile({
            ...profile,
            settings: { ...profile.settings, allowReminders: true },
        } as never);
        vi.mocked(ApiService.getStudyReminderCalendar).mockResolvedValue({
            isSuccess: true,
            data: { filename: 'study.ics', ics: 'BEGIN:VCALENDAR' },
            message: '',
            timestamp: '',
        } as never);
        const createObjectURL = vi.fn(() => 'blob:x');
        const revokeObjectURL = vi.fn();
        Object.assign(URL, { createObjectURL, revokeObjectURL });
        const click = vi
            .spyOn(HTMLAnchorElement.prototype, 'click')
            .mockImplementation(() => {});

        render(<SettingsPage />);
        fireEvent.click(screen.getByTestId('btn-download-reminder'));

        await waitFor(() => expect(click).toHaveBeenCalled());
        expect(ApiService.getStudyReminderCalendar).toHaveBeenCalledWith(
            [1, 2, 3, 4, 5],
            '18:00',
            expect.any(String)
        );
        expect(ApiService.sendStudyReminder).not.toHaveBeenCalled();
        expect(revokeObjectURL).toHaveBeenCalledWith('blob:x');
        expect(useToastStore.getState().toasts[0]).toMatchObject({
            title: 'Calendar file downloaded',
        });
        click.mockRestore();
    });

    it('does not download anything when generating the file fails', async () => {
        localStorage.clear();
        useUserProfileStore.getState().setProfile({
            ...profile,
            settings: { ...profile.settings, allowReminders: true },
        } as never);
        vi.mocked(ApiService.getStudyReminderCalendar).mockResolvedValue({
            isSuccess: false,
            data: null,
            message: 'bad',
            timestamp: '',
        } as never);
        render(<SettingsPage />);
        fireEvent.click(screen.getByTestId('btn-download-reminder'));
        await waitFor(() =>
            expect(ApiService.getStudyReminderCalendar).toHaveBeenCalled()
        );
        expect(useToastStore.getState().toasts).toEqual([]);
    });

    it('links to the upgrade page', () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByTestId('btn-upgrade-pro'));
        expect(push).toHaveBeenCalledWith('/subscribe');
    });
});
