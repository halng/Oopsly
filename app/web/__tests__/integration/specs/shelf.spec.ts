import { expect, test } from '../support/fixtures';
import { API, subject, testSuite } from '../support/data';
import { envelope, page as paged } from '../support/wiremock';

test.describe('Shelf screen', () => {
    test('shows the shelf, its subjects and test suites', async ({ page }) => {
        await page.goto('/home/biology');
        await expect(page.getByTestId('shelf-page')).toBeVisible();
        await expect(
            page.getByTestId(`subject-card-${subject.id}`)
        ).toContainText('Cell Biology');
        await expect(page.getByText('Midterm Quiz')).toBeVisible();
        await expect(page.getByText('2 Cards Due in Biology')).toBeVisible();
    });

    test('quick review jumps to the first subject with due cards', async ({
        page,
    }) => {
        await page.goto('/home/biology');
        await page.getByTestId('btn-quick-shelf-review').click();
        await expect(page).toHaveURL(
            /\/home\/biology\/subjects\/cell-biology\/review$/
        );
    });

    test('subject card actions open details, learn and match', async ({
        page,
    }) => {
        await page.goto('/home/biology');
        await page.getByTestId(`btn-learn-${subject.id}`).click();
        await expect(page).toHaveURL(/\/subjects\/cell-biology\/learn$/);

        await page.goto('/home/biology');
        await page.getByTestId(`btn-match-${subject.id}`).click();
        await expect(page).toHaveURL(/\/subjects\/cell-biology\/match$/);

        await page.goto('/home/biology');
        await page
            .getByTestId(`subject-card-${subject.id}`)
            .getByText('Cell Biology')
            .click();
        await expect(page).toHaveURL(/\/subjects\/cell-biology$/);
    });

    test('creates a subject under the shelf', async ({ page, mock }) => {
        await page.goto('/home/biology');
        await page.getByTestId('btn-create-subject-in-shelf').click();
        await page.getByTestId('subject-title-input').fill('Genetics 101');
        await page.getByPlaceholder(/Brief summary/).fill('Heredity basics');
        await page.getByTestId('btn-save-subject').click();

        await expect
            .poll(
                async () =>
                    (
                        await mock.requests(
                            'POST',
                            `${API}/v1/shelves/shelf-1/subjects`
                        )
                    ).length
            )
            .toBe(1);
        const [created] = await mock.requests(
            'POST',
            `${API}/v1/shelves/shelf-1/subjects`
        );
        expect(created.json).toMatchObject({
            name: 'Genetics 101',
            slug: 'genetics-101',
        });
    });

    test('deleting a subject calls the API and reloads the list', async ({
        page,
        mock,
    }) => {
        await page.goto('/home/biology');
        await page.getByTestId(`btn-subject-menu-${subject.id}`).click();
        await page.getByTestId(`btn-delete-subject-${subject.id}`).click();

        await expect
            .poll(
                async () =>
                    (
                        await mock.requests(
                            'PATCH',
                            `${API}/api/subjects/subject-1/delete`
                        )
                    ).length
            )
            .toBe(1);
    });

    test('opens a test suite from the list', async ({ page }) => {
        await page.goto('/home/biology');
        await page.getByText(testSuite.title).click();
        await expect(page).toHaveURL(/\/home\/biology\/tests\/midterm-quiz/);
    });

    test('searching hides subjects that do not match', async ({ page }) => {
        await page.goto('/home/biology');
        await page.getByTestId('search-subjects-input').fill('zzz');
        await expect(
            page.getByTestId(`subject-card-${subject.id}`)
        ).toHaveCount(0);
    });

    test('shows the empty state for a shelf with no subjects', async ({
        page,
        mock,
    }) => {
        await mock.override({
            method: 'GET',
            path: `${API}/v1/shelves/shelf-1/subjects`,
            body: envelope(paged([])),
        });
        await page.goto('/home/biology');
        await expect(page.getByTestId('shelf-subjects-empty')).toBeVisible();
    });

    test('an unknown shelf slug sends the user back home', async ({ page }) => {
        await page.goto('/home/does-not-exist');
        await expect(page).toHaveURL(/\/home$/);
    });
});
