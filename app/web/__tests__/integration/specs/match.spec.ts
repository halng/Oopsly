import { expect, test } from '../support/fixtures';
import { API } from '../support/data';
import { envelope } from '../support/wiremock';

const SESSIONS = `${API}/v1/shelves/shelf-1/subjects/subject-1/study-sessions`;
const MATCH_URL = '/home/biology/subjects/cell-biology/match';
const pair = (n: number) => [
    `match-tile-front-card-${n}`,
    `match-tile-back-card-${n}`,
];

test.describe('Match screen', () => {
    test('deals a front and back tile for every card', async ({ page }) => {
        await page.goto(MATCH_URL);
        await expect(page.getByTestId('match-progress')).toHaveText(
            'Matched: 0 / 3'
        );
        for (const n of [1, 2, 3]) {
            for (const id of pair(n))
                await expect(page.getByTestId(id)).toBeVisible();
        }
    });

    test('a wrong pair counts a mistake and clears again', async ({ page }) => {
        await page.goto(MATCH_URL);
        await page.getByTestId('match-tile-front-card-1').click();
        await page.getByTestId('match-tile-back-card-2').click();
        await expect(page.getByTestId('match-mistakes')).toHaveText(
            'Mistakes: 1'
        );
        await expect(page.getByTestId('match-progress')).toHaveText(
            'Matched: 0 / 3'
        );
    });

    test('matching every pair finishes the game, logs it and stores the best time', async ({
        page,
        mock,
    }) => {
        await page.goto(MATCH_URL);
        for (const n of [1, 2, 3]) {
            const [front, back] = pair(n);
            await page.getByTestId(front).click();
            await page.getByTestId(back).click();
        }

        await expect(page.getByText('New best time!')).toBeVisible();
        await expect(page.getByText('+25 XP')).toBeVisible();
        await expect
            .poll(async () => (await mock.requests('POST', SESSIONS)).length)
            .toBe(1);
        const [logged] = await mock.requests('POST', SESSIONS);
        expect(logged.json).toMatchObject({
            mode: 'MATCH',
            totalItems: 3,
            mistakes: 0,
        });
        const best = await page.evaluate(() =>
            localStorage.getItem('oopsly:match-best:subject-1')
        );
        expect(Number(best)).toBeGreaterThan(0);
    });

    test('play again deals a fresh board', async ({ page }) => {
        await page.goto(MATCH_URL);
        for (const n of [1, 2, 3]) {
            const [front, back] = pair(n);
            await page.getByTestId(front).click();
            await page.getByTestId(back).click();
        }
        await page.getByTestId('btn-match-restart').click();
        await expect(page.getByTestId('match-progress')).toHaveText(
            'Matched: 0 / 3'
        );
    });

    test('close returns to the subject', async ({ page }) => {
        await page.goto(MATCH_URL);
        await page.getByRole('button', { name: 'Close' }).click();
        await expect(page).toHaveURL(/\/subjects\/cell-biology$/);
    });

    test('needs at least two cards', async ({ page, mock }) => {
        await mock.override({
            method: 'GET',
            path: `${API}/v1/shelves/shelf-1/subjects/subject-1/cards`,
            body: envelope({
                entities: [],
                currentPage: 1,
                totalItems: 0,
                totalPages: 1,
                hasNextPage: false,
            }),
        });
        await page.goto(MATCH_URL);
        await expect(page.getByTestId('match-empty')).toContainText(
            'at least 2 cards'
        );
    });

    test('an unknown subject shows not-found', async ({ page }) => {
        await page.goto('/home/biology/subjects/nope/match');
        await expect(page.getByTestId('match-not-found')).toBeVisible();
    });
});
