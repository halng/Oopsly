import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AppLayout from '@/app/(app)/layout';

const { pathname } = vi.hoisted(() => ({ pathname: { current: '/home' } }));

vi.mock('next/navigation', () => ({
    usePathname: () => pathname.current,
    useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));
vi.mock('@/store', () => ({
    useAuthStore: (selector: (state: { accessToken: string }) => unknown) =>
        selector({ accessToken: 'token' }),
}));
vi.mock('@/services/syncManager', () => ({
    syncManager: { init: vi.fn() },
}));
vi.mock('@/components', () => ({
    Navbar: () => <nav data-testid="navbar">Navigation</nav>,
}));

describe('AppLayout', () => {
    it('renders navigation before the protected page content', async () => {
        pathname.current = '/home';
        const { container } = render(
            <AppLayout>
                <div>Home content</div>
            </AppLayout>
        );
        expect(screen.getByTestId('navbar')).toBeInTheDocument();
        expect(screen.getByText('Home content')).toBeInTheDocument();
        expect(container).toMatchSnapshot();
    });

    it('hides the navbar on fullscreen study session routes', async () => {
        pathname.current = '/home/s1/subjects/sub1/review';
        render(
            <AppLayout>
                <div>Review session</div>
            </AppLayout>
        );
        await waitFor(() =>
            expect(screen.getByText('Review session')).toBeInTheDocument()
        );
        expect(screen.queryByTestId('navbar')).not.toBeInTheDocument();
    });
});
