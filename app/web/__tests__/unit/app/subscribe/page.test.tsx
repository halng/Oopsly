import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SubscribePage from '@/app/(app)/subscribe/page';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

describe('SubscribePage', () => {
    beforeEach(() => vi.clearAllMocks());

    it('toggles billing, shows demo checkout, and returns home', async () => {
        render(<SubscribePage />);
        expect(screen.getByTestId('subscribe-page')).toBeInTheDocument();
        fireEvent.click(screen.getByTestId('btn-billing-monthly'));
        expect(screen.getByText('$9.99')).toBeInTheDocument();
        fireEvent.click(screen.getByTestId('btn-subscribe-pro'));
        await waitFor(() =>
            expect(
                screen.getByTestId('subscribe-demo-message')
            ).toBeInTheDocument()
        );
        fireEvent.click(screen.getByTestId('btn-subscribe-back'));
        expect(push).toHaveBeenCalledWith('/home');
    });
});
