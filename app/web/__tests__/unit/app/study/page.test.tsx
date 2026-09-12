import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StudyPage from '@/app/(app)/study/page';
import { getInitialGardenState } from '@/utils/gardenData';

vi.mock('@/utils/gardenData', async () => {
    const actual = await vi.importActual<typeof import('@/utils/gardenData')>(
        '@/utils/gardenData'
    );
    return {
        ...actual,
        loadGardenState: () => actual.getInitialGardenState(),
        saveGardenState: vi.fn(),
    };
});

describe('StudyPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders pomodoro controls and switches to the garden tab', () => {
        render(<StudyPage />);
        expect(screen.getByTestId('study-page')).toBeInTheDocument();
        expect(screen.getByTestId('pomodoro-display')).toHaveTextContent(
            '25:00'
        );
        fireEvent.click(screen.getByTestId('btn-duration-15'));
        expect(screen.getByTestId('pomodoro-display')).toHaveTextContent(
            '15:00'
        );
        fireEvent.click(screen.getByTestId('btn-tab-garden'));
        expect(screen.getByText('Ghibli Garden')).toBeInTheDocument();
        expect(screen.getByTestId('garden-plot-5')).toBeInTheDocument();
        expect(getInitialGardenState().plots).toHaveLength(16);
    });
});
