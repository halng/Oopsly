import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AuthPage from '@/app/login/page';
import { ApiService } from '@/services/api';
import { useAuthStore } from '@/store';

const { push, setCredentials } = vi.hoisted(() => ({
    push: vi.fn(),
    setCredentials: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/services/api', () => ({
    ApiService: { sendOtp: vi.fn(), verifyOtp: vi.fn() },
}));
vi.mock('@/store', () => ({
    useAuthStore: { getState: () => ({ setCredentials }) },
}));

describe('AuthPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(ApiService.sendOtp).mockResolvedValue({
            isSuccess: true,
            data: null,
            message: '',
            timestamp: '',
        } as never);
        vi.mocked(ApiService.verifyOtp).mockResolvedValue({
            isSuccess: true,
            data: { access_token: 'access', refresh_token: 'refresh' },
            message: '',
            timestamp: '',
        } as never);
    });

    it('renders the login screen and matches its snapshot', () => {
        const { container } = render(<AuthPage />);
        expect(
            screen.getByRole('heading', { name: 'Welcome back' })
        ).toBeInTheDocument();
        expect(
            screen.getByPlaceholderText('name@example.com')
        ).toBeInTheDocument();
        expect(container).toMatchSnapshot();
    });

    it('rejects invalid email input before contacting the API', async () => {
        render(<AuthPage />);
        const email = screen.getByPlaceholderText('name@example.com');
        fireEvent.change(email, { target: { value: 'not-an-email' } });
        fireEvent.submit(email.closest('form')!);
        expect(ApiService.sendOtp).not.toHaveBeenCalled();
    });

    it('requires a name in signup mode and trims the email sent to the API', async () => {
        render(<AuthPage />);
        fireEvent.click(screen.getByRole('button', { name: 'Sign up' }));
        expect(
            screen.getByRole('heading', { name: 'Create an account' })
        ).toBeInTheDocument();
        const email = screen.getByPlaceholderText('name@example.com');
        fireEvent.change(email, { target: { value: ' learner@example.com ' } });
        fireEvent.submit(email.closest('form')!);
        expect(ApiService.sendOtp).not.toHaveBeenCalled();
        expect(screen.getByText('Please enter your name.')).toBeInTheDocument();
        fireEvent.change(screen.getByPlaceholderText('Jane Doe'), {
            target: { value: 'Learner' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: 'Continue with Email' })
        );
        await waitFor(() =>
            expect(ApiService.sendOtp).toHaveBeenCalledWith(
                'learner@example.com'
            )
        );
    });

    it('shows API errors and enforces six numeric OTP characters', async () => {
        vi.mocked(ApiService.sendOtp).mockResolvedValue({
            isSuccess: false,
            data: null,
            message: 'Too many requests',
            timestamp: '',
        } as never);
        render(<AuthPage />);
        const email = screen.getByPlaceholderText('name@example.com');
        fireEvent.change(email, { target: { value: 'learner@example.com' } });
        fireEvent.click(
            screen.getByRole('button', { name: 'Continue with Email' })
        );
        await waitFor(() =>
            expect(screen.getByText('Too many requests')).toBeInTheDocument()
        );
        vi.mocked(ApiService.sendOtp).mockResolvedValue({
            isSuccess: true,
            data: null,
            message: '',
            timestamp: '',
        } as never);
        fireEvent.click(
            screen.getByRole('button', { name: 'Continue with Email' })
        );
        await waitFor(() =>
            expect(screen.getByPlaceholderText('123456')).toBeInTheDocument()
        );
        const otp = screen.getByPlaceholderText('123456');
        fireEvent.change(otp, { target: { value: '12ab34567' } });
        expect(otp).toHaveValue('');
        expect(
            screen.getByText('OTP must be a 6-digit number.')
        ).toBeInTheDocument();
    });

    it('stores credentials and redirects after a successful OTP verification', async () => {
        render(<AuthPage />);
        fireEvent.change(screen.getByPlaceholderText('name@example.com'), {
            target: { value: ' learner@example.com ' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: 'Continue with Email' })
        );
        await waitFor(() =>
            expect(screen.getByPlaceholderText('123456')).toBeInTheDocument()
        );
        fireEvent.change(screen.getByPlaceholderText('123456'), {
            target: { value: '123456' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Verify' }));
        await waitFor(() =>
            expect(setCredentials).toHaveBeenCalledWith(
                'learner@example.com',
                'access',
                'refresh'
            )
        );
        expect(push).toHaveBeenCalledWith('/home');
    });
});
