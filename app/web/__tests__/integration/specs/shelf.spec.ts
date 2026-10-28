import { expect, test } from '../support/fixtures';
import { API, subject, testSuite } from '../support/data';
import { envelope, failure, page as paged } from '../support/wiremock';

const SUITES = `${API}/v1/shelves/shelf-1/test-suites`;

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

    test('edits the shelf with the current values prefilled', async ({
        page,
        mock,
    }) => {
        await page.goto('/home/biology');
        await page.getByTestId('btn-edit-active-shelf').click();
        const name = page.getByPlaceholder(/Computer Science/);
        await expect(name).toHaveValue('Biology');
        await name.fill('Life Sciences');
        await page.getByRole('button', { name: 'Save Shelf' }).click();

        await expect
            .poll(
                async () =>
                    (await mock.requests('PATCH', `${API}/v1/shelves/shelf-1`))
                        .length
            )
            .toBe(1);
        const [patch] = await mock.requests(
            'PATCH',
            `${API}/v1/shelves/shelf-1`
        );
        expect(patch.json).toMatchObject({
            name: 'Life Sciences',
            description: 'Cells and genetics',
        });
    });

    test('edits a subject from its menu', async ({ page, mock }) => {
        await page.goto('/home/biology');
        await page.getByTestId(`btn-subject-menu-${subject.id}`).click();
        await page.getByTestId(`btn-edit-subject-${subject.id}`).click();
        await page.getByTestId('subject-title-input').fill('Cell Biology II');
        await page.getByTestId('btn-save-subject').click();

        await expect
            .poll(
                async () =>
                    (
                        await mock.requests(
                            'PATCH',
                            `${API}/api/subjects/subject-1`
                        )
                    ).length
            )
            .toBe(1);
        const [patch] = await mock.requests(
            'PATCH',
            `${API}/api/subjects/subject-1`
        );
        expect(patch.json).toMatchObject({ name: 'Cell Biology II' });
    });

    test('import and clone close the subject menu', async ({ page }) => {
        await page.goto('/home/biology');
        for (const action of ['import', 'clone']) {
            await page.getByTestId(`btn-subject-menu-${subject.id}`).click();
            await page.getByTestId(`btn-${action}-${subject.id}`).click();
            await expect(
                page.getByTestId(`subject-menu-${subject.id}`)
            ).toHaveCount(0);
        }
    });

    test('creates a test suite with a time limit', async ({ page, mock }) => {
        await page.goto('/home/biology');
        await page.getByTestId('btn-create-test-suite').click();
        await page.getByTestId('test-suite-title-input').fill('Final exam');
        await page
            .getByTestId('test-suite-description-input')
            .fill('Everything');
        await page.getByTestId('test-suite-time-limit-input').fill('45');
        await page.getByTestId('btn-save-test-suite').click();

        await expect
            .poll(async () => (await mock.requests('POST', SUITES)).length)
            .toBe(1);
        const [created] = await mock.requests('POST', SUITES);
        expect(created.json).toMatchObject({
            title: 'Final exam',
            description: 'Everything',
            timeLimitMinutes: 45,
            isActive: true,
        });
        await expect(page.getByTestId('test-suite-modal')).toHaveCount(0);
    });

    test('shows the server message when saving a test suite fails', async ({
        page,
        mock,
    }) => {
        await mock.override({
            method: 'POST',
            path: SUITES,
            status: 400,
            body: failure('Title already used'),
        });
        await page.goto('/home/biology');
        await page.getByTestId('btn-create-test-suite').click();
        await page.getByTestId('test-suite-title-input').fill('Midterm Quiz');
        await page.getByTestId('btn-save-test-suite').click();
        await expect(page.getByTestId('test-suite-modal-error')).toHaveText(
            'Title already used'
        );
        await expect(page.getByTestId('test-suite-modal')).toBeVisible();
    });

    test('edits a test suite with PUT', async ({ page, mock }) => {
        await page.goto('/home/biology');
        await page.getByTestId('btn-edit-test-suite-suite-1').click();
        await expect(page.getByTestId('test-suite-title-input')).toHaveValue(
            'Midterm Quiz'
        );
        await page
            .getByTestId('test-suite-title-input')
            .fill('Midterm Quiz v2');
        await page.getByTestId('btn-save-test-suite').click();

        await expect
            .poll(
                async () =>
                    (await mock.requests('PUT', `${SUITES}/suite-1`)).length
            )
            .toBe(1);
        const [put] = await mock.requests('PUT', `${SUITES}/suite-1`);
        expect(put.json).toMatchObject({
            title: 'Midterm Quiz v2',
            timeLimitMinutes: 10,
        });
    });

    test('deleting a test suite asks first, then reloads the list', async ({
        page,
        mock,
    }) => {
        await page.goto('/home/biology');
        page.once('dialog', (dialog) => void dialog.dismiss());
        await page.getByTestId('btn-delete-test-suite-suite-1').click();
        expect(await mock.requests('PATCH', `${SUITES}/suite-1`)).toHaveLength(
            0
        );

        page.once('dialog', (dialog) => {
            expect(dialog.message()).toBe(
                'Delete "Midterm Quiz" and all of its questions?'
            );
            void dialog.accept();
        });
        await page.getByTestId('btn-delete-test-suite-suite-1').click();
        await expect
            .poll(
                async () =>
                    (await mock.requests('PATCH', `${SUITES}/suite-1`)).length
            )
            .toBe(1);
    });

    test('the Quizzly button opens the host dialog for that suite and it can be closed', async ({
        page,
    }) => {
        await page.goto('/home/biology');
        await page.getByTestId('btn-host-test-suite-suite-1').click();
        await expect(page.getByTestId('host-game-modal')).toBeVisible();
        await page.getByTestId('btn-host-game-close').click();
        await expect(page.getByTestId('host-game-modal')).toHaveCount(0);
    });

    test('take opens the attempt, and an empty list offers to create a suite', async ({
        page,
        mock,
    }) => {
        await page.goto('/home/biology');
        await page.getByTestId('btn-take-test-suite-suite-1').click();
        await expect(page).toHaveURL(/\/tests\/midterm-quiz\/take$/);

        await mock.override({
            method: 'GET',
            path: SUITES,
            body: envelope([]),
        });
        await page.goto('/home/biology');
        await expect(page.getByTestId('shelf-test-suites-empty')).toBeVisible();
    });
});
