import { expect, test } from '../support/fixtures';
import { API, GAME } from '../support/data';
import { envelope, failure } from '../support/wiremock';

const SUITE = `${API}/v1/shelves/shelf-1/test-suites/suite-1`;

test.describe('Test suite screen (question bank)', () => {
    test('lists the questions with their answers', async ({ page }) => {
        await page.goto('/home/biology/tests/midterm-quiz');
        await expect(page.getByTestId('test-suite-page')).toBeVisible();
        await expect(
            page.getByRole('heading', { name: 'Midterm Quiz' })
        ).toBeVisible();
        await expect(page.getByTestId('question-row-q-1')).toContainText(
            'Which organelle makes ATP?'
        );
        await expect(page.getByTestId('question-row-q-2')).toContainText(
            'DNA is found in the nucleus.'
        );
    });

    test('take test opens the attempt screen', async ({ page }) => {
        await page.goto('/home/biology/tests/midterm-quiz');
        await page.getByTestId('btn-take-test').click();
        await expect(page).toHaveURL(/\/tests\/midterm-quiz\/take$/);
    });

    test('back returns to the shelf', async ({ page }) => {
        await page.goto('/home/biology/tests/midterm-quiz');
        await page.getByTestId('btn-test-suite-back').click();
        await expect(page).toHaveURL(/\/home\/biology$/);
    });

    test('searches questions', async ({ page }) => {
        await page.goto('/home/biology/tests/midterm-quiz');
        await page.getByTestId('search-questions-input').fill('ATP');
        await expect(page.getByTestId('question-row-q-1')).toBeVisible();
        await expect(page.getByTestId('question-row-q-2')).toHaveCount(0);
    });

    test('adds a single-choice question', async ({ page, mock }) => {
        await page.goto('/home/biology/tests/midterm-quiz');
        await page.getByTestId('btn-add-question').click();
        await page
            .getByTestId('question-text-input')
            .fill('Where is DNA copied?');
        await page.getByTestId('question-option-input-0').fill('Nucleus');
        await page.getByTestId('question-option-input-1').fill('Cytoplasm');
        await page.getByTestId('question-option-correct-0').click();
        await page.getByTestId('btn-save-question').click();

        await expect
            .poll(
                async () =>
                    (await mock.requests('POST', `${SUITE}/questions`)).length
            )
            .toBe(1);
        const [created] = await mock.requests('POST', `${SUITE}/questions`);
        expect(created.json).toMatchObject({
            text: 'Where is DNA copied?',
            type: 'SINGLE_CHOICE',
            options: ['Nucleus', 'Cytoplasm'],
            correctOptionIndex: 0,
        });
    });

    test('edits a question with PUT', async ({ page, mock }) => {
        await page.goto('/home/biology/tests/midterm-quiz');
        await page.getByTestId('btn-edit-question-q-1').click();
        await page
            .getByTestId('question-text-input')
            .fill('Which organelle produces ATP?');
        await page.getByTestId('btn-save-question').click();

        await expect
            .poll(
                async () =>
                    (await mock.requests('PUT', `${SUITE}/questions/q-1`))
                        .length
            )
            .toBe(1);
        const [put] = await mock.requests('PUT', `${SUITE}/questions/q-1`);
        expect(put.json).toMatchObject({
            text: 'Which organelle produces ATP?',
        });
    });

    test('deleting asks for confirmation first', async ({ page, mock }) => {
        await page.goto('/home/biology/tests/midterm-quiz');

        page.once('dialog', (dialog) => void dialog.dismiss());
        await page.getByTestId('btn-delete-question-q-1').click();
        expect(
            await mock.requests('PATCH', `${SUITE}/questions/q-1`)
        ).toHaveLength(0);

        page.once('dialog', (dialog) => {
            expect(dialog.message()).toBe('Delete this question?');
            void dialog.accept();
        });
        await page.getByTestId('btn-delete-question-q-1').click();
        await expect
            .poll(
                async () =>
                    (await mock.requests('PATCH', `${SUITE}/questions/q-1`))
                        .length
            )
            .toBe(1);
    });

    test('shows the empty state for a suite without questions', async ({
        page,
        mock,
    }) => {
        await mock.override({
            method: 'GET',
            path: `${SUITE}/questions`,
            body: envelope([]),
        });
        await page.goto('/home/biology/tests/midterm-quiz');
        await expect(page.getByTestId('questions-empty')).toBeVisible();
    });

    test('an unknown suite slug shows not-found', async ({ page }) => {
        await page.goto('/home/biology/tests/missing-suite');
        await expect(page.getByTestId('test-suite-not-found')).toBeVisible();
    });
});

