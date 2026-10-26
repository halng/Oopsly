import { expect, test } from '../support/fixtures';
import { GAME, garden } from '../support/data';
import { envelope, failure } from '../support/wiremock';

// WireMock speaks HTTP only, so the garden WebSocket is answered in-browser.
test.beforeEach(async ({ page }) => {
    await page.routeWebSocket(/\/game\/v1\/game\/ws/, (ws) => {
        ws.send(
            JSON.stringify({
                type: 'ready',
                requestId: null,
                message: 'Garden socket open',
                data: null,
            })
        );
    });
});

test.describe('Study screen (focus timer and garden)', () => {
    test('starts on the timer with the default 25 minute session', async ({
        page,
    }) => {
        await page.goto('/study');
        await expect(page.getByTestId('study-page')).toBeVisible();
        await expect(page.getByTestId('pomodoro-display')).toHaveText('25:00');
    });

    test('duration buttons reset the clock', async ({ page }) => {
        await page.goto('/study');
        await page.getByTestId('btn-duration-45').click();
        await expect(page.getByTestId('pomodoro-display')).toHaveText('45:00');
        await page.getByTestId('btn-duration-15').click();
        await expect(page.getByTestId('pomodoro-display')).toHaveText('15:00');
    });

    test('start counts down, pause stops it and reset restores it', async ({
        page,
    }) => {
        await page.clock.install();
        await page.goto('/study');
        await page.getByTestId('btn-duration-15').click();
        await page.getByTestId('btn-pomodoro-toggle').click();
        await page.clock.runFor(5000);
        await expect(page.getByTestId('pomodoro-display')).toHaveText('14:55');

        await page.getByTestId('btn-pomodoro-toggle').click();
        await page.clock.runFor(5000);
        await expect(page.getByTestId('pomodoro-display')).toHaveText('14:55');

        await page.getByTestId('btn-pomodoro-reset').click();
        await expect(page.getByTestId('pomodoro-display')).toHaveText('15:00');
    });

    test('finishing a focus session claims a seed pouch and opens the garden', async ({
        page,
        mock,
    }) => {
        await page.clock.install();
        await page.goto('/study');
        await page.getByTestId('btn-duration-15').click();
        await page.getByTestId('btn-pomodoro-toggle').click();
        await page.clock.runFor(15 * 60 * 1000 + 1000);

        await expect(page.getByText('A seed pouch opened.')).toBeVisible();
        const [claim] = await mock.requests(
            'POST',
            `${GAME}/v1/game/rewards/focus`
        );
        expect(claim.json).toEqual({ focusMinutes: 15 });
    });

    test('a failed claim shows the server message and keeps the message for the garden tab', async ({
        page,
        mock,
    }) => {
        await mock.override({
            method: 'POST',
            path: `${GAME}/v1/game/rewards/focus`,
            status: 400,
            body: failure('Focus session too short', 400),
        });
        await page.clock.install();
        await page.goto('/study');
        await page.getByTestId('btn-duration-15').click();
        await page.getByTestId('btn-pomodoro-toggle').click();
        await page.clock.runFor(15 * 60 * 1000 + 1000);
        await expect(page.getByTestId('pomodoro-display')).toHaveText('00:00');
        await page.getByTestId('btn-tab-garden').click();
        await expect(page.getByText('Focus session too short')).toBeVisible();
    });

    test('the garden tab shows the resources loaded from the game API', async ({
        page,
        mock,
    }) => {
        await page.goto('/study');
        await page.getByTestId('btn-tab-garden').click();
        await expect(
            page.getByRole('heading', { name: 'Ghibli Garden' })
        ).toBeVisible();
        await expect(
            page.getByText(
                `Dew ${garden.dewDrops} · Coins ${garden.forestCoins} · Level ${garden.forestLevel}`
            )
        ).toBeVisible();
        const [fetched] = await mock.requests('GET', `${GAME}/v1/game/garden`);
        expect(fetched.headers.Authorization).toBe('Bearer access-jwt');
    });

    test('the garden tab reflects the rewards the API returns', async ({
        page,
        mock,
    }) => {
        await mock.override({
            method: 'GET',
            path: `${GAME}/v1/game/garden`,
            body: envelope({
                ...garden,
                dewDrops: 42,
                forestCoins: 7,
                forestLevel: 3,
            }),
        });
        await page.goto('/study');
        await page.getByTestId('btn-tab-garden').click();
        await expect(
            page.getByText('Dew 42 · Coins 7 · Level 3')
        ).toBeVisible();
    });

    test('shows a message when the garden cannot be loaded', async ({
        page,
        mock,
    }) => {
        await mock.override({
            method: 'GET',
            path: `${GAME}/v1/game/garden`,
            status: 503,
            body: failure('Game service unavailable', 503),
        });
        await page.goto('/study');
        await page.getByTestId('btn-tab-garden').click();
        await expect(page.getByText('Game service unavailable')).toBeVisible();
    });
});
