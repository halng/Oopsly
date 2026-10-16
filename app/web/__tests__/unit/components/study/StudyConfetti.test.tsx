import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import StudyConfetti from '@/components/study/StudyConfetti';

describe('StudyConfetti', () => {
    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('renders pieces and clears them after the burst', () => {
        vi.useFakeTimers();
        render(<StudyConfetti />);
        expect(screen.getByTestId('study-confetti')).toBeInTheDocument();
        act(() => {
            vi.advanceTimersByTime(4000);
        });
        expect(screen.queryByTestId('study-confetti')).not.toBeInTheDocument();
    });

    it('skips the burst when reduced motion is preferred', () => {
        vi.stubGlobal(
            'matchMedia',
            vi.fn().mockReturnValue({
                matches: true,
                addListener: vi.fn(),
                removeListener: vi.fn(),
            })
        );
        render(<StudyConfetti />);
        expect(screen.queryByTestId('study-confetti')).not.toBeInTheDocument();
    });
});
