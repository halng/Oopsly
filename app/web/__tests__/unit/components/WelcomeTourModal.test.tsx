import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import WelcomeTourModal from '@/components/WelcomeTourModal';

describe('WelcomeTourModal', () => {
    it('renders the first step and supports skipping', () => {
        const onClose = vi.fn();
        const { container } = render(<WelcomeTourModal onClose={onClose} />);
        expect(
            screen.getByRole('heading', { name: 'Welcome to Oopsly!' })
        ).toBeInTheDocument();
        expect(container).toMatchSnapshot();
        fireEvent.click(screen.getByRole('button', { name: 'Skip Tour' }));
        expect(onClose).toHaveBeenCalledOnce();
    });

    it('moves forward, backward, and closes on the final step', () => {
        const onClose = vi.fn();
        render(<WelcomeTourModal onClose={onClose} />);
        for (let step = 0; step < 5; step += 1)
            fireEvent.click(
                screen.getByRole('button', { name: /Next|Get Started/ })
            );
        expect(
            screen.getByRole('heading', { name: 'Discover & Share' })
        ).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Back' }));
        expect(
            screen.getByRole('heading', { name: 'Mini-Games & Tests' })
        ).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Next' }));
        fireEvent.click(screen.getByRole('button', { name: 'Get Started' }));
        expect(onClose).toHaveBeenCalledOnce();
    });
});
