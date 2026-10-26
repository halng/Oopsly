import { expect, test } from '../support/fixtures';
import { API, GAME } from '../support/data';
import { envelope, failure } from '../support/wiremock';

const SUBJECT = `${API}/v1/shelves/shelf-1/subjects/subject-1`;
const REVIEW_URL = '/home/biology/subjects/cell-biology/review';

test.describe('Review screen (spaced repetition)', () => {
    test('loads the due cards with the subject limits', async ({
        page,
        mock,
    }) => {
        await page.goto(REVIEW_URL);
        await expect(page.getByTestId('flashcard-review-screen')).toBeVisible();
        await expect(page.getByTestId('review-counts')).toContainText('2 new');
        await expect(page.getByTestId('flashcard-box')).toContainText(
            'Question 1'
        );

        const [due] = await mock.requests('GET', `${SUBJECT}/cards/due`);
        expect(due.url).toMatch(/limit=\d+/);
    });

    test('grades are hidden until the card is flipped', async ({ page }) => {
        await page.goto(REVIEW_URL);
        await expect(page.getByTestId('btn-grade-3')).toHaveCount(0);
        await page.getByTestId('flashcard-box').click();
        await expect(page.getByTestId('flashcard-answer')).toHaveText(
            'Answer 1'
        );
        for (const grade of [1, 2, 3, 4]) {
            await expect(page.getByTestId(`btn-grade-${grade}`)).toBeVisible();
        }
    });

    test('space flips the card and 3 grades it Good', async ({
        page,
        mock,
    }) => {
        await page.goto(REVIEW_URL);
        await page.getByTestId('flashcard-box').focus();
        await page.keyboard.press('Space');
        await page.keyboard.press('3');

        await expect(page.getByTestId('flashcard-box')).toContainText(
            'Question 2'
        );
        const [grade] = await mock.requests(
            'PUT',
            `${SUBJECT}/cards/difficulty`
        );
        expect(grade.json).toEqual([{ cardId: 'card-1', newLevel: 'GOOD' }]);
    });

    test('grading every card finishes the session and claims a seed pouch', async ({
        page,
        mock,
    }) => {
        await page.goto(REVIEW_URL);
        for (const grade of [4, 3]) {
            await page.getByTestId('flashcard-box').click();
            await page.getByTestId(`btn-grade-${grade}`).click();
        }

        await expect(page).toHaveURL(/\/review\/complete$/);
        await expect(page.getByText('Session Completed!')).toBeVisible();
        await expect(page.getByTestId('complete-xp')).toHaveText('+20');
        await expect(page.getByTestId('complete-accuracy')).toBeVisible();

        const sent = await mock.requests('PUT', `${SUBJECT}/cards/difficulty`);
        expect(
            sent.map(
                (r) => (r.json as unknown as { newLevel: string }[])[0].newLevel
            )
        ).toEqual(['EASY', 'GOOD']);
        const [claim] = await mock.requests(
            'POST',
            `${GAME}/v1/game/rewards/review`
        );
        expect(claim.json).toEqual({
            cardsReviewed: 2,
            again: 0,
            hard: 0,
            good: 1,
            easy: 1,
        });
    });

    test('the complete screen offers another round and the shelf', async ({
        page,
    }) => {
        await page.goto(REVIEW_URL);
        for (const grade of [3, 3]) {
            await page.getByTestId('flashcard-box').click();
            await page.getByTestId(`btn-grade-${grade}`).click();
        }
        await expect(page).toHaveURL(/\/review\/complete$/);
        await page.getByTestId('btn-return-shelf').click();
        await expect(page).toHaveURL(/\/home\/biology$/);
    });

    test('Again keeps the card in the queue', async ({ page, mock }) => {
        await mock.override({
            method: 'PUT',
            path: `${SUBJECT}/cards/difficulty`,
            body: envelope({
                cards: [
                    {
                        id: "{{jsonPath request.body '$[0].cardId'}}",
                        front: 'Question 1',
                        back: 'Answer 1',
                        fsrsRepetitions: 0,
                        fsrsStability: 0.4,
                        nextPracticeTime: '2000-01-01T00:00:00Z',
                    },
                ],
                xpGained: 2,
                totalXp: 1252,
            }),
        });
        await page.goto(REVIEW_URL);
        await page.getByTestId('flashcard-box').click();
        await page.getByTestId('btn-grade-1').click();
        await expect(page).toHaveURL(/\/review$/);
        await expect(page.getByTestId('review-counts')).toBeVisible();
    });

    test('undo puts the previous card back', async ({ page }) => {
        await page.goto(REVIEW_URL);
        await expect(page.getByTestId('btn-undo')).toBeDisabled();
        await page.getByTestId('flashcard-box').click();
        await page.getByTestId('btn-grade-3').click();
        await expect(page.getByTestId('flashcard-box')).toContainText(
            'Question 2'
        );
        await page.getByTestId('btn-undo').click();
        await expect(page.getByTestId('flashcard-box')).toContainText(
            'Question 1'
        );
    });

    test('reveals the hint on the front of the card', async ({ page }) => {
        await page.goto(REVIEW_URL);
        await page.getByTestId('btn-reveal-hint').click();
        await expect(page.getByText('Think of the powerhouse')).toBeVisible();
    });

    test('shows the done state when nothing is due', async ({ page, mock }) => {
        await mock.override({
            method: 'GET',
            path: `${SUBJECT}/cards/due`,
            body: envelope([]),
        });
        await page.goto(REVIEW_URL);
        await expect(page.getByTestId('review-empty')).toContainText(
            'Congratulations, done for today!'
        );
        await page.getByTestId('btn-exit-review').click();
        await expect(page).toHaveURL(/\/subjects\/cell-biology$/);
    });

    test('custom study reviews the whole library when nothing is due', async ({
        page,
        mock,
    }) => {
        await mock.override({
            method: 'GET',
            path: `${SUBJECT}/cards/due`,
            body: envelope([]),
        });
        await page.goto(REVIEW_URL);
        await page.getByTestId('btn-review-all').click();
        await expect(page.getByTestId('flashcard-review-screen')).toBeVisible();
    });

    test('a failed grade request does not advance the card', async ({
        page,
        mock,
    }) => {
        // Known bug: the app advances to the next card and awards fallback XP
        // even though the grade was rejected, so the review is lost silently.
        // test.fail() turns into a failure the day this is fixed.
        test.fail();
        await mock.override({
            method: 'PUT',
            path: `${SUBJECT}/cards/difficulty`,
            status: 500,
            body: failure('Server error', 500),
        });
        await page.goto(REVIEW_URL);
        await page.getByTestId('flashcard-box').click();
        await page.getByTestId('btn-grade-3').click();
        await expect(page.getByTestId('btn-grade-3')).toBeEnabled();
        await expect(page.getByTestId('flashcard-box')).toContainText(
            'Question 1'
        );
    });

    test('an unknown subject shows the not-found state', async ({ page }) => {
        await page.goto('/home/biology/subjects/nope/review');
        await expect(page.getByTestId('review-not-found')).toBeVisible();
    });

    test('opening the complete page without a session goes back to the subject', async ({
        page,
    }) => {
        await page.goto('/home/biology/subjects/cell-biology/review/complete');
        await expect(page).toHaveURL(/\/subjects\/cell-biology$/);
    });
});
