import type { Page } from '@playwright/test';
import { expect, test } from '../support/fixtures';
import { API } from '../support/data';
import { envelope, failure } from '../support/wiremock';

const SESSIONS = `${API}/v1/shelves/shelf-1/subjects/subject-1/study-sessions`;
const LEARN_URL = '/home/biology/subjects/cell-biology/learn';
const ANSWERS: Record<string, string> = {
    'Question 1': 'Answer 1',
    'Question 2': 'Answer 2',
    'Question 3': 'Answer 3',
};

/** Answer every question correctly until the "done" screen appears. */
async function playToTheEnd(page: Page) {
    for (let step = 0; step < 40; step++) {
        if (await page.getByTestId('btn-learn-restart').isVisible()) return;
        if (await page.getByTestId('learn-round-summary').isVisible()) {
            await page.getByTestId('btn-learn-next-round').click();
        } else if (await page.getByTestId('btn-learn-next').isVisible()) {
            await page.getByTestId('btn-learn-next').click();
        } else if (await page.getByTestId('learn-prompt').isVisible()) {
            const answer =
                ANSWERS[
                    (await page.getByTestId('learn-prompt').innerText()).trim()
                ];
            if (await page.getByTestId('learn-written-input').isVisible()) {
                await page.getByTestId('learn-written-input').fill(answer);
                await page.getByTestId('btn-learn-submit').click();
            } else {
                await page
                    .getByTestId('btn-learn-option')
                    .filter({ hasText: new RegExp(`${answer}$`) })
                    .click();
            }
        } else {
            await page.waitForTimeout(100);
        }
    }
    throw new Error('Learn session did not finish');
}

test.describe('Learn screen', () => {
    test('asks multiple choice first, with the right answer among the options', async ({
        page,
    }) => {
        await page.goto(LEARN_URL);
        const prompt = (
            await page.getByTestId('learn-prompt').innerText()
        ).trim();
        const options = page.getByTestId('btn-learn-option');
        await expect(options).not.toHaveCount(0);
        await expect(
            options.filter({ hasText: new RegExp(`${ANSWERS[prompt]}$`) })
        ).toHaveCount(1);
    });

    test('a wrong multiple choice answer reveals the correct one', async ({
        page,
    }) => {
        await page.goto(LEARN_URL);
        const prompt = (
            await page.getByTestId('learn-prompt').innerText()
        ).trim();
        const wrong = page
            .getByTestId('btn-learn-option')
            .filter({ hasNotText: new RegExp(`${ANSWERS[prompt]}$`) });
        await wrong.first().click();
        await expect(page.getByTestId('learn-feedback')).toContainText(
            'Not quite.'
        );
        await expect(page.getByTestId('learn-feedback')).toContainText(
            `Correct answer: ${ANSWERS[prompt]}`
        );
        // "I was right" only exists for typed answers.
        await expect(page.getByTestId('btn-learn-override')).toHaveCount(0);
    });

    test('finishing the session logs it and shows the XP earned', async ({
        page,
        mock,
    }) => {
        await page.goto(LEARN_URL);
        await playToTheEnd(page);

        await expect(
            page
                .getByText(/3 correct answers, 0 mistakes\./)
                .or(page.getByText(/correct answers, 0 mistakes/))
        ).toBeVisible();
        await expect
            .poll(async () => (await mock.requests('POST', SESSIONS)).length)
            .toBe(1);
        const [logged] = await mock.requests('POST', SESSIONS);
        expect(logged.json).toMatchObject({
            mode: 'LEARN',
            mistakes: 0,
            totalItems: 3,
        });
        await expect(page.getByText('+25 XP')).toBeVisible();
    });

    test('close returns to the subject', async ({ page }) => {
        await page.goto(LEARN_URL);
        await page.getByRole('button', { name: 'Close' }).click();
        await expect(page).toHaveURL(/\/subjects\/cell-biology$/);
    });

    test('explains the minimum when the subject has too few cards', async ({
        page,
        mock,
    }) => {
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
        await page.goto(LEARN_URL);
        await expect(page.getByTestId('learn-empty')).toContainText(
            'needs at least 2 cards'
        );
    });

    test('still finishes when logging the session fails', async ({
        page,
        mock,
    }) => {
        await mock.override({
            method: 'POST',
            path: SESSIONS,
            status: 500,
            body: failure('boom', 500),
        });
        await page.goto(LEARN_URL);
        await playToTheEnd(page);
        await expect(page.getByTestId('btn-learn-restart')).toBeVisible();
    });

    test('an unknown subject shows not-found', async ({ page }) => {
        await page.goto('/home/biology/subjects/nope/learn');
        await expect(page.getByTestId('learn-not-found')).toBeVisible();
    });
});