test.describe('Take test screen', () => {
    test('answers every question, submits and shows the breakdown', async ({
        page,
        mock,
    }) => {
        await page.goto('/home/biology/tests/midterm-quiz/take');
        await expect(page.getByTestId('take-test-page')).toBeVisible();
        await expect(page.getByTestId('question-prompt')).toHaveText(
            'Which organelle makes ATP?'
        );
        await page.getByText('Mitochondria', { exact: true }).click();
        await page.getByTestId('btn-next-question').click();
        await page.getByTestId('answer-true-false-0').click();
        await page.getByTestId('btn-submit-test').click();

        await expect(page.getByTestId('test-results')).toBeVisible();
        await expect(page.getByTestId('test-results-summary')).toContainText(
            '1 / 2 correct'
        );
        await expect(page.getByTestId('test-results-summary')).toContainText(
            'You scored 50%'
        );
        await expect(page.getByTestId('breakdown-q-1')).toContainText(
            'Your answer'
        );
        await expect(page.getByTestId('breakdown-q-2')).toContainText(
            'Correct answer'
        );

        const [submit] = await mock.requests('POST', `${SUITE}/submit`);
        expect(submit.json).toMatchObject({ answers: { 'q-1': 0, 'q-2': 0 } });
        // A test result also claims a seed pouch from the game service.
        const [claim] = await mock.requests(
            'POST',
            `${GAME}/v1/game/rewards/test`
        );
        expect(claim.json).toEqual({ percentage: 50 });
    });

    test('warns about unanswered questions before submitting', async ({
        page,
        mock,
    }) => {
        await page.goto('/home/biology/tests/midterm-quiz/take');
        await page.getByTestId('btn-next-question').click();

        const messages: string[] = [];
        page.once('dialog', (dialog) => {
            messages.push(dialog.message());
            void dialog.dismiss();
        });
        await page.getByTestId('btn-submit-test').click();
        await expect
            .poll(() => messages)
            .toEqual(['You have 2 unanswered question(s). Submit anyway?']);
        expect(await mock.requests('POST', `${SUITE}/submit`)).toHaveLength(0);
    });

    test('the question navigator jumps between questions', async ({ page }) => {
        await page.goto('/home/biology/tests/midterm-quiz/take');
        await page.getByTestId('nav-question-1').click();
        await expect(page.getByTestId('question-prompt')).toHaveText(
            'DNA is found in the nucleus.'
        );
        await page.getByTestId('btn-prev-question').click();
        await expect(page.getByTestId('question-prompt')).toHaveText(
            'Which organelle makes ATP?'
        );
    });

    test('keeps the attempt open and shows the error when submit fails', async ({
        page,
        mock,
    }) => {
        await mock.override({
            method: 'POST',
            path: `${SUITE}/submit`,
            status: 500,
            body: failure('Could not grade the test', 500),
        });
        await page.goto('/home/biology/tests/midterm-quiz/take');
        await page.getByTestId('btn-next-question').click();
        page.once('dialog', (dialog) => void dialog.accept());
        await page.getByTestId('btn-submit-test').click();

        await expect(page.getByTestId('take-test-submit-error')).toHaveText(
            'Could not grade the test'
        );
        await expect(page.getByTestId('btn-submit-test')).toBeEnabled();
    });

    test('shows an error when the suite has no questions', async ({
        page,
        mock,
    }) => {
        await mock.override({
            method: 'GET',
            path: `${SUITE}/attempt`,
            body: envelope({
                testSuiteId: 'suite-1',
                title: 'Midterm Quiz',
                timeLimitSeconds: null,
                questions: [],
            }),
        });
        await page.goto('/home/biology/tests/midterm-quiz/take');
        await expect(page.getByTestId('take-test-error')).toContainText(
            'no questions'
        );
    });
});
