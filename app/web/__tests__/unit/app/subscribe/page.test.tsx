import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SubscribePage from '@/app/(user)/subscribe/page';
import { ApiService } from '@/services/api';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/services/tokenRefresh', () => ({
    refreshSession: vi.fn().mockResolvedValue(true),
}));
vi.mock('@/services/api', () => ({
    ApiService: {
        getBillingPlans: vi.fn(),
        getMySubscription: vi.fn(),
        createCheckout: vi.fn(),
        openBillingPortal: vi.fn(),
    },
}));

const ok = (data: unknown) => ({ isSuccess: true, data }) as never;
const PRICES = [
    { plan: 'PRO', interval: 'month', amount: 999, currency: 'usd' },
    { plan: 'PRO', interval: 'year', amount: 7999, currency: 'usd' },
    { plan: 'PRO_PLUS', interval: 'month', amount: 1999, currency: 'usd' },
    { plan: 'PRO_PLUS', interval: 'year', amount: 17999, currency: 'usd' },
];
const assign = vi.fn();

describe('SubscribePage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.history.replaceState({}, '', '/subscribe');
        Object.defineProperty(window, 'location', {
            configurable: true,
            value: { ...window.location, assign, search: '' },
        });
        vi.mocked(ApiService.getBillingPlans).mockResolvedValue(
            ok({ enabled: true, plans: PRICES })
        );
        vi.mocked(ApiService.getMySubscription).mockResolvedValue(
            ok({ plan: 'FREE', status: 'ACTIVE', expiresAt: null })
        );
    });

    it('shows the prices Stripe reports and switches billing period', async () => {
        render(<SubscribePage />);
        expect(await screen.findByText('$79.99')).toBeInTheDocument();
        expect(screen.getByTestId('price-PRO_PLUS')).toHaveTextContent(
            '$179.99'
        );
        fireEvent.click(screen.getByTestId('btn-billing-monthly'));
        expect(screen.getByTestId('price-PRO')).toHaveTextContent('$9.99');
        expect(screen.getByTestId('price-FREE')).toHaveTextContent('$0.00');
    });

    it('sends the user to Stripe Checkout for the chosen plan and period', async () => {
        vi.mocked(ApiService.createCheckout).mockResolvedValue(
            ok({ url: 'https://stripe.test/pay' })
        );
        render(<SubscribePage />);
        await screen.findByText('$79.99');
        fireEvent.click(screen.getByTestId('btn-billing-monthly'));
        fireEvent.click(screen.getByTestId('btn-subscribe-PRO'));
        await waitFor(() =>
            expect(assign).toHaveBeenCalledWith('https://stripe.test/pay')
        );
        expect(ApiService.createCheckout).toHaveBeenCalledWith('PRO', 'month');
    });

    it('shows the reason when checkout cannot start', async () => {
        vi.mocked(ApiService.createCheckout).mockResolvedValue({
            isSuccess: false,
            data: null,
            message: 'You are already on this plan',
        } as never);
        render(<SubscribePage />);
        await screen.findByText('$79.99');
        fireEvent.click(screen.getByTestId('btn-subscribe-PRO_PLUS'));
        expect(
            await screen.findByText('You are already on this plan')
        ).toBeInTheDocument();
        expect(assign).not.toHaveBeenCalled();
    });

    it('marks the current plan and offers billing to paying users', async () => {
        vi.mocked(ApiService.getMySubscription).mockResolvedValue(
            ok({ plan: 'PRO', status: 'ACTIVE', expiresAt: null })
        );
        vi.mocked(ApiService.openBillingPortal).mockResolvedValue(
            ok({ url: 'https://stripe.test/portal' })
        );
        render(<SubscribePage />);
        await waitFor(() =>
            expect(screen.getByTestId('btn-plan-PRO')).toHaveTextContent(
                'Current plan'
            )
        );
        expect(screen.queryByTestId('btn-subscribe-PRO_PLUS')).toBeNull();
        fireEvent.click(screen.getAllByTestId('btn-manage-billing')[0]);
        await waitFor(() =>
            expect(assign).toHaveBeenCalledWith('https://stripe.test/portal')
        );
    });

    it('says coming soon while payments are off', async () => {
        vi.mocked(ApiService.getBillingPlans).mockResolvedValue(
            ok({ enabled: false, plans: [] })
        );
        render(<SubscribePage />);
        await waitFor(() =>
            expect(screen.getByTestId('btn-subscribe-PRO')).toHaveTextContent(
                'Coming soon'
            )
        );
        expect(screen.getByTestId('btn-subscribe-PRO')).toBeDisabled();
        expect(screen.getByTestId('price-PRO')).toHaveTextContent('—');
    });

    it('thanks the user after paying and refreshes their plan', async () => {
        Object.defineProperty(window, 'location', {
            configurable: true,
            value: { ...window.location, assign, search: '?checkout=success' },
        });
        render(<SubscribePage />);
        expect(await screen.findByTestId('subscribe-notice')).toHaveTextContent(
            'Thank you'
        );
        const { refreshSession } = await import('@/services/tokenRefresh');
        await waitFor(() => expect(refreshSession).toHaveBeenCalled());
    });

    it('goes back home', () => {
        render(<SubscribePage />);
        fireEvent.click(screen.getByTestId('btn-subscribe-back'));
        expect(push).toHaveBeenCalledWith('/home');
    });
});
