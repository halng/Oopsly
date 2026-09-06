import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LandingPage from '@/app/page';

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// 1. Mock the Next.js App Router
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush,
    }),
}));

describe('LandingPage', () => {
    afterEach(() => {
        cleanup();
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders correctly (Snapshot)', () => {
        const { container } = render(<LandingPage />);
        expect(container).toMatchSnapshot();
    });

    it('renders the core marketing copy and features', () => {
        render(<LandingPage />);

        expect(
            screen.getByRole('heading', {
                name: /Master any subject with spaced repetition/i,
            })
        ).toBeInTheDocument();
        expect(
            screen.getByText(/Learn Faster, Remember Longer/i)
        ).toBeInTheDocument();

        // Check Features section
        expect(screen.getByText('Why choose Oopsly?')).toBeInTheDocument();
        expect(screen.getByText('FSRS Algorithm')).toBeInTheDocument();
        expect(screen.getByText('Gamified Garden')).toBeInTheDocument();
        expect(screen.getByText('Learn Anywhere')).toBeInTheDocument();
    });

    it('navigates to /login when the header "Get Started" button is clicked', async () => {
        const user = userEvent.setup();
        render(<LandingPage />);

        // Locate the specific button in the header
        const headerButton = screen.getByRole('button', {
            name: /get started/i,
        });
        expect(headerButton).toBeInTheDocument();

        // Simulate a real user click
        await user.click(headerButton);

        // Verify the router was called with the correct path
        expect(mockPush).toHaveBeenCalledTimes(1);
        expect(mockPush).toHaveBeenCalledWith('/login');
    });

    it('navigates to /login when the hero "Start Learning for Free" button is clicked', async () => {
        const user = userEvent.setup();
        render(<LandingPage />);

        // Locate the specific button in the hero section
        const heroButton = screen.getByTestId('start-learning-button');
        expect(heroButton).toBeInTheDocument();

        // Simulate a real user click
        await user.click(heroButton);

        // Verify the router was called with the correct path
        expect(mockPush).toHaveBeenCalledTimes(1);
        expect(mockPush).toHaveBeenCalledWith('/login');
    });
});
