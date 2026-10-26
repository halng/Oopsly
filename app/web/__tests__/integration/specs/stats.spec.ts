import { expect, test } from '../support/fixtures';
import { API } from '../support/data';
import { failure } from '../support/wiremock';

test.describe('Stats screen', () => {
    test('shows the learning analytics from the API', async ({ page }) => {
        await page.goto('/stats');
        const stats = page.getByTestId('stats-page');
        await expect(
            stats.getByRole('heading', { name: 'Learning Analytics' })
        ).toBeVisible();
        await expect(stats).toContainText('7');
        await expect(stats).toContainText('25%');
        await expect(stats).toContainText('88%');
        await expect(stats).toContainText('340');
        await expect(
            stats.getByRole('heading', { name: 'Card states' })
        ).toBeVisible();
        await expect(
            stats.getByRole('heading', { name: 'Upcoming due' })
        ).toBeVisible();
        await expect(
            stats.getByRole('heading', { name: 'Weekly activity' })
        ).toBeVisible();
        await expect(stats).toContainText('Sat');
    });

    test('falls back to defaults when the stats call fails', async ({
        page,
        mock,
    }) => {
        await mock.override({
            method: 'GET',
            path: `${API}/v1/users/me/stats`,
            status: 500,
            body: failure('down', 500),
        });
        await page.goto('/stats');
        await expect(page.getByTestId('stats-page')).toContainText(
            'Streak days'
        );
        await expect(page.getByTestId('stats-page')).toContainText('0%');
    });

    test('hides the weekly chart when there is no weekly data', async ({
        page,
        mock,
    }) => {
        await mock.override({
            method: 'GET',
            path: `${API}/v1/users/me/stats`,
            body: {
                isSuccess: true,
                statusCode: 200,
                message: 'ok',
                timestamp: 'x',
                data: {
                    streakDays: 0,
                    reviewedToday: 0,
                    dailyGoal: 20,
                    retentionRate: 0,
                    totalReviews: 0,
                    stateDistribution: { new: 0, learning: 0, review: 0 },
                    upcomingDueForecast: [],
                },
            },
        });
        await page.goto('/stats');
        await expect(
            page.getByRole('heading', { name: 'Weekly activity' })
        ).toHaveCount(0);
    });
});
