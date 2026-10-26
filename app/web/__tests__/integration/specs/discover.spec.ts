import { expect, test } from '../support/fixtures';
import { API } from '../support/data';
import { envelope } from '../support/wiremock';

test.describe('Discover screen', () => {
    test('lists public decks from the catalog', async ({ page }) => {
        await page.goto('/discover');
        await expect(page.getByTestId('discover-page')).toBeVisible();
        await expect(page.getByTestId('discover-card-pub-1')).toContainText(
            'Everyday greetings and numbers'
        );
        await expect(page.getByTestId('discover-card-pub-2')).toContainText(
            'Functional groups'
        );
    });

    test('search narrows the catalog by description', async ({ page }) => {
        await page.goto('/discover');
        await page.getByTestId('input-discover-search').fill('greetings');
        await expect(page.getByTestId('discover-card-pub-1')).toBeVisible();
        await expect(page.getByTestId('discover-card-pub-2')).toHaveCount(0);
    });

    test('search also matches tags', async ({ page }) => {
        await page.goto('/discover');
        await page.getByTestId('input-discover-search').fill('chemistry');
        await expect(page.getByTestId('discover-card-pub-2')).toBeVisible();
        await expect(page.getByTestId('discover-card-pub-1')).toHaveCount(0);
    });

    test('a tag chip filters, and All clears it', async ({ page }) => {
        await page.goto('/discover');
        await page.getByRole('button', { name: 'spanish' }).click();
        await expect(page.getByTestId('discover-card-pub-2')).toHaveCount(0);
        await page.getByTestId('btn-tag-all').click();
        await expect(page.getByTestId('discover-card-pub-2')).toBeVisible();
    });

    test('shows the empty state when the catalog is empty', async ({
        page,
        mock,
    }) => {
        await mock.override({
            method: 'GET',
            path: `${API}/api/discover`,
            body: envelope([]),
        });
        await page.goto('/discover');
        await expect(page.getByTestId('discover-empty')).toBeVisible();
    });

    test('clone opens the shelf picker with the user shelves', async ({
        page,
    }) => {
        // Known bug: the page never stores the shelves it fetches (the
        // setShelves call is commented out), so the picker has nothing to offer.
        test.fail();
        await page.goto('/discover');
        await page.getByTestId('btn-clone-pub-1').click();
        await expect(page.getByTestId('clone-subject-modal')).toBeVisible();
        await expect(page.getByTestId('clone-shelf-shelf-1')).toBeVisible();
    });
});
