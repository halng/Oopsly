import { expect, test } from '../support/fixtures';

test.describe('Landing screen', () => {
    test.use({ signedIn: false });

    test('shows the pitch and sends visitors to login', async ({ page }) => {
        await page.goto('/');
        await expect(page.getByTestId('brand-logo')).toHaveText('Oopsly');
        await expect(
            page.getByRole('heading', { name: /Master any subject with/ })
        ).toBeVisible();

        await page.getByTestId('start-learning-button').click();
        await expect(page).toHaveURL(/\/login$/);
    });

    test('the header call to action also opens login', async ({ page }) => {
        await page.goto('/');
        await page.getByTestId('get-started-button').click();
        await expect(page).toHaveURL(/\/login$/);
    });
});
