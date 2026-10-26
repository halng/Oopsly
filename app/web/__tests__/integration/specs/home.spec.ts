import { expect, test } from '../support/fixtures';
import { API, AUTH, shelf } from '../support/data';
import { envelope, failure, page as paged } from '../support/wiremock';

test.describe('Home screen (library shelves)', () => {
    test('lists shelves from the API and shows what is due', async ({
        page,
        mock,
    }) => {
        await page.goto('/home');

        await expect(
            page.getByRole('heading', { name: 'My Library Shelves' })
        ).toBeVisible();
        await expect(page.getByTestId(`shelf-card-${shelf.id}`)).toContainText(
            'Biology'
        );
        await expect(
            page.getByText('12 Total Cards Due for Daily FSRS Review')
        ).toBeVisible();

        const [shelves] = await mock.requests('GET', `${API}/v1/shelves`);
        expect(shelves.url).toContain('page=1&size=50');
        expect(shelves.headers.Authorization).toBe('Bearer access-jwt');
        expect(shelves.headers['X-Platform']).toBe('WEB');
        expect(await mock.unmatched()).toEqual([]);
    });

    test('practise now opens the super review', async ({ page }) => {
        await page.goto('/home');
        await page.getByTestId('btn-practise-now').click();
        await expect(page).toHaveURL(/\/home\/super-review$/);
    });

    test('opening a shelf navigates to its slug', async ({ page }) => {
        await page.goto('/home');
        await page.getByTestId(`shelf-card-${shelf.id}`).click();
        await expect(page).toHaveURL(/\/home\/biology$/);
    });

    test('filters shelves by the search box', async ({ page }) => {
        await page.goto('/home');
        await page.getByTestId('search-shelves-input').fill('chemistry');
        await expect(page.getByTestId(`shelf-card-${shelf.id}`)).toHaveCount(0);
        await page.getByTestId('search-shelves-input').fill('bio');
        await expect(page.getByTestId(`shelf-card-${shelf.id}`)).toBeVisible();
    });

    test('creates a shelf and sends the slugged payload', async ({
        page,
        mock,
    }) => {
        await page.goto('/home');
        await page.getByTestId('btn-create-shelf').click();
        await page.getByPlaceholder(/Computer Science/).fill('World History');
        await page
            .getByPlaceholder(/Optional overview/)
            .fill('Ancient to modern');
        const alerts: string[] = [];
        page.on('dialog', (dialog) => {
            alerts.push(dialog.message());
            void dialog.dismiss();
        });
        await page.getByRole('button', { name: 'Save Shelf' }).click();

        await expect
            .poll(
                async () =>
                    (await mock.requests('POST', `${API}/v1/shelves`)).length
            )
            .toBe(1);
        const [created] = await mock.requests('POST', `${API}/v1/shelves`);
        expect(created.json).toMatchObject({
            name: 'World History',
            slug: 'world-history',
            description: 'Ancient to modern',
        });
        await expect.poll(() => alerts).toContain('Shelf created successfully');
    });

    test('editing the daily goal saves it through the settings API', async ({
        page,
        mock,
    }) => {
        await page.goto('/home');
        await page.getByTitle('Edit Daily Goal').click();
        await page.getByRole('spinbutton').fill('35');
        await page.getByRole('button', { name: 'Save', exact: true }).click();

        await expect
            .poll(
                async () =>
                    (await mock.requests('PATCH', `${AUTH}/v1/user-settings`))
                        .length
            )
            .toBe(1);
        const [saved] = await mock.requests(
            'PATCH',
            `${AUTH}/v1/user-settings`
        );
        expect(saved.json).toEqual({ dailyGoal: 35 });
    });

    test('shows the empty state when the user has no shelves', async ({
        page,
        mock,
    }) => {
        await mock.override({
            method: 'GET',
            path: `${API}/v1/shelves`,
            body: envelope(paged([])),
        });
        await page.goto('/home');
        await expect(page.getByText('Create New Shelf')).toBeVisible();
        await expect(page.getByTestId(`shelf-card-${shelf.id}`)).toHaveCount(0);
    });

    test('survives a failing shelves endpoint without crashing', async ({
        page,
        mock,
    }) => {
        await mock.override({
            method: 'GET',
            path: `${API}/v1/shelves`,
            status: 500,
            body: failure('Internal error', 500),
        });
        await page.goto('/home');
        await expect(
            page.getByRole('heading', { name: 'My Library Shelves' })
        ).toBeVisible();
        await expect(page.getByTestId(`shelf-card-${shelf.id}`)).toHaveCount(0);
    });
});
