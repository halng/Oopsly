import { expect, test } from '../support/fixtures';
import {
    API,
    cardRes,
    questions,
    shelf,
    subject,
    testSuite,
} from '../support/data';
import { envelope } from '../support/wiremock';

const SHELVES = `${API}/v1/shelves`;
const SUBJECTS = `${API}/v1/shelves/shelf-1/subjects`;
const SUITES = `${API}/v1/shelves/shelf-1/test-suites`;
const CARDS = `${SUBJECTS}/subject-1/cards`;

/** A page of a list the server cuts into pages. */
const serverPage = <T>(entities: T[], current: number, pages: number) =>
    envelope({
        entities,
        currentPage: current,
        totalItems: pages * 10,
        totalPages: pages,
        hasNextPage: current < pages,
    });

test.describe('Paging', () => {
    test('shelves: ten per page, the next page is fetched on demand', async ({
        page,
        mock,
    }) => {
        const second = {
            ...shelf,
            id: 'shelf-2',
            name: 'Chemistry',
            slug: 'chem',
        };
        await mock.override({
            method: 'GET',
            path: SHELVES,
            query: { page: '1', size: '10' },
            body: serverPage([shelf], 1, 2),
        });
        await mock.override({
            method: 'GET',
            path: SHELVES,
            query: { page: '2', size: '10' },
            body: serverPage([second], 2, 2),
        });
        await page.goto('/home');
        await expect(page.getByTestId('shelves-pagination-status')).toHaveText(
            'Page 1 of 2'
        );
        await expect(page.getByTestId('shelf-card-shelf-1')).toBeVisible();

        await page.getByTestId('shelves-pagination-next').click();
        await expect(page.getByTestId('shelf-card-shelf-2')).toBeVisible();
        await expect(page.getByTestId('shelf-card-shelf-1')).toHaveCount(0);
        await expect(
            page.getByTestId('shelves-pagination-next')
        ).toBeDisabled();

        await page.getByTestId('shelves-pagination-prev').click();
        await expect(page.getByTestId('shelf-card-shelf-1')).toBeVisible();
    });

    test('subjects: ten per page without reloading the shelf', async ({
        page,
        mock,
    }) => {
        const other = {
            ...subject,
            id: 'subject-2',
            name: 'Genetics',
            slug: 'gen',
        };
        await mock.override({
            method: 'GET',
            path: SUBJECTS,
            query: { page: '1', size: '10' },
            body: serverPage([subject], 1, 2),
        });
        await mock.override({
            method: 'GET',
            path: SUBJECTS,
            query: { page: '2', size: '10' },
            body: serverPage([other], 2, 2),
        });
        await page.goto('/home/biology');
        await expect(page.getByTestId('subject-card-subject-1')).toBeVisible();

        await page.getByTestId('subjects-pagination-next').click();
        await expect(page.getByTestId('subject-card-subject-2')).toBeVisible();
        await expect(page.getByTestId('subject-card-subject-1')).toHaveCount(0);
        // the shelf itself stayed on screen
        await expect(page.getByTestId('shelf-page')).toBeVisible();
    });

    test('test suites: ten per page, fetched from the server', async ({
        page,
        mock,
    }) => {
        const quiz = (n: number) => ({
            ...testSuite,
            id: `suite-${n}`,
            slug: `quiz-${n}`,
            title: `Quiz ${n}`,
        });
        await mock.override({
            method: 'GET',
            path: SUITES,
            query: { page: '1', size: '10' },
            body: serverPage([quiz(1)], 1, 2),
        });
        await mock.override({
            method: 'GET',
            path: SUITES,
            query: { page: '2', size: '10' },
            body: serverPage([quiz(11)], 2, 2),
        });
        await page.goto('/home/biology');
        await expect(page.getByTestId('test-suite-card-suite-1')).toBeVisible();
        await expect(
            page.getByTestId('test-suites-pagination-status')
        ).toHaveText('Page 1 of 2');

        await page.getByTestId('test-suites-pagination-next').click();
        await expect(
            page.getByTestId('test-suite-card-suite-11')
        ).toBeVisible();
        await expect(page.getByTestId('test-suite-card-suite-1')).toHaveCount(
            0
        );
        await expect(page.getByTestId('shelf-page')).toBeVisible();
    });

    test('cards: twenty per page', async ({ page, mock }) => {
        const many = Array.from({ length: 25 }, (_, i) => cardRes(i + 1));
        await mock.override({
            method: 'GET',
            path: CARDS,
            body: serverPage(many, 1, 1),
        });
        await page.goto('/home/biology/subjects/cell-biology');
        await expect(page.getByTestId('card-row-card-1')).toBeVisible();
        await expect(page.getByTestId(/^card-row-/)).toHaveCount(20);

        await page.getByTestId('cards-pagination-next').click();
        await expect(page.getByTestId(/^card-row-/)).toHaveCount(5);
        await expect(page.getByTestId('card-row-card-25')).toBeVisible();
    });

    test('questions: twenty per page', async ({ page, mock }) => {
        const many = Array.from({ length: 25 }, (_, i) => ({
            ...questions[0],
            id: `q-${i + 1}`,
            text: `Question number ${i + 1}`,
        }));
        await mock.override({
            method: 'GET',
            path: `${SUITES}/suite-1/questions`,
            body: envelope(many),
        });
        await page.goto('/home/biology/tests/midterm-quiz');
        await expect(
            page.getByText('Question number 1', { exact: true })
        ).toBeVisible();
        await expect(
            page.getByTestId('question-list').locator('> li')
        ).toHaveCount(20);

        await page.getByTestId('questions-pagination-next').click();
        await expect(
            page.getByTestId('question-list').locator('> li')
        ).toHaveCount(5);
    });
});
