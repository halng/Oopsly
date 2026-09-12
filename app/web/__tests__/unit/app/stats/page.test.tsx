import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StatsPage from '@/app/(app)/stats/page';
import { ApiService } from '@/services/api';

vi.mock('@/services/api', () => ({
    ApiService: { getStats: vi.fn() },
}));

describe('StatsPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(ApiService.getStats).mockResolvedValue({
            isSuccess: true,
            data: {
                streakDays: 4,
                reviewedToday: 10,
                dailyGoal: 20,
                retentionRate: 90,
                totalReviews: 40,
                stateDistribution: {
                    new: 1,
                    learning: 2,
                    review: 3,
                    relearning: 0,
                    mastered: 4,
                },
                upcomingDueForecast: [
                    { date: 'Today', dueCount: 5 },
                    { date: '+1d', dueCount: 2 },
                ],
                weeklyActivity: [
                    { day: 'Mon', cardsReviewed: 8, retention: 92 },
                ],
            },
            message: '',
            timestamp: '',
        } as never);
    });

    it('renders loading then analytics metrics', async () => {
        render(<StatsPage />);
        expect(screen.getByTestId('stats-loading')).toBeInTheDocument();
        await waitFor(() =>
            expect(screen.getByTestId('stats-page')).toBeInTheDocument()
        );
        expect(screen.getByText('Learning Analytics')).toBeInTheDocument();
        expect(screen.getByText('50%')).toBeInTheDocument();
        expect(screen.getByText('8 cards')).toBeInTheDocument();
    });
});
