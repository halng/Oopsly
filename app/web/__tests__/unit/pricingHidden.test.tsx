import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LandingPage from '@/app/page';
import SubscribePage from '@/app/(user)/subscribe/page';
import HostGameModal from '@/components/shared/HostGameModal';
import { useFeaturesStore } from '@/store/Features';

// The real pricing switch is used here: it is off unless NEXT_PUBLIC_SHOW_PRICING=true.
const { push, replace } = vi.hoisted(() => ({
    push: vi.fn(),
    replace: vi.fn(),
}));
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push, replace }),
}));
vi.mock('@/services/api', () => ({ ApiService: {} }));

describe('pricing is hidden by default', () => {
    it('leaves the pricing section and its links off the landing page', () => {
        render(<LandingPage />);
        expect(screen.queryByText('Plans & pricing')).toBeNull();
        expect(screen.queryByTestId('landing-plan-pro')).toBeNull();
        expect(screen.queryByRole('link', { name: 'Pricing' })).toBeNull();
        expect(screen.queryByText(/change plans/i)).toBeNull();
        expect(screen.queryByText(/Basic plan/i)).toBeNull();
    });

    it('sends anyone who opens the subscribe page back home', async () => {
        const { container } = render(<SubscribePage />);
        await waitFor(() => expect(replace).toHaveBeenCalledWith('/home'));
        expect(container).toBeEmptyDOMElement();
    });

    it('does not point free users at plans from the host dialog', () => {
        useFeaturesStore.setState({ flags: { 'game.create': false } });
        render(
            <HostGameModal
                shelfId="s"
                testSuite={{ id: 't', title: 'T', questionCount: 1 } as never}
                onClose={vi.fn()}
            />
        );
        expect(screen.getByTestId('host-game-upgrade')).toHaveTextContent(
            'not available on your account'
        );
        expect(screen.queryByTestId('btn-host-game-upgrade')).toBeNull();
    });
});
