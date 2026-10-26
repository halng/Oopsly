import { expect, test } from '../support/fixtures';
import { API, GAME } from '../support/data';
import { envelope } from '../support/wiremock';

const DUE = `${API}/v1/cards/due`;

test.describe('Daily (super) review screen', () => {
    test('loads due cards across every subject and grades them in their own subject', async ({
        page,
        mock,
    }) => {
        await page.goto('/home/super-review');
        await expect(page.getByTestId('flashcard-review-screen')).toBeVisible();
        await expect(page.getByTestId('flashcard-box')).toContainText(
            'Question 1'
        );
        await expect(page.getByText('Cell Biology')).toBeVisible();

        await page.getByTestId('flashcard-box').click();
        await page.getByTestId('btn-grade-3').click();
        const gradeUrl = `${API}/v1/shelves/shelf-1/subjects/subject-1/cards/difficulty`;
        await expect
            .poll(async () => (await mock.requests('PUT', gradeUrl)).length)
            .toBe(1);
        const [grade] = await mock.requests(
            'PUT',
            `${API}/v1/shelves/shelf-1/subjects/subject-1/cards/difficulty`
        );
        expect(grade.json).toEqual([{ cardId: 'card-1', newLevel: 'GOOD' }]);
    });

    test('finishing the queue opens the daily complete screen', async ({
        page,
        mock,
    }) => {
        await page.goto('/home/super-review');
        for (const grade of [3, 4]) {
            await page.getByTestId('flashcard-box').click();
            await page.getByTestId(`btn-grade-${grade}`).click();
        }
        await expect(page).toHaveURL(/\/home\/super-review\/complete$/);
        await expect(page.getByText('Session Completed!')).toBeVisible();
        const [claim] = await mock.requests(
            'POST',
            `${GAME}/v1/game/rewards/review`
        );
        expect(claim.json).toMatchObject({
            cardsReviewed: 2,
            good: 1,
            easy: 1,
        });
    });

    test('nothing due shows the done state and goes back to the library', async ({
        page,
        mock,
    }) => {
        await mock.override({ method: 'GET', path: DUE, body: envelope([]) });
        await page.goto('/home/super-review');
        await expect(page.getByTestId('review-empty')).toBeVisible();
        await page.getByTestId('btn-exit-review').click();
        await expect(page).toHaveURL(/\/home$/);
    });

    test('the complete screen without a session returns home', async ({
        page,
    }) => {
        await page.goto('/home/super-review/complete');
        await expect(page).toHaveURL(/\/home(\/super-review\/complete)?$/);
        await expect(page.getByText('Session Completed!')).toHaveCount(0);
    });
});
